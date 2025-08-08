#!/usr/bin/env python3
"""
ECS-specific analyzer service for AWS deployment
This is based on the main.py from section 9.4 of the setup guide
Used specifically for ECS container processing tasks
"""

import os
import json
import boto3
import logging
from fastapi import FastAPI, HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AWS clients
s3_client = boto3.client('s3', region_name='us-east-1')
bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1')

app = FastAPI()

@app.post("/analyze")
async def analyze_session(session_id: str, bucket: str):
    """
    Main analysis endpoint for ECS tasks
    Processes files in S3 and generates analysis using Claude 3.7 Sonnet
    """
    try:
        logger.info(f"Starting analysis for session: {session_id}")
        
        # List all files in the session
        prefix = f'sessions/{session_id}/'
        response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        
        if 'Contents' not in response:
            raise HTTPException(status_code=404, detail="No files found for session")
        
        analysis_results = []
        
        # Process each file
        for obj in response['Contents']:
            if obj['Key'].endswith('/'):  # Skip directories
                continue
                
            key = obj['Key']
            logger.info(f"Processing file: {key}")
            
            # Download file content
            file_response = s3_client.get_object(Bucket=bucket, Key=key)
            content = file_response['Body'].read().decode('utf-8')
            
            # Extract filename from key
            filename = key.split('/')[-1]
            
            # Analyze with Bedrock
            analysis = await analyze_with_bedrock(content, filename)
            
            analysis_results.append({
                'file': key,
                'analysis': analysis
            })
        
        # Save combined results
        result_key = f'results/{session_id}/analysis.json'
        s3_client.put_object(
            Bucket=bucket,
            Key=result_key,
            Body=json.dumps({
                'session_id': session_id,
                'files_analyzed': len(analysis_results),
                'results': analysis_results
            }),
            ContentType='application/json'
        )
        
        return {"message": "Analysis completed", "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def analyze_with_bedrock(code_content: str, filename: str):
    """
    Analyze code using Claude 3.7 Sonnet
    """
    prompt = f"""
    Analyze this code file and provide a comprehensive review:

    Filename: {filename}
    Code:
    ```
    {code_content}
    ```

    Provide analysis in JSON format:
    {{
        "overall_score": 85,
        "summary": "Brief summary",
        "issues": [
            {{"type": "error", "line": 15, "message": "Issue description", "suggestion": "How to fix"}}
        ],
        "recommendations": ["List of recommendations"],
        "security_concerns": ["Security issues if any"],
        "performance_notes": ["Performance improvements"]
    }}
    """
    
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4000,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    response = bedrock_client.invoke_model(
        modelId="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        body=json.dumps(body),
        contentType='application/json'
    )
    
    # Fix for invalidbase64 error - properly decode the streaming body
    response_body = response['body'].read().decode('utf-8')
    response_json = json.loads(response_body)
    analysis_text = response_json['content'][0]['text']
    
    try:
        return json.loads(analysis_text)
    except:
        return {
            "overall_score": 75,
            "summary": "Analysis completed",
            "analysis_text": analysis_text
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# This would be used in ECS deployment, not in your main application
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)