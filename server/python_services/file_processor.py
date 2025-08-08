"""
File processor implementation that replicates the TypeScript file processor
"""

import asyncio
from typing import List, Dict, Any
from ..python_storage import storage
from .aws_service import aws_service

class FileProcessor:
    """File processor class that replicates the TypeScript FileProcessor functionality"""
    
    async def process_session(self, session_id: str) -> None:
        """Process all files in a session"""
        try:
            print(f"Starting processing for session: {session_id}")
            
            # Get all files for the session
            files = await storage.get_file_analysis_by_session(session_id)
            
            if not files:
                raise Exception('No files found for session')
            
            # Update session status
            await storage.update_analysis_session(session_id, {'status': 'processing'})
            
            # Process each file
            for file in files:
                await self._process_file(file.id)
            
            # Get actual file contents from uploads
            file_contents = []
            for file in files:
                try:
                    # Get file content from S3 or local storage
                    content = await aws_service.get_file_from_s3(file.s3Key)
                    file_contents.append(content)
                except Exception as e:
                    print(f"Error reading file {file.fileName}: {e}")
                    file_contents.append("// Error: Could not read file content")
            
            # Use AWS Bedrock for real analysis
            analysis_result = await aws_service.analyze_code_with_bedrock(
                file_contents, 
                [f.fileName for f in files]
            )
            
            # Distribute analysis results across files
            issues_per_file = self._distribute_issues_across_files(
                analysis_result, 
                [f.fileName for f in files]
            )
            
            # Update each file with its portion of the analysis
            for file in files:
                file_result = issues_per_file.get(file.fileName, {
                    'passedChecks': 0,
                    'warnings': 0,
                    'errors': 0,
                    'issues': []
                })
                
                await storage.update_file_analysis(file.id, {
                    'status': 'completed',
                    'analysisResult': file_result
                })
            
            # Update session as completed
            await storage.update_analysis_session(session_id, {
                'status': 'completed',
                'processedFiles': len(files)
            })
            
            print(f"Session {session_id} processing completed successfully")
            
        except Exception as error:
            print(f"Error processing session {session_id}:", error)
            
            # Update session with error status
            await storage.update_analysis_session(session_id, {'status': 'error'})
            
            raise error
    
    async def _process_file(self, file_id: str) -> None:
        """Process a single file"""
        # File processing will be handled in the main process_session method
        # Individual file processing can be added here if needed
        
        # Update file status to processing
        await storage.update_file_analysis(file_id, {'status': 'processing'})
        
        # TODO: Here you could add individual file processing steps
        # For now, we'll process all files together in the main process_session method
        
        # Update to analyzing status
        await storage.update_file_analysis(file_id, {'status': 'analyzing'})
    
    
    def _distribute_issues_across_files(self, analysis_result: Dict[str, Any], file_names: List[str]) -> Dict[str, Dict[str, Any]]:
        """Distribute issues across files"""
        result = {}
        
        # Initialize each file with empty results
        for file_name in file_names:
            result[file_name] = {
                'passedChecks': 0,
                'warnings': 0,
                'errors': 0,
                'issues': []
            }
        
        # Distribute issues based on file names mentioned in the issues
        if analysis_result.get('issues'):
            for issue in analysis_result['issues']:
                target_file = issue.get('file', file_names[0])  # Default to first file if not specified
                
                if target_file in result:
                    result[target_file]['issues'].append(issue)
                    
                    # Update counters based on issue type
                    issue_type = issue.get('type')
                    if issue_type == 'error':
                        result[target_file]['errors'] += 1
                    elif issue_type == 'warning':
                        result[target_file]['warnings'] += 1
                    elif issue_type == 'success':
                        result[target_file]['passedChecks'] += 1
        
        # Distribute overall metrics
        total_files = len(file_names)
        passed_per_file = (analysis_result.get('passedChecks', 0)) // total_files
        
        for file_name in file_names:
            if result[file_name]['passedChecks'] == 0:
                result[file_name]['passedChecks'] = passed_per_file
        
        return result

# Create the file processor instance
file_processor = FileProcessor()