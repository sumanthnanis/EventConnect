"""
Python storage implementation that replicates the TypeScript storage interface
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

# Pydantic models for data structures (equivalent to TypeScript interfaces)
class FileAnalysis(BaseModel):
    id: str
    sessionId: str
    fileName: str
    fileSize: int
    fileType: str
    s3Key: str
    status: str = "uploading"  # uploading, processing, completed, error
    analysisResult: Optional[Dict[str, Any]] = None
    createdAt: datetime
    completedAt: Optional[datetime] = None

class AnalysisSession(BaseModel):
    id: str
    status: str = "pending"  # pending, processing, completed, error
    totalFiles: int = 0
    processedFiles: int = 0
    createdAt: datetime
    completedAt: Optional[datetime] = None

class FileAnalysisCreate(BaseModel):
    sessionId: str
    fileName: str
    fileSize: int
    fileType: str
    s3Key: str
    status: str = "uploading"

class AnalysisSessionCreate(BaseModel):
    status: str = "pending"
    totalFiles: int = 0
    processedFiles: int = 0

class IStorage:
    """Storage interface that matches the TypeScript IStorage interface"""
    
    async def create_analysis_session(self, session: AnalysisSessionCreate) -> AnalysisSession:
        raise NotImplementedError
    
    async def get_analysis_session(self, id: str) -> Optional[AnalysisSession]:
        raise NotImplementedError
    
    async def update_analysis_session(self, id: str, updates: Dict[str, Any]) -> Optional[AnalysisSession]:
        raise NotImplementedError
    
    async def create_file_analysis(self, file: FileAnalysisCreate) -> FileAnalysis:
        raise NotImplementedError
    
    async def get_file_analysis(self, id: str) -> Optional[FileAnalysis]:
        raise NotImplementedError
    
    async def get_file_analysis_by_session(self, session_id: str) -> List[FileAnalysis]:
        raise NotImplementedError
    
    async def get_file_analysis_by_s3_key(self, s3_key: str) -> Optional[FileAnalysis]:
        raise NotImplementedError
    
    async def update_file_analysis(self, id: str, updates: Dict[str, Any]) -> Optional[FileAnalysis]:
        raise NotImplementedError
    
    async def update_file_analysis_by_s3_key(self, s3_key: str, updates: Dict[str, Any]) -> Optional[FileAnalysis]:
        raise NotImplementedError

class MemStorage(IStorage):
    """In-memory storage implementation that replicates the TypeScript MemStorage"""
    
    def __init__(self):
        self.analysis_sessions: Dict[str, AnalysisSession] = {}
        self.file_analyses: Dict[str, FileAnalysis] = {}
    
    async def create_analysis_session(self, session: AnalysisSessionCreate) -> AnalysisSession:
        session_id = str(uuid.uuid4())
        new_session = AnalysisSession(
            id=session_id,
            status=session.status or 'pending',
            totalFiles=session.totalFiles or 0,
            processedFiles=session.processedFiles or 0,
            createdAt=datetime.utcnow(),
            completedAt=None
        )
        self.analysis_sessions[session_id] = new_session
        return new_session
    
    async def get_analysis_session(self, id: str) -> Optional[AnalysisSession]:
        return self.analysis_sessions.get(id)
    
    async def update_analysis_session(self, id: str, updates: Dict[str, Any]) -> Optional[AnalysisSession]:
        session = self.analysis_sessions.get(id)
        if not session:
            return None
        
        # Create updated session data
        session_data = session.model_dump()
        session_data.update(updates)
        
        # Set completedAt if status is completed
        if updates.get('status') == 'completed' and not session.completedAt:
            session_data['completedAt'] = datetime.utcnow()
        
        updated_session = AnalysisSession(**session_data)
        self.analysis_sessions[id] = updated_session
        return updated_session
    
    async def create_file_analysis(self, file: FileAnalysisCreate) -> FileAnalysis:
        file_id = str(uuid.uuid4())
        file_analysis = FileAnalysis(
            id=file_id,
            sessionId=file.sessionId,
            fileName=file.fileName,
            fileSize=file.fileSize,
            fileType=file.fileType,
            s3Key=file.s3Key,
            status=file.status or 'uploading',
            analysisResult=None,
            createdAt=datetime.utcnow(),
            completedAt=None
        )
        self.file_analyses[file_id] = file_analysis
        return file_analysis
    
    async def get_file_analysis(self, id: str) -> Optional[FileAnalysis]:
        return self.file_analyses.get(id)
    
    async def get_file_analysis_by_session(self, session_id: str) -> List[FileAnalysis]:
        return [
            file_analysis for file_analysis in self.file_analyses.values()
            if file_analysis.sessionId == session_id
        ]
    
    async def get_file_analysis_by_s3_key(self, s3_key: str) -> Optional[FileAnalysis]:
        for file_analysis in self.file_analyses.values():
            if file_analysis.s3Key == s3_key:
                return file_analysis
        return None
    
    async def update_file_analysis(self, id: str, updates: Dict[str, Any]) -> Optional[FileAnalysis]:
        file_analysis = self.file_analyses.get(id)
        if not file_analysis:
            return None
        
        # Create updated file analysis data
        file_data = file_analysis.model_dump()
        file_data.update(updates)
        
        # Set completedAt if status is completed
        if updates.get('status') == 'completed' and not file_analysis.completedAt:
            file_data['completedAt'] = datetime.utcnow()
        
        updated_file = FileAnalysis(**file_data)
        self.file_analyses[id] = updated_file
        return updated_file
    
    async def update_file_analysis_by_s3_key(self, s3_key: str, updates: Dict[str, Any]) -> Optional[FileAnalysis]:
        file_analysis = await self.get_file_analysis_by_s3_key(s3_key)
        if not file_analysis:
            return None
        
        return await self.update_file_analysis(file_analysis.id, updates)

# Create the storage instance (equivalent to TypeScript export const storage = new MemStorage())
storage = MemStorage()