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
            
            # For development, simulate file analysis instead of using AWS
            mock_analysis_result = self._generate_mock_analysis([f.fileName for f in files])
            
            # Distribute analysis results across files
            issues_per_file = self._distribute_issues_across_files(
                mock_analysis_result, 
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
        # Update file status to processing
        await storage.update_file_analysis(file_id, {'status': 'processing'})
        
        # Simulate some processing time
        await asyncio.sleep(1)
        
        # Update to analyzing status
        await storage.update_file_analysis(file_id, {'status': 'analyzing'})
    
    def _generate_mock_analysis(self, file_names: List[str]) -> Dict[str, Any]:
        """Generate mock analysis result"""
        issues = [
            {
                "type": "warning",
                "severity": "medium",
                "title": "Missing error handling",
                "description": "Function does not handle potential errors from async operations",
                "file": file_names[0],
                "line": 15,
                "code": "const result = await apiCall();",
                "suggestion": "try { const result = await apiCall(); } catch (error) { console.error(error); }"
            },
            {
                "type": "suggestion",
                "severity": "low",
                "title": "Consider using const instead of let",
                "description": "Variable is never reassigned, consider using const for better immutability",
                "file": file_names[0],
                "line": 8,
                "code": "let userName = 'default';",
                "suggestion": "const userName = 'default';"
            },
            {
                "type": "success",
                "severity": "low",
                "title": "Good use of TypeScript interfaces",
                "description": "Proper type definitions improve code maintainability",
                "file": file_names[0]
            }
        ]
        
        if len(file_names) > 1:
            issues.append({
                "type": "error",
                "severity": "high",
                "title": "Unused import statement",
                "description": "Import is declared but never used in the module",
                "file": file_names[1],
                "line": 3,
                "code": "import { unusedFunction } from './utils';",
                "suggestion": "Remove the unused import or use the function"
            })
        
        return {
            "passedChecks": 8,
            "warnings": 2,
            "errors": 1 if len(file_names) > 1 else 0,
            "issues": issues
        }
    
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