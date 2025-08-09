#!/usr/bin/env python3

import os
import time
import json
import traceback
import asyncio
from typing import List, Optional, Any, Dict
from pathlib import Path
import uuid
from datetime import datetime

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import our Python services
from server.python_storage import storage, FileAnalysisCreate, AnalysisSessionCreate
from server.python_services.file_processor import file_processor
from server.python_services.aws_service import aws_service

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = str(request.url.path)

    response = await call_next(request)

    process_time = time.time() - start_time

    if path.startswith("/api"):
        # Try to capture JSON response for logging (similar to Express version)
        log_line = f"{request.method} {path} {response.status_code} in {process_time*1000:.0f}ms"

        if len(log_line) > 80:
            log_line = log_line[:79] + "…"

        print(log_line)

    return response

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    status_code = getattr(exc, 'status_code', 500)
    message = str(exc) if str(exc) else "Internal Server Error"

    print(f"Error: {message}")
    traceback.print_exc()

    return JSONResponse(
        status_code=status_code,
        content={"message": message}
    )

# File upload endpoint
@app.post("/api/upload")
async def upload_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    uploadType: str = Form(...)
):
    try:
        if not files or len(files) == 0:
            raise HTTPException(status_code=400, detail="No files uploaded")

        print(f"Upload request - Type: {uploadType}, Files received:", 
              [{"name": f.filename, "size": f.size, "type": f.content_type} for f in files])

        # Validate file types
        valid_extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go']
        invalid_files = []

        for file in files:
            if file.filename and not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
                invalid_files.append(file.filename)

        if invalid_files:
            print('Invalid files found:', invalid_files)
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file types found: {', '.join(invalid_files)}. Only code files (.js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .go) are allowed."
            )

        # Create analysis session
        session = await storage.create_analysis_session(AnalysisSessionCreate(
            status='pending',
            totalFiles=len(files),
            processedFiles=0
        ))

        # Create file analysis records and upload to S3
        for file in files:
            # Read file content
            content = await file.read()
            await file.seek(0)  # Reset file pointer for potential future reads

            if file.filename:
                # Upload file to S3
                s3_key = await aws_service.upload_file_to_s3(content, file.filename, session.id)
                await storage.create_file_analysis(FileAnalysisCreate(
                    sessionId=session.id,
                    fileName=file.filename,
                    fileSize=len(content),
                    fileType=file.content_type or 'application/octet-stream',
                    s3Key=s3_key,
                    status='uploaded'
                ))

        # Update session status
        await storage.update_analysis_session(session.id, {'status': 'processing'})

        # Trigger processing asynchronously
        background_tasks.add_task(file_processor.process_session, session.id)

        return {
            "sessionId": session.id,
            "message": "Files uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Upload error:", error)
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Upload failed", 
                "error": str(error)
            }
        )

# Get analysis status
@app.get("/api/analysis/status/{session_id}")
async def get_analysis_status(session_id: str):
    try:
        session = await storage.get_analysis_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        files = await storage.get_file_analysis_by_session(session_id)

        # Calculate processing steps
        upload_completed = all(f.status != 'uploading' for f in files)
        lambda_completed = all(f.status in ['processing', 'completed'] for f in files)
        ecs_completed = all(f.status in ['analyzing', 'completed'] for f in files)
        bedrock_completed = session.status == 'completed'

        total_size = sum(file.fileSize for file in files)

        return {
            "status": session.status,
            "totalFiles": session.totalFiles,
            "processedFiles": session.processedFiles,
            "totalSize": total_size,
            "uploadCompleted": upload_completed,
            "lambdaCompleted": lambda_completed,
            "ecsCompleted": ecs_completed,
            "bedrockCompleted": bedrock_completed,
            "uploadTime": 1.2 if upload_completed else None
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Status check error:", error)
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Failed to get status", 
                "error": str(error)
            }
        )

