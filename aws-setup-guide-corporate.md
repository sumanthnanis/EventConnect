# AWS Setup Guide - Corporate Account Version

This guide is for users who have corporate AWS access. We'll use AWS CloudShell and Console UI for setup, then configure local development with access keys.

## 🎯 What We're Building

Your CodeReview AI will use these AWS services:

| Service | What It Does | Why We Need It |
|---------|-------------|----------------|
| **S3 Bucket** | Stores uploaded code files temporarily | Files need somewhere safe to live during analysis |
| **AWS Lambda** | Triggers when files are uploaded | Automatically starts analysis when files arrive |
| **ECS Fargate** | Runs FastAPI backend service | Handles complex analysis workflows |
| **ECR** | Container registry for Docker images | Stores your custom backend container |
| **Amazon Bedrock** | AI-powered code review (Claude 3.5 Sonnet) | Provides intelligent insights about your code |
| **CloudWatch** | Logging and monitoring | Track what's happening and debug issues |
| **IAM Roles** | Service permissions | Secure communication between services |

## 📅 Setup Timeline

**TODAY (Without Access Keys - 45 minutes):**
- Test permissions in CloudShell
- Create S3 bucket with proper configuration  
- Enable Bedrock and test Claude 3.5 Sonnet
- Create IAM roles for services
- Set up ECS cluster and ECR repository

**TOMORROW (With Access Keys - 30 minutes):**
- Configure local development environment
- Deploy FastAPI backend to ECS
- Connect your CodeReview AI app to AWS services
- Test complete end-to-end workflow

---

## 📋 Before You Start

### What You Need:
- [ ] Corporate AWS account access
- [ ] Access to AWS Console at [console.aws.amazon.com](https://console.aws.amazon.com)
- [ ] Permissions to create S3 buckets, Lambda functions, and use Bedrock
- [ ] This guide open in your browser

### Skills Required:
- Basic computer navigation
- AWS Console access
- Following step-by-step instructions

---

# 🌟 TODAY: Setup Without Access Keys

## 🔑 Step 1: Test Your Permissions with CloudShell

### 1.1 Open CloudShell
1. In AWS Console, look for CloudShell icon (terminal icon in top toolbar)
2. Click it to open CloudShell
3. Wait for the environment to load (30-60 seconds)

### 1.2 Test Your Permissions
Run these commands to check your access:

```bash
# Check your identity
aws sts get-caller-identity

# Test S3 access
aws s3 ls

# Test Lambda access
aws lambda list-functions --region us-east-1

# Test ECS access
aws ecs list-clusters --region us-east-1

# Test ECR access
aws ecr describe-repositories --region us-east-1

# Test Bedrock access
aws bedrock list-foundation-models --region us-east-1

# Test IAM role access
aws iam list-roles --max-items 5
```

### 1.3 Check Your Region
```bash
# Check current region
aws configure get region

# If empty, set it to us-east-1
aws configure set region us-east-1
```

**✅ Checkpoint**: All commands run without "Access Denied" errors

---

## 📦 Step 2: Create S3 Bucket (UI Method)

### 2.1 Create the Bucket
1. In AWS Console, search for **"S3"**
2. Click **"Create bucket"**
3. Bucket name: `codereview-ai-files-[yourname]-[date]`
   - Example: `codereview-ai-files-johnsmith-20250107`
   - Must be globally unique!
4. Region: Choose your company's preferred region (ask IT if unsure)
5. **Block Public Access**: Keep all boxes CHECKED (for security)
6. **Bucket Versioning**: Disabled (to save costs)
7. **Default encryption**: Server-side encryption with Amazon S3 managed keys (SSE-S3)
8. Click **"Create bucket"**

### 2.2 Configure CORS
1. Click on your new bucket name
2. Click **"Permissions"** tab
3. Scroll to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"**
5. Paste this configuration:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
    }
]
```
6. Click **"Save changes"**

### 2.3 Set Lifecycle Policy
1. Still in your bucket, click **"Management"** tab
2. Click **"Create lifecycle rule"**
3. Rule name: `delete-files-after-7-days`
4. **Rule scope**: Apply to all objects in the bucket
5. **Lifecycle rule actions**: Check "Expire current versions of objects"
6. **Expire current versions of objects**: 7 days
7. Click **"Create rule"**

**✅ Checkpoint**: Your bucket appears in the S3 console and shows the lifecycle rule

---

## 🐳 Step 4: Create ECR Repository

### 4.1 Create Repository in CloudShell
```bash
# Create ECR repository for your backend
aws ecr create-repository \
    --repository-name codereview-ai-backend \
    --region us-east-1

