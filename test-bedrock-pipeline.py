#!/usr/bin/env python3
"""
CloudShell Test Script for CodeReview AI Pipeline
Tests the complete S3 → Lambda → ECS → Bedrock workflow
"""

import boto3
import json
import time
import uuid
from datetime import datetime

# Configuration
BUCKET_NAME = "codereview-ai-files-108782072033"
REGION = "us-east-1"
BEDROCK_MODEL = "us.anthropic.claude-3-7-sonnet-20250219-v1:0"

# Initialize AWS clients
s3_client = boto3.client('s3', region_name=REGION)
bedrock_client = boto3.client('bedrock-runtime', region_name=REGION)
lambda_client = boto3.client('lambda', region_name=REGION)

def create_test_files():
    """Create sample code files for testing"""
    files = {
        "buggy_example.js": '''// Buggy JavaScript code for testing
function calculateTotal(items) {
    let total = 0;
    for (let i = 0; i <= items.length; i++) {  // BUG: off-by-one error
        total += items[i].price;
    }
    return total;
}

const userData = getUserData();  // Missing error handling
console.log(userData.name);

// Unused import would be here
import { unusedFunction } from './utils';
''',
        
        "good_example.py": '''# Well-written Python code for testing
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    """A well-structured data processor with proper error handling."""
    
    def __init__(self, config: dict):
        self.config = config
        
    def process_items(self, items: List[dict]) -> Optional[dict]:
        """Process a list of items with proper error handling."""
        try:
            if not items:
                logger.warning("No items provided for processing")
                return None
                
            total_value = sum(item.get('value', 0) for item in items)
            
            return {
                'total_items': len(items),
                'total_value': total_value,
                'average_value': total_value / len(items) if items else 0
            }
            
        except Exception as e:
            logger.error(f"Error processing items: {e}")
            raise
            
    def validate_item(self, item: dict) -> bool:
        """Validate a single item."""
        required_fields = ['id', 'value']
        return all(field in item for field in required_fields)
'''
    }
    return files

def upload_test_files_to_s3(session_id: str, files: dict):
    """Upload test files to S3"""
    print(f"📤 Uploading test files to S3 for session: {session_id}")
    
    uploaded_keys = []
    for filename, content in files.items():
        key = f"sessions/{session_id}/{int(time.time() * 1000)}-{filename}"
        
        try:
            s3_client.put_object(
                Bucket=BUCKET_NAME,
                Key=key,
                Body=content.encode('utf-8'),
                ContentType='text/plain',
                Metadata={
                    'sessionId': session_id,
                    'originalName': filename,
                    'uploadedAt': datetime.utcnow().isoformat()
                }
            )
            uploaded_keys.append(key)
            print(f"   ✅ Uploaded: {filename} → {key}")
            
        except Exception as e:
            print(f"   ❌ Failed to upload {filename}: {e}")
            
    return uploaded_keys