# Get analysis results
@app.get("/api/analysis/results/{session_id}")
async def get_analysis_results(session_id: str):
    try:
        session = await storage.get_analysis_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        if session.status != 'completed':
            raise HTTPException(status_code=400, detail="Analysis not completed yet")

        files = await storage.get_file_analysis_by_session(session_id)

        # Aggregate results from all files
        passed_checks = 0
        warnings = 0
        errors = 0
        all_issues = []

        for file in files:
            if file.analysisResult:
                result = file.analysisResult
                passed_checks += result.get('passedChecks', 0)
                warnings += result.get('warnings', 0)
                errors += result.get('errors', 0)
                issues = result.get('issues')
                if issues is not None:
                    all_issues.extend(issues)

        return {
            "passedChecks": passed_checks,
            "warnings": warnings,
            "errors": errors,
            "issues": all_issues
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Results fetch error:", error)
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Failed to get results", 
                "error": str(error)
            }
        )

# Webhook for AWS Lambda to trigger processing
@app.post("/api/webhook/process")
async def webhook_process(request: Request):
    try:
        body = await request.json()
        session_id = body.get('sessionId')
        s3_key = body.get('s3Key')

        if not session_id or not s3_key:
            raise HTTPException(status_code=400, detail="Missing sessionId or s3Key")

        # This would be called by Lambda function after S3 upload
        # Update file status (webhook functionality for Lambda integration)
        file = await storage.get_file_analysis_by_s3_key(s3_key)
        if file:
            await storage.update_file_analysis(file.id, {'status': 'processing'})

        return {"message": "Processing triggered"}

    except HTTPException:
        raise
    except Exception as error:
        print("Webhook error:", error)
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Webhook failed", 
                "error": str(error)
            }
        )

# Re-analyze session endpoint
@app.post("/api/analysis/reanalyze/{session_id}")
async def reanalyze_session(session_id: str, background_tasks: BackgroundTasks):
    try:
        session = await storage.get_analysis_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Reset session status and clear results
        await storage.update_analysis_session(session_id, {
            'status': 'processing',
            'processedFiles': 0,
            'completedAt': None
        })

        # Reset all file analysis status and clear results
        files = await storage.get_file_analysis_by_session(session_id)
        for file in files:
            await storage.update_file_analysis(file.id, {
                'status': 'uploaded',
                'analysisResult': None,
                'completedAt': None
            })

        # Trigger processing asynchronously
        background_tasks.add_task(file_processor.process_session, session_id)

        return {
            "sessionId": session_id,
            "message": "Re-analysis started successfully"
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Re-analyze error:", error)
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Failed to start re-analysis", 
                "error": str(error)
            }
        )

# Share session results endpoint
@app.post("/api/analysis/share/{session_id}")
async def share_session(session_id: str, request: Request):
    try:
        session = await storage.get_analysis_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        if session.status != 'completed':
            raise HTTPException(status_code=400, detail="Analysis not completed yet")

        # Generate a shareable link/ID (in a real app, you'd save this to a sharing table)
        share_id = f"share-{session_id}-{uuid.uuid4().hex[:8]}"
        
        # In a real implementation, you would store this share mapping in a database
        # For now, we'll return the share information
        
        return {
            "shareId": share_id,
            "shareUrl": f"{request.url.scheme}://{request.url.netloc}/shared/{share_id}",
            "message": "Results shared successfully"
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Share error:", error)
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Failed to share results", 
                "error": str(error)
            }
        )

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Mount static files directory
app.mount("/assets", StaticFiles(directory="dist/public/assets"), name="assets")

# Serve static files and handle client-side routing
@app.get("/")
@app.head("/")
async def serve_index():
    """Serve the main React application"""
    return FileResponse("dist/public/index.html")

@app.get("/{path:path}")
async def serve_static_files(path: str):
    """Serve static assets and handle client-side routing"""
    # Skip API routes
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    static_path = Path(f"dist/public/{path}")

    # If it's a static file that exists, serve it
    if static_path.exists() and static_path.is_file():
        return FileResponse(static_path)

    # Otherwise, serve the React app (for client-side routing)
    return FileResponse("dist/public/index.html")

# For direct execution
if __name__ == "__main__":
    import uvicorn

    # Get port from environment variable, default to 5000
    port = int(os.environ.get('PORT', 5000))
    is_dev = os.environ.get('NODE_ENV') == 'development'

    print("CodeReview AI Server starting...")
    print("Features:")
    print("- Intelligent file processing")
    print("- AI-powered code analysis")
    print("- Real-time status updates")
    print("- Comprehensive code review")


    # Run with uvicorn - use import string for reload mode
    if is_dev:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=True
        )
    else:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            reload=False
        )