# Get login token (we'll use this tomorrow)
aws ecr get-login-password --region us-east-1
```

### 4.2 Verify in Console
1. In AWS Console, search for **"ECR"** 
2. Click **"Amazon Elastic Container Registry"**
3. You should see your `codereview-ai-backend` repository

**✅ Checkpoint**: ECR repository shows in the console

---

## 🏗️ Step 5: Create IAM Roles

### 5.1 Create ECS Task Execution Role
```bash
# Create trust policy for ECS
cat > ecs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
    --role-name CodeReviewAI-ECS-ExecutionRole \
    --assume-role-policy-document file://ecs-trust-policy.json

# Attach required policies
aws iam attach-role-policy \
    --role-name CodeReviewAI-ECS-ExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
    --role-name CodeReviewAI-ECS-ExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
    --role-name CodeReviewAI-ECS-ExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

### 5.2 Create Lambda Execution Role
```bash
# Create trust policy for Lambda
cat > lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
    --role-name CodeReviewAI-Lambda-ExecutionRole \
    --assume-role-policy-document file://lambda-trust-policy.json

# Attach required policies
aws iam attach-role-policy \
    --role-name CodeReviewAI-Lambda-ExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
    --role-name CodeReviewAI-Lambda-ExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
    --role-name CodeReviewAI-Lambda-ExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonECSFullAccess
```

**✅ Checkpoint**: Both IAM roles appear in IAM console

---

## 🚀 Step 6: Create ECS Cluster

### 6.1 Handle ECS Service-Linked Role (Corporate Account)
```bash
# Check if ECS service-linked role already exists
aws iam get-role --role-name AWSServiceRoleForECS

# If it exists, you'll see role details - continue to step 6.2
# If it doesn't exist, you'll get "NoSuchEntity" error
```

**If the role doesn't exist, you have 2 options:**

**Option A: Ask IT to create it**
Send this to your IT team: "Please run: `aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com`"

**Option B: Try creating cluster anyway (often works!)**
Many corporate accounts already have this role created by IT. Skip to step 6.2.

### 6.2 Create Cluster in CloudShell
```bash
# Now create ECS cluster
aws ecs create-cluster \
    --cluster-name codereview-ai-cluster \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# Verify cluster creation
aws ecs list-clusters
```

### 6.3 Verify in Console
1. In AWS Console, search for **"ECS"**
2. Click **"Elastic Container Service"**
3. You should see your `codereview-ai-cluster`

**✅ Checkpoint**: ECS cluster shows "ACTIVE" status

---

## ⚡ Step 7: Enable and Test Bedrock

### 7.1 Enable Bedrock Access
1. In AWS Console, search for **"Bedrock"**
2. Click **"Amazon Bedrock"**
3. In left menu, click **"Model access"**
4. Find **"Claude 3.5 Sonnet"** by Anthropic (you mentioned you have access)
5. Verify it shows **"Access granted"**

### 7.2 Test Bedrock in CloudShell
```bash
# Test Claude 3.5 Sonnet
aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
    --body '{"anthropic_version": "bedrock-2023-05-31", "max_tokens": 100, "messages": [{"role": "user", "content": "Write a hello world in JavaScript"}]}' \
    --region us-east-1 \
    output.txt

# Check the response
cat output.txt
```

**✅ Checkpoint**: Bedrock returns a valid JavaScript hello world response

---

## 🔧 Step 8: Create Lambda Function