def test_bedrock_directly(files: dict):
    """Test Bedrock analysis directly"""
    print(f"\n🤖 Testing Bedrock Claude 3.7 Sonnet directly...")
    
    # Build the analysis prompt
    file_contents = []
    file_names = list(files.keys())
    
    for filename, content in files.items():
        file_contents.append(f"--- File: {filename} ---\n{content}\n")
    
    files_text = '\n'.join(file_contents)
    
    prompt = f"""You are an expert code reviewer. Analyze the following code files and provide a comprehensive review. Focus on:

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
{files_text}

Please provide a thorough analysis and return only the JSON response."""

    try:
        # Call Bedrock
        print(f"   🔄 Calling Claude 3.7 Sonnet...")
        print(f"   📝 Model ID: {BEDROCK_MODEL}")
        
        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL,
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
        
        # Parse response
        response_body = response['body'].read().decode('utf-8')
        response_json = json.loads(response_body)
        claude_response = response_json['content'][0]['text']
        
        print(f"\n🎉 Bedrock Response Received!")
        print(f"📊 Response Length: {len(claude_response)} characters")
        print(f"\n" + "="*80)
        print("🤖 CLAUDE 3.7 SONNET ANALYSIS RESPONSE:")
        print("="*80)
        print(claude_response)
        print("="*80)
        
        # Try to parse as JSON for better formatting
        try:
            import re
            json_match = re.search(r'\{.*\}', claude_response, re.DOTALL)
            if json_match:
                analysis_json = json.loads(json_match.group(0))
                print(f"\n📋 PARSED ANALYSIS SUMMARY:")
                print(f"   ✅ Passed Checks: {analysis_json.get('passedChecks', 0)}")
                print(f"   ⚠️  Warnings: {analysis_json.get('warnings', 0)}")
                print(f"   ❌ Errors: {analysis_json.get('errors', 0)}")
                print(f"   📝 Total Issues: {len(analysis_json.get('issues', []))}")
                
                print(f"\n🔍 DETAILED ISSUES:")
                for i, issue in enumerate(analysis_json.get('issues', []), 1):
                    icon = {"error": "❌", "warning": "⚠️", "success": "✅", "suggestion": "💡"}.get(issue.get('type'), '📝')
                    print(f"   {i}. {icon} [{issue.get('severity', 'unknown').upper()}] {issue.get('title', 'No title')}")
                    print(f"      📁 File: {issue.get('file', 'unknown')}")
                    if issue.get('line'):
                        print(f"      📍 Line: {issue.get('line')}")
                    print(f"      📝 {issue.get('description', 'No description')}")
                    if issue.get('suggestion'):
                        print(f"      💡 Suggestion: {issue.get('suggestion')}")
                    print()
                    
        except Exception as parse_error:
            print(f"   ⚠️ Could not parse as JSON: {parse_error}")
            
        return claude_response
        
    except Exception as e:
        print(f"   ❌ Bedrock Error: {e}")
        print(f"   📋 Error Type: {type(e).__name__}")
        return None

def check_lambda_logs(session_id: str):
    """Check Lambda function logs"""
    print(f"\n📋 Checking Lambda logs for session: {session_id}")
    
    try:
        # Get recent logs from Lambda
        logs_client = boto3.client('logs', region_name=REGION)
        
        # List log streams for the Lambda function
        log_group = '/aws/lambda/codereview-ai-processor'
        
        streams_response = logs_client.describe_log_streams(
            logGroupName=log_group,
            orderBy='LastEventTime',
            descending=True,
            limit=5
        )
        
        print(f"   📊 Found {len(streams_response['logStreams'])} recent log streams")
        
        for stream in streams_response['logStreams'][:2]:  # Check last 2 streams
            stream_name = stream['logStreamName']
            print(f"   🔍 Checking stream: {stream_name}")
            
            events_response = logs_client.get_log_events(
                logGroupName=log_group,
                logStreamName=stream_name,
                limit=50
            )
            
            for event in events_response['events']:
                message = event['message']
                if session_id in message or 'session' in message.lower():
                    timestamp = datetime.fromtimestamp(event['timestamp'] / 1000)
                    print(f"      🕐 {timestamp}: {message}")
                    
    except Exception as e:
        print(f"   ⚠️ Could not check Lambda logs: {e}")

def main():
    """Main test function"""
    print("🚀 CodeReview AI Pipeline Test - CloudShell Edition")
    print("="*60)
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    print(f"🆔 Test Session ID: {session_id}")
    
    # Create test files
    print(f"\n📁 Creating test files...")
    files = create_test_files()
    for filename in files.keys():
        print(f"   📄 {filename} ({len(files[filename])} chars)")
    
    # Test 1: Direct Bedrock Analysis
    print(f"\n" + "="*60)
    print("TEST 1: Direct Bedrock Analysis (Fastest)")
    print("="*60)
    
    bedrock_response = test_bedrock_directly(files)
    
    # Test 2: Full S3 Pipeline (if Bedrock worked)
    if bedrock_response:
        print(f"\n" + "="*60)
        print("TEST 2: Full S3 → Lambda Pipeline")
        print("="*60)
        
        # Upload files to S3
        uploaded_keys = upload_test_files_to_s3(session_id, files)
        
        if uploaded_keys:
            print(f"\n⏳ Waiting 10 seconds for Lambda to process...")
            time.sleep(10)
            
            # Check Lambda logs
            check_lambda_logs(session_id)
            
            print(f"\n🧹 Cleaning up test files...")
            for key in uploaded_keys:
                try:
                    s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
                    print(f"   🗑️ Deleted: {key}")
                except Exception as e:
                    print(f"   ⚠️ Could not delete {key}: {e}")
    
    print(f"\n✅ Test completed!")
    print(f"🔧 If you saw Bedrock responses above, your pipeline is working!")

if __name__ == "__main__":
    main()