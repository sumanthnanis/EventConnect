"""
Cloud service implementation for file storage and AI analysis
"""

import os
import json
import time
from typing import List, Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'codereview-ai-files-108782072033')

# Configure AWS SDK
s3_client = None
bedrock_client = None

if os.environ.get('AWS_ACCESS_KEY_ID'):
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION', 'us-east-1')
        )
        
        bedrock_client = boto3.client(
            'bedrock-runtime',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            region_name=os.environ.get('AWS_REGION', 'us-east-1')
        )
    except Exception as e:
        print(f"Warning: Failed to initialize AWS clients: {e}")

class AwsService:
    """AWS service class that replicates the TypeScript AwsService functionality"""
    
    async def upload_file_to_s3(self, file_content: bytes, filename: str, session_id: str) -> str:
        """Upload file to S3 and return the key"""
        key = f"sessions/{session_id}/{int(time.time() * 1000)}-{filename}"
        
        if not s3_client:
            raise Exception('S3 client not configured. Please check AWS credentials.')
        
        try:
            s3_client.put_object(
                Bucket=BUCKET_NAME,
                Key=key,
                Body=file_content,
                ContentType='application/octet-stream',
                Metadata={
                    'sessionId': session_id,
                    'originalName': filename,
                    'uploadedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                }
            )
            return key
        except ClientError as error:
            print('S3 upload error:', error)
            raise Exception('Failed to upload file to S3')
    
    async def get_file_from_s3(self, s3_key: str) -> str:
        """Download file content from S3"""
        if not s3_client:
            raise Exception('S3 client not configured. Please check AWS credentials.')
        
        try:
            response = s3_client.get_object(Bucket=BUCKET_NAME, Key=s3_key)
            return response['Body'].read().decode('utf-8')
        except ClientError as error:
            print('S3 download error:', error)
            raise Exception('Failed to download file from S3')
    
    async def delete_file_from_s3(self, s3_key: str) -> None:
        """Delete file from S3"""
        if not s3_client:
            raise Exception('S3 client not configured. Please check AWS credentials.')
        
        try:
            s3_client.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
        except ClientError as error:
            print('S3 delete error:', error)
            raise Exception('Failed to delete file from S3')
    
    async def analyze_code_with_bedrock(self, file_contents: List[str], file_names: List[str]) -> Dict[str, Any]:
        """Analyze code using Amazon Bedrock"""
        if not bedrock_client:
            raise Exception('Bedrock client not configured. Please check AWS credentials.')
        
        prompt = self._build_analysis_prompt(file_contents, file_names)
        
        try:
            response = bedrock_client.invoke_model(
                modelId='us.anthropic.claude-3-7-sonnet-20250219-v1:0',
                contentType='application/json',
                accept='*/*',
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4000,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            )
            
            # Fix for invalidbase64 error - properly decode the streaming body
            response_body = response['body'].read().decode('utf-8')
            response_json = json.loads(response_body)
            analysis_text = response_json['content'][0]['text']
            
            # Parse the analysis result from Claude's response
            return self._parse_analysis_result(analysis_text)
        except Exception as error:
            print('Bedrock analysis error:', error)
            raise Exception('Failed to analyze code with Bedrock')
    
    
    def _build_analysis_prompt(self, file_contents: List[str], file_names: List[str]) -> str:
        """Build the prompt for code analysis"""
        files = '\n'.join([
            f"--- File: {file_names[i]} ---\n{file_contents[i]}\n"
            for i in range(len(file_contents))
        ])
        
        return f"""
You are an expert code reviewer. Analyze the following code files and provide a comprehensive review. Focus on:

1. Code structure and architecture
2. Missing error handling
3. Unused imports or variables
4. Performance optimizations
5. Security vulnerabilities
6. Best practices adherence

Please respond with a JSON object in this exact format:
{{
  "passedChecks": number,
  "warnings": number,
  "errors": number,
  "issues": [
    {{
      "type": "error|warning|success|suggestion",
      "severity": "low|medium|high|critical",
      "title": "Issue title",
      "description": "Detailed description",
      "file": "filename",
      "line": number (optional),
      "code": "problematic code snippet (optional)",
      "suggestion": "suggested fix (optional)"
    }}
  ]
}}

Code Files:
{files}

Please provide a thorough analysis and return only the JSON response.
        """
    
    def _parse_analysis_result(self, claude_response: str) -> Dict[str, Any]:
        """Parse analysis result from Claude's response"""
        try:
            # Extract JSON from Claude's response
            import re
            json_match = re.search(r'\{.*\}', claude_response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            
            # Fallback if JSON parsing fails
            return {
                "passedChecks": 0,
                "warnings": 1,
                "errors": 1,
                "issues": [
                    {
                        "type": "error",
                        "severity": "medium",
                        "title": "Analysis Parsing Error",
                        "description": "Failed to parse the analysis result from AI service",
                        "file": "system",
                        "code": None,
                        "suggestion": "Please try the analysis again"
                    }
                ]
            }
        except Exception as error:
            print('Failed to parse analysis result:', error)
            return {
                "passedChecks": 0,
                "warnings": 1,
                "errors": 1,
                "issues": [
                    {
                        "type": "error",
                        "severity": "medium",
                        "title": "Analysis Error",
                        "description": "The AI analysis service encountered an error",
                        "file": "system",
                        "code": None,
                        "suggestion": "Please try the analysis again"
                    }
                ]
            }
    
    async def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate presigned URL for file access"""
        if not s3_client:
            raise Exception('S3 client not configured. Please check AWS credentials.')
        
        try:
            return s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': key},
                ExpiresIn=expires_in
            )
        except ClientError as error:
            print('Presigned URL generation error:', error)
            raise Exception('Failed to generate presigned URL')

# Create the aws service instance
aws_service = AwsService()