### 8.1 Create Lambda Function in CloudShell
```bash
# Create the Lambda function code
cat > lambda_function.py << 'EOF'
import json
import boto3
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ecs_client = boto3.client('ecs')

def lambda_handler(event, context):
    """
    Triggered when files are uploaded to S3
    Starts ECS task for processing
    """
    try:
        logger.info(f"Received S3 event: {json.dumps(event)}")
        
        # Extract session ID from S3 key
        for record in event.get('Records', []):
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            
            # Extract session ID from path: sessions/{session_id}/file.js
            session_id = key.split('/')[1] if len(key.split('/')) > 1 else 'unknown'
            
            logger.info(f"Processing session: {session_id}")
            
            # Start ECS task for analysis
            response = ecs_client.run_task(
                cluster='codereview-ai-cluster',
                taskDefinition='codereview-ai-backend',
                launchType='FARGATE',
                networkConfiguration={
                    'awsvpcConfiguration': {
                        'subnets': [],  # Will be filled when we deploy
                        'assignPublicIp': 'ENABLED'
                    }
                },
                overrides={
                    'containerOverrides': [
                        {
                            'name': 'backend',
                            'environment': [
                                {'name': 'SESSION_ID', 'value': session_id},
                                {'name': 'S3_BUCKET', 'value': bucket}
                            ]
                        }
                    ]
                }
            )
            
            logger.info(f"Started ECS task: {response['tasks'][0]['taskArn']}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Processing initiated successfully')
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
EOF

# Create deployment package
zip lambda-deployment.zip lambda_function.py

# Create the Lambda function
aws lambda create-function \
    --function-name codereview-ai-processor \
    --runtime python3.11 \
    --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/CodeReviewAI-Lambda-ExecutionRole \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://lambda-deployment.zip \
    --region us-east-1
```

### 8.2 Configure S3 Trigger
```bash
# Add S3 trigger permission
aws lambda add-permission \
    --function-name codereview-ai-processor \
    --principal s3.amazonaws.com \
    --action lambda:InvokeFunction \
    --statement-id s3-trigger \
    --source-arn arn:aws:s3:::your-bucket-name-here

# You'll need to replace 'your-bucket-name-here' with your actual bucket name
```

**✅ Checkpoint**: Lambda function shows "Active" status in console

---

# 🌅 TOMORROW: Setup With Access Keys

## 🔐 Step 9: Configure Local Development

### 9.1 Get Access Keys from IT
Ask your IT team for:
- AWS Access Key ID
- AWS Secret Access Key
- Confirm the region (likely `us-east-1`)

### 9.2 Set Up Local Environment
```bash
# In your CodeReview AI project directory
npm install aws-sdk dotenv

# Create .env file
cat > .env << 'EOF'
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_DEFAULT_REGION=us-east-1

# S3 Configuration
S3_BUCKET_NAME=your-bucket-name-here

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_REGION=us-east-1

# ECS Configuration
ECS_CLUSTER_NAME=codereview-ai-cluster
ECS_SERVICE_NAME=backend-service
ECS_TASK_DEFINITION=codereview-ai-backend

# ECR Configuration  
ECR_REPOSITORY_URI=your-account-id.dkr.ecr.us-east-1.amazonaws.com/codereview-ai-backend

# Application Settings
NODE_ENV=production
USE_AWS_SERVICES=true
EOF
```

---

## 🐳 Step 10: Build and Deploy Backend to ECS

### 10.1 Create FastAPI Backend Code
Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create `backend/requirements.txt`:
```txt
fastapi==0.104.1
uvicorn==0.24.0
boto3==1.34.0
pydantic==2.5.0
```

Create `backend/main.py`:
```python
from fastapi import FastAPI, HTTPException
import boto3
import json
import logging
import os

app = FastAPI(title="CodeReview AI Backend")
logger = logging.getLogger(__name__)

# AWS clients
s3_client = boto3.client('s3')
bedrock_client = boto3.client('bedrock-runtime', region_name=os.getenv('AWS_REGION', 'us-east-1'))

@app.post("/analyze-session/{session_id}")
async def analyze_session(session_id: str):
    """
    Analyze all files in a session using Claude 3.5 Sonnet
    """
    try:
        bucket = os.getenv('S3_BUCKET_NAME')
        
        # List files in session
        response = s3_client.list_objects_v2(
            Bucket=bucket,
            Prefix=f'sessions/{session_id}/'
        )
        
        if 'Contents' not in response:
            raise HTTPException(status_code=404, detail="No files found in session")
        
        analysis_results = []
        
        for obj in response['Contents']:
            key = obj['Key']
            if not key.endswith('/'):  # Skip folder objects
                # Download and analyze file
                file_response = s3_client.get_object(Bucket=bucket, Key=key)
                file_content = file_response['Body'].read().decode('utf-8')
                
                # Analyze with Claude 3.5 Sonnet
                analysis = await analyze_with_bedrock(file_content, key)
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
    Analyze code using Claude 3.5 Sonnet
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
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        body=json.dumps(body)
    )
    
    response_body = json.loads(response['body'].read())
    analysis_text = response_body['content'][0]['text']
    
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
```

