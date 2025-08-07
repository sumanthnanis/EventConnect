from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  
from fastapi.responses import FileResponse
from typing import List, Optional
import uvicorn
import os
import json
import logging
import asyncio
from datetime import datetime
import uuid
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CodeReview AI Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/codereview")

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return None

# In-memory storage for development (simulating the current storage)
class MemoryStorage:
    def __init__(self):
        self.sessions = {}
        self.files = {}
    
    def create_analysis_session(self, data):
        session_id = str(uuid.uuid4())
        session = {
            "id": session_id,
            "status": data.get("status", "pending"),
            "totalFiles": data.get("totalFiles", 0),
            "processedFiles": data.get("processedFiles", 0),
            "createdAt": datetime.now().isoformat(),
            "completedAt": None
        }
        self.sessions[session_id] = session
        return session
    
    def update_analysis_session(self, session_id, data):
        if session_id in self.sessions:
            self.sessions[session_id].update(data)
            if data.get("status") == "completed":
                self.sessions[session_id]["completedAt"] = datetime.now().isoformat()
        return self.sessions.get(session_id)
    
    def get_analysis_session(self, session_id):
        return self.sessions.get(session_id)
    
    def create_file_analysis(self, data):
        file_id = str(uuid.uuid4())
        file_record = {
            "id": file_id,
            "sessionId": data["sessionId"],
            "fileName": data["fileName"],
            "fileSize": data["fileSize"],
            "fileType": data["fileType"],
            "s3Key": data["s3Key"],
            "status": data.get("status", "uploading"),
            "analysisResult": None,
            "createdAt": datetime.now().isoformat(),
            "completedAt": None
        }
        self.files[file_id] = file_record
        return file_record
    
    def update_file_analysis(self, file_id, data):
        if file_id in self.files:
            self.files[file_id].update(data)
        return self.files.get(file_id)
    
    def get_files_by_session(self, session_id):
        return [f for f in self.files.values() if f["sessionId"] == session_id]

# Initialize storage
storage = MemoryStorage()

# File processing service
class FileProcessor:
    def __init__(self, storage):
        self.storage = storage
    
    async def process_session(self, session_id: str):
        """Process all files in a session with simulated AI analysis"""
        session = self.storage.get_analysis_session(session_id)
        if not session:
            return
        
        files = self.storage.get_files_by_session(session_id)
        
        # Simulate processing delay
        await asyncio.sleep(2)
        
        processed_files = 0
        for file_record in files:
            # Simulate individual file analysis
            await asyncio.sleep(1)
            
            # Generate simulated analysis result
            analysis_result = {
                "overall_score": 85,
                "summary": f"Analysis completed for {file_record['fileName']}",
                "issues": [
                    {
                        "type": "warning",
                        "line": 10,
                        "message": "Consider adding error handling",
                        "suggestion": "Add try-catch block"
                    }
                ],
                "recommendations": [
                    "Add more descriptive variable names",
                    "Consider adding unit tests"
                ],
                "security_concerns": [],
                "performance_notes": ["Code looks efficient"]
            }
            
            # Update file record
            self.storage.update_file_analysis(file_record["id"], {
                "status": "completed",
                "analysisResult": analysis_result,
                "completedAt": datetime.now().isoformat()
            })
            
            processed_files += 1
            
            # Update session progress
            self.storage.update_analysis_session(session_id, {
                "processedFiles": processed_files
            })
        
        # Complete session
        self.storage.update_analysis_session(session_id, {
            "status": "completed"
        })

file_processor = FileProcessor(storage)

@app.post("/api/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    uploadType: str = Form(...)
):
    """Handle file uploads"""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")
        
        logger.info(f"Upload request - Type: {uploadType}, Files received: {[f.filename for f in files]}")
        
        # Validate file types
        valid_extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go']
        invalid_files = []
        
        for file in files:
            if not file.filename or not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
                invalid_files.append(file.filename or "unknown")
        
        if invalid_files:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file types found: {', '.join(invalid_files)}. Only code files (.js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .go) are allowed."
            )
        
        # Create analysis session
        session = storage.create_analysis_session({
            "status": "pending",
            "totalFiles": len(files),
            "processedFiles": 0
        })
        
        # Create file analysis records
        for file in files:
            content = await file.read()
            s3_key = f"sessions/{session['id']}/{int(datetime.now().timestamp())}-{file.filename}"
            
            storage.create_file_analysis({
                "sessionId": session["id"],
                "fileName": file.filename,
                "fileSize": len(content),
                "fileType": file.content_type or "application/octet-stream",
                "s3Key": s3_key,
                "status": "uploading"
            })
            
            # Reset file pointer for potential future reads
            await file.seek(0)
        
        # Update session status to processing
        storage.update_analysis_session(session["id"], {"status": "processing"})
        
        # Start processing asynchronously
        asyncio.create_task(file_processor.process_session(session["id"]))
        
        return {
            "sessionId": session["id"],
            "message": "Files uploaded successfully"
        }
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/status/{session_id}")
async def get_session_status(session_id: str):
    """Get analysis session status"""
    try:
        session = storage.get_analysis_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        files = storage.get_files_by_session(session_id)
        
        return {
            "sessionId": session_id,
            "status": session["status"],
            "totalFiles": session["totalFiles"],
            "processedFiles": session["processedFiles"],
            "files": [
                {
                    "fileName": f["fileName"],
                    "status": f["status"],
                    "fileSize": f["fileSize"]
                }
                for f in files
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail="Status check failed")

@app.get("/api/results/{session_id}")
async def get_session_results(session_id: str):
    """Get analysis results for a session"""
    try:
        session = storage.get_analysis_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session["status"] != "completed":
            raise HTTPException(status_code=400, detail="Analysis not yet completed")
        
        files = storage.get_files_by_session(session_id)
        
        results = []
        for file_record in files:
            if file_record["analysisResult"]:
                results.append({
                    "fileName": file_record["fileName"],
                    "fileSize": file_record["fileSize"],
                    "analysis": file_record["analysisResult"]
                })
        
        return {
            "sessionId": session_id,
            "status": session["status"],
            "totalFiles": len(files),
            "results": results,
            "completedAt": session["completedAt"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Results fetch error: {e}")
        raise HTTPException(status_code=500, detail="Results fetch failed")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "CodeReview AI FastAPI"}

# Serve static files (the built frontend) - always serve in development
if os.path.exists("dist/public"):
    print(f"📁 Serving frontend from dist/public")
    app.mount("/", StaticFiles(directory="dist/public", html=True), name="static")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))  # FastAPI serves everything on port 5000
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=os.getenv("NODE_ENV") == "development"
    )