### 10.2 Build and Push to ECR
```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t codereview-ai-backend ./backend

# Tag image
docker tag codereview-ai-backend:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/codereview-ai-backend:latest

# Push to ECR
docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/codereview-ai-backend:latest
```

### 10.3 Create ECS Task Definition and Service
```bash
# Create task definition
aws ecs register-task-definition \
    --family codereview-ai-backend \
    --network-mode awsvpc \
    --requires-compatibilities FARGATE \
    --cpu 512 \
    --memory 1024 \
    --execution-role-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/CodeReviewAI-ECS-ExecutionRole \
    --task-role-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/CodeReviewAI-ECS-ExecutionRole \
    --container-definitions '[
        {
            "name": "backend",
            "image": "your-account-id.dkr.ecr.us-east-1.amazonaws.com/codereview-ai-backend:latest",
            "portMappings": [
                {
                    "containerPort": 8000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {"name": "AWS_REGION", "value": "us-east-1"},
                {"name": "S3_BUCKET_NAME", "value": "your-bucket-name-here"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/codereview-ai-backend",
                    "awslogs-region": "us-east-1",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]'

# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/codereview-ai-backend --region us-east-1
```

**✅ Checkpoint**: ECS task definition created and backend container ready

---

## 🧪 Step 11: Test Complete Setup

### 11.1 Test Local to AWS Connection
```bash
# Test S3 upload
echo "console.log('test');" > test.js
aws s3 cp test.js s3://your-bucket-name/sessions/test/test.js

# Check Lambda logs
aws logs tail /aws/lambda/codereview-ai-processor --follow
```

### 11.2 Test Your Application
1. Update your `.env` file with real values
2. Start your app: `npm run dev`
3. Upload a code file
4. Verify complete workflow:
   - File uploads to S3
   - Lambda triggers
   - ECS task starts
   - Analysis results appear

**✅ Final Checkpoint**: End-to-end analysis workflow complete with Claude 3.5 Sonnet

---

## 💰 Cost Estimates

**Daily Usage (10 analyses):**
- S3: $0.10
- Lambda: $0.05
- ECS Fargate: $2.00
- Bedrock (Claude 3.5 Sonnet): $1.50
- **Total: ~$3.65/day or $110/month**

**Light Usage (2-3 analyses/day):**
- **Total: ~$25-40/month**

---

## ✅ Complete Checklist

**TODAY:**
- [ ] Tested permissions in CloudShell
- [ ] Created S3 bucket with proper configuration
- [ ] Created ECR repository
- [ ] Created IAM roles for ECS and Lambda
- [ ] Created ECS cluster
- [ ] Tested Bedrock access with Claude 3.5 Sonnet
- [ ] Created Lambda function

**TOMORROW:**
- [ ] Got access keys from IT
- [ ] Set up local development environment
- [ ] Built and deployed FastAPI backend to ECS
- [ ] Configured complete S3 → Lambda → ECS → Bedrock workflow
- [ ] Tested end-to-end analysis

**🎉 Success!** Your CodeReview AI is running on AWS with Claude 3.5 Sonnet!

## ⚡ Step 3: Enable Amazon Bedrock (UI Method)

### 3.1 Access Bedrock
1. In AWS Console, search for **"Bedrock"**
2. Click **"Amazon Bedrock"**

### 3.2 Request Model Access
1. In left menu, click **"Model access"**
2. Click **"Request model access"** or **"Manage model access"**
3. Find **"Claude 3 Haiku"** by Anthropic
4. Click **"Request access"** or check the box if available
5. If prompted, fill out use case:
   - **Use case**: "Internal code review and analysis tool"
   - **Company/Organization**: [Your company name]
6. Click **"Next"** and **"Submit"**

### 3.3 Wait for Approval
- Claude 3 Haiku usually gets approved instantly for corporate accounts
- Refresh the page after 2-3 minutes
- Status should show **"Access granted"**

**✅ Checkpoint**: Claude 3 Haiku shows "Access granted" in Model access page

---

## 🔧 Step 4: Create Lambda Function (UI Method)

### 4.1 Create the Function
1. Search for **"Lambda"** in AWS Console
2. Click **"Create function"**
3. Choose **"Author from scratch"**
4. **Function name**: `codereview-ai-processor`
5. **Runtime**: Python 3.11
6. **Architecture**: x86_64
7. **Execution role**: 
   - If you can choose: "Create a new role with basic Lambda permissions"
   - If restricted: Use existing role (ask IT which one to use)
8. Click **"Create function"**

### 4.2 Add Function Code
1. In the **Code** tab, replace the default code with:

```python
import json
import boto3
import logging
import os
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')
bedrock_client = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

def lambda_handler(event, context):
    """
    Process uploaded code files and perform AI analysis
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Handle S3 trigger event
        if 'Records' in event:
            for record in event['Records']:
                bucket = record['s3']['bucket']['name']
                key = record['s3']['object']['key']
                
                logger.info(f"Processing file: {key} from bucket: {bucket}")
                
                # Download file from S3
                try:
                    response = s3_client.get_object(Bucket=bucket, Key=key)
                    file_content = response['Body'].read().decode('utf-8')
                    
                    # Perform AI analysis
                    analysis_result = analyze_code_with_bedrock(file_content, key)
                    
                    # Save analysis result back to S3
                    result_key = key.replace('sessions/', 'results/').replace('.', '_analysis.')
                    s3_client.put_object(
                        Bucket=bucket,
                        Key=result_key + '.json',
                        Body=json.dumps(analysis_result),
                        ContentType='application/json'
                    )
                    
                    logger.info(f"Analysis completed for {key}")
                    
                except Exception as e:
                    logger.error(f"Error processing file {key}: {str(e)}")
                    continue
        
        return {
            'statusCode': 200,
            'body': json.dumps('Processing completed successfully')
        }
        
    except Exception as e:
        logger.error(f"Lambda execution error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }

def analyze_code_with_bedrock(code_content, filename):
    """
    Analyze code using Amazon Bedrock Claude model
    """
    try:
        prompt = f"""
        Please analyze this code file and provide a comprehensive review:

        Filename: {filename}
        Code:
        ```
        {code_content}
        ```

        Please provide:
        1. Overall code quality assessment
        2. Potential issues or bugs
        3. Security considerations
        4. Performance improvements
        5. Best practice recommendations
        6. Code style suggestions

        Format your response as JSON with the following structure:
        {{
            "overall_score": 85,
            "summary": "Brief summary",
            "issues": [
                {{"type": "error", "line": 15, "message": "Issue description", "suggestion": "How to fix"}}
            ],
            "recommendations": ["List of general recommendations"]
        }}
        """
        
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        response = bedrock_client.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=json.dumps(body)
        )
        
        response_body = json.loads(response['body'].read())
        analysis_text = response_body['content'][0]['text']
        
        # Try to parse as JSON, fallback to text if not valid JSON
        try:
            analysis_result = json.loads(analysis_text)
        except:
            analysis_result = {
                "overall_score": 75,
                "summary": "Analysis completed",
                "analysis_text": analysis_text,
                "issues": [],
                "recommendations": ["Review the detailed analysis above"]
            }
        
        return analysis_result
        
    except Exception as e:
        logger.error(f"Bedrock analysis error: {str(e)}")
        return {
            "overall_score": 0,
            "summary": "Analysis failed",
            "error": str(e),
            "issues": [],
            "recommendations": ["Please check the logs for error details"]
        }
```

2. Click **"Deploy"** to save the function

### 4.3 Configure Environment Variables
1. Click **"Configuration"** tab
2. Click **"Environment variables"** on the left
3. Click **"Edit"**
4. Add these variables:
   - `AWS_REGION`: `us-east-1` (or your company's region)
   - `S3_BUCKET_NAME`: `your-bucket-name-here`
5. Click **"Save"**

### 4.4 Add S3 Trigger
1. Click **"Add trigger"**
2. Select **"S3"**
3. **Bucket**: Choose your bucket
4. **Event type**: "All object create events"
5. **Prefix**: `sessions/` (only trigger for uploaded files)
6. **Suffix**: Leave empty
7. Click **"Add"**

### 4.5 Update Permissions
1. Click **"Configuration"** → **"Permissions"**
2. Click on the execution role name (blue link)
3. In the IAM console, click **"Add permissions"** → **"Attach policies"**
4. Search and attach these policies:
   - `AmazonS3FullAccess`
   - `AmazonBedrockFullAccess`
   - `CloudWatchLogsFullAccess`
5. Click **"Add permissions"**

**✅ Checkpoint**: Lambda function shows "Active" status and S3 trigger is configured

---

## 🔐 Step 5: Configure Your Application

### 5.1 Create Environment File
In your CodeReview AI project, create a `.env` file:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_DEFAULT_REGION=us-east-1

# S3 Configuration
S3_BUCKET_NAME=your-actual-bucket-name

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_REGION=us-east-1

# Application Settings
NODE_ENV=production
USE_AWS_SERVICES=true
```

### 5.2 Update Credentials
1. Replace `your_access_key_here` with your AWS Access Key ID
2. Replace `your_secret_key_here` with your AWS Secret Access Key
3. Replace `your-actual-bucket-name` with your S3 bucket name

**⚠️ Security**: Never commit this `.env` file to version control!

---

## 🧪 Step 6: Test Your Setup

### 6.1 Test S3 Upload
1. In AWS Console, go to your S3 bucket
2. Click **"Upload"**
3. Upload a test JavaScript file to folder `sessions/test/`
4. Check that the Lambda function was triggered in CloudWatch logs

### 6.2 Check Lambda Logs
1. Go to **CloudWatch** in AWS Console
2. Click **"Logs"** → **"Log groups"**
3. Find `/aws/lambda/codereview-ai-processor`
4. Check for recent execution logs

### 6.3 Test Your Application
1. Start your app: `npm run dev`
2. Upload a code file
3. Verify it appears in S3 under `sessions/`
4. Check for analysis results in S3 under `results/`

**✅ Checkpoint**: Files upload successfully and analysis results appear

---

## 💰 Cost Management

### Expected Costs (Corporate Account):
- **S3**: $1-2/month (file storage)
- **Lambda**: $0-1/month (execution time)
- **Bedrock**: $2-5/month (Claude API calls)
- **Total**: $3-8/month

### Monitor Usage:
1. AWS Console → **"Billing and Cost Management"**
2. Set up budget alerts if allowed
3. Monitor usage in **"Cost Explorer"**

---

## 🆘 Troubleshooting

### Common Corporate Account Issues:

**Permission Denied Errors:**
- Contact your IT team to add required permissions
- Ask for policies: S3FullAccess, LambdaFullAccess, BedrockFullAccess

**Can't Create IAM Roles:**
- Ask IT to create the Lambda execution role for you
- Provide them the policy requirements from this guide

**Region Restrictions:**
- Use your company's approved AWS region
- Update all configurations to match

**Bedrock Not Available:**
- Check if Bedrock is enabled in your region
- Ask IT to request Bedrock access for your account

---

## ✅ Completion Checklist

- [ ] Got AWS credentials from IT or created access keys
- [ ] Created S3 bucket with CORS and lifecycle policies
- [ ] Enabled Bedrock with Claude 3 Haiku access
- [ ] Created Lambda function with proper code and permissions
- [ ] Configured S3 trigger for Lambda
- [ ] Set up environment variables in your application
- [ ] Tested file upload and processing workflow
- [ ] Verified analysis results appear in S3

**🎉 Success!** Your CodeReview AI is now running on your corporate AWS account!

---

## 📞 Need Help?

If you encounter corporate account restrictions:
1. **Contact your IT/DevOps team** with specific permission requirements
2. **Share this guide** with them to show what permissions are needed
3. **Ask for help** with service quotas or region restrictions
4. **Test incrementally** - verify each service works before moving to the next

Remember: Corporate AWS accounts often have guardrails, but most permissions can be granted by your IT team.