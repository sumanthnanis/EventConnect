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
| **Amazon Bedrock** | AI-powered code review (Claude 3.7 Sonnet) | Provides intelligent insights about your code |
| **CloudWatch** | Logging and monitoring | Track what's happening and debug issues |
| **IAM Roles** | Service permissions | Secure communication between services |

## 📅 Setup Timeline

**TODAY (Without Access Keys - 45 minutes):**
- Test permissions in CloudShell
- Create S3 bucket with proper configuration  
- Enable Bedrock and test Claude 3.7 Sonnet
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

## ⚡ Step 3: Enable Amazon Bedrock

### 3.1 Access Bedrock Console
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

### 3.3 Wait for Approval and Test
```bash
# Wait 2-3 minutes, then test access
aws bedrock list-foundation-models --region us-east-1 | grep claude

# Test Claude 3 Haiku specifically
aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-haiku-20240307-v1:0 \
    --body '{"anthropic_version": "bedrock-2023-05-31", "max_tokens": 100, "messages": [{"role": "user", "content": "Write hello world in JavaScript"}]}' \
    --region us-east-1 \
    output.txt

# Check the response
cat output.txt
```

**✅ Checkpoint**: Claude 3 Haiku shows "Access granted" and returns valid JavaScript code

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

## 🚀 Step 6: Create ECS Cluster and VPC Setup

### 6.1 Set Your AWS Resources (Pre-configured)
```bash
# Your specific AWS resources (ready to use)
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export BUCKET_NAME="codereview-ai-files-108782072033"
export SUBNET1="subnet-0243daa28b46c8873"
export SUBNET2="subnet-0fc73c07d9bef52b9"
export ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/codereview-ai-backend"

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "S3 Bucket: $BUCKET_NAME"
echo "Subnet 1: $SUBNET1"
echo "Subnet 2: $SUBNET2"
echo "ECR URI: $ECR_URI"

# Get VPC ID from your subnets
export VPC_ID=$(aws ec2 describe-subnets --subnet-ids $SUBNET1 --query "Subnets[0].VpcId" --output text)
echo "VPC ID: $VPC_ID"
```

### 6.2 Handle ECS Service-Linked Role (Corporate Account)
```bash
# Check if ECS service-linked role already exists
aws iam get-role --role-name AWSServiceRoleForECS

# If it exists, you'll see role details - continue to step 6.3
# If it doesn't exist, you'll get "NoSuchEntity" error
```

**If the role doesn't exist, you have 2 options:**

**Option A: Ask IT to create it**
Send this to your IT team: "Please run: `aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com`"

**Option B: Try creating cluster anyway (often works!)**
Many corporate accounts already have this role created by IT. Skip to step 6.3.

### 6.3 Create Cluster in CloudShell
```bash
# Create ECS cluster (simpler approach for corporate accounts)
aws ecs create-cluster --cluster-name codereview-ai-cluster

# Alternative: If you have service-linked role permissions, try:
# aws ecs create-cluster \
#     --cluster-name codereview-ai-cluster \
#     --capacity-providers FARGATE \
#     --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# Verify cluster creation
aws ecs list-clusters
```

### 6.4 Create Security Group for ECS
```bash
# Create security group for our ECS tasks
aws ec2 create-security-group \
    --group-name codereview-ai-sg \
    --description "Security group for CodeReview AI ECS tasks" \
    --vpc-id $VPC_ID

# Get the security group ID
export SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=codereview-ai-sg" --query "SecurityGroups[0].GroupId" --output text)
echo "Security Group ID: $SG_ID"

# Allow inbound traffic on port 5000 (our FastAPI app port)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5000 \
    --cidr 0.0.0.0/0
```

### 6.5 Verify in Console
1. In AWS Console, search for **"ECS"**
2. Click **"Elastic Container Service"**
3. You should see your `codereview-ai-cluster`

**✅ Checkpoint**: ECS cluster shows "ACTIVE" status and you have VPC/subnet information

---

## 🔧 Step 7: Create Lambda Function

### 7.1 Create Lambda Function in CloudShell
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

### 7.2 Configure S3 Trigger (2 Steps Required)

**Step 1: Give S3 permission to invoke Lambda**
```bash
# Add S3 trigger permission
aws lambda add-permission \
    --function-name codereview-ai-processor \
    --principal s3.amazonaws.com \
    --action lambda:InvokeFunction \
    --statement-id s3-trigger \
    --source-arn arn:aws:s3:::codereview-ai-files-108782072033
```

**Step 2: Create S3 Event Notification (UI Method - Easier)**
1. In AWS Console, go to **S3**
2. Click on bucket **"codereview-ai-files-108782072033"**
3. Click **"Properties"** tab
4. Scroll down to **"Event notifications"** section
5. Click **"Create event notification"**
6. Fill in the details:
   - **Name**: `codereview-ai-trigger`
   - **Prefix**: `sessions/` (only trigger for uploaded files)
   - **Event types**: Check **"All object create events"** (or specifically PUT, POST, COPY)
   - **Destination**: Select **"Lambda function"**
   - **Lambda function**: Choose `codereview-ai-processor`
7. Click **"Save changes"**

**Alternative: CLI Method for Event Notification**
```bash
# Create event notification configuration
cat > notification-config.json << 'EOF'
{
    "LambdaConfigurations": [
        {
            "Id": "CodeReviewAITrigger",
            "LambdaFunctionArn": "arn:aws:lambda:us-east-1:ACCOUNT-ID:function:codereview-ai-processor",
            "Events": ["s3:ObjectCreated:*"],
            "Filter": {
                "Key": {
                    "FilterRules": [
                        {
                            "Name": "prefix",
                            "Value": "sessions/"
                        }
                    ]
                }
            }
        }
    ]
}
EOF

# Replace ACCOUNT-ID and apply the notification configuration
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i "s/ACCOUNT-ID/$ACCOUNT_ID/g" notification-config.json

# Apply the notification configuration
aws s3api put-bucket-notification-configuration \
    --bucket codereview-ai-files-108782072033 \
    --notification-configuration file://notification-config.json
```

**✅ Checkpoint**: 
- Lambda function shows "Active" status in console
- S3 bucket shows event notification under Properties → Event notifications
- Lambda function shows S3 trigger under Configuration → Triggers

---

# 🌅 TOMORROW: Setup With Access Keys

## 🔐 Step 8: Configure Local Development

### 8.1 Your Access Keys (Pre-configured)
Your AWS access keys are ready to use:
- **AWS Access Key ID**: `AWS_API_KEY`
- **AWS Secret Access Key**: `TphZYjJIiof1mPBU5BhoQGUwbq6EtwRbmP/P0ZrG`
- **Region**: `us-east-1`

### 8.2 Set Up Local Environment

**⚠️ Important**: Run these commands in your **Replit Shell** (not AWS CloudShell)

```bash
# In your CodeReview AI project directory (Replit Shell)
# Create .env file with your actual credentials
cat > .env << EOF
# AWS Configuration
AWS_ACCESS_KEY_ID=AWS_API_KEY
AWS_SECRET_ACCESS_KEY=TphZYjJIiof1mPBU5BhoQGUwbq6EtwRbmP/P0ZrG
AWS_DEFAULT_REGION=us-east-1

# S3 Configuration
S3_BUCKET_NAME=codereview-ai-files-108782072033

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_REGION=us-east-1

# ECS Configuration
ECS_CLUSTER_NAME=codereview-ai-cluster
ECS_SERVICE_NAME=codereview-ai-service
ECS_TASK_DEFINITION=codereview-ai-backend

# ECR Configuration  
ECR_REPOSITORY_URI=$ECR_URI

# Application Settings
ENVIRONMENT=production
USE_AWS_SERVICES=true
PORT=5000
EOF
```

---

## 🐳 Step 9: Build and Deploy Backend to ECS

### 9.1 Create Required Deployment Files

**⚠️ Important**: Run these commands in your **Replit Shell** (not AWS CloudShell)

**Create Dockerfile (in your project root):**
```bash
# Create the Dockerfile (Replit Shell)
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Copy Python requirements
COPY pyproject.toml uv.lock ./

# Install uv and dependencies
RUN pip install uv
RUN uv sync --frozen

# Copy application code
COPY main.py ./
COPY server/ ./server/

EXPOSE 5000

# Set environment variables
ENV PORT=5000
ENV PYTHONPATH=/app

# Run the FastAPI application
CMD ["python", "main.py"]
EOF
```

**Note**: Your `pyproject.toml` already has the correct AWS dependencies (boto3, fastapi, etc.)

### 9.2 Build Frontend for Production
```bash
# Build the React frontend for production (Replit Shell)
npm run build

# Verify the build was created
ls -la dist/public/
```

### 9.3 Set Your Resource Variables (Pre-configured)
Your AWS resources are already configured from Step 6.1, but let's set them again for this section:

```bash
# Your specific AWS resources (ready to use)
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export BUCKET_NAME="codereview-ai-files-108782072033"
export ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/codereview-ai-backend"

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Bucket Name: $BUCKET_NAME"
echo "ECR URI: $ECR_URI"
```

### 9.4 Update Your AWS Integration Code

Your existing `main.py` is already set up for AWS integration. Here's the key configuration that should already be there:
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
    Analyze all files in a session using Claude 3.7 Sonnet
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
                
                # Analyze with Claude 3.7 Sonnet
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
```

### 9.5 Build and Push to ECR

**⚠️ Important**: Run these commands in your **Replit Shell** (not AWS CloudShell)

```bash
# Get ECR login (using our environment variable) (Replit Shell)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

# Build image (from project root directory)
docker build -t codereview-ai-backend .

# Tag image
docker tag codereview-ai-backend:latest $ECR_URI:latest

# Push to ECR
docker push $ECR_URI:latest

# Verify the push
aws ecr describe-images --repository-name codereview-ai-backend --region us-east-1
```

### 9.6 Create CloudWatch Log Group First

**⚠️ Important**: Run these commands in **AWS CloudShell** (or Replit Shell with AWS CLI configured)

```bash
# Create CloudWatch log group (must be created before task definition) (AWS CloudShell)
aws logs create-log-group --log-group-name /ecs/codereview-ai-backend --region us-east-1
```

### 9.7 Create ECS Task Definition

**⚠️ Important**: Run these commands in **AWS CloudShell** (or Replit Shell with AWS CLI configured)

```bash
# Create task definition with correct values (AWS CloudShell)
aws ecs register-task-definition \
    --family codereview-ai-backend \
    --network-mode awsvpc \
    --requires-compatibilities FARGATE \
    --cpu 512 \
    --memory 1024 \
    --execution-role-arn arn:aws:iam::$AWS_ACCOUNT_ID:role/CodeReviewAI-ECS-ExecutionRole \
    --task-role-arn arn:aws:iam::$AWS_ACCOUNT_ID:role/CodeReviewAI-ECS-ExecutionRole \
    --container-definitions "[
        {
            \"name\": \"backend\",
            \"image\": \"$ECR_URI:latest\",
            \"portMappings\": [
                {
                    \"containerPort\": 5000,
                    \"protocol\": \"tcp\"
                }
            ],
            \"environment\": [
                {\"name\": \"AWS_REGION\", \"value\": \"us-east-1\"},
                {\"name\": \"S3_BUCKET_NAME\", \"value\": \"$BUCKET_NAME\"},
                {\"name\": \"USE_AWS_SERVICES\", \"value\": \"true\"},
                {\"name\": \"PORT\", \"value\": \"5000\"}
            ],
            \"logConfiguration\": {
                \"logDriver\": \"awslogs\",
                \"options\": {
                    \"awslogs-group\": \"/ecs/codereview-ai-backend\",
                    \"awslogs-region\": \"us-east-1\",
                    \"awslogs-stream-prefix\": \"ecs\"
                }
            }
        }
    ]"
```

### 9.8 Create ECS Service

**⚠️ Important**: Run these commands in **AWS CloudShell** (or Replit Shell with AWS CLI configured)

```bash
# Create ECS service (using your specific subnets) (AWS CloudShell)
aws ecs create-service \
    --cluster codereview-ai-cluster \
    --service-name codereview-ai-service \
    --task-definition codereview-ai-backend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-0243daa28b46c8873,subnet-0fc73c07d9bef52b9],securityGroups=[$SG_ID],assignPublicIp=ENABLED}"

# Check service status
aws ecs describe-services --cluster codereview-ai-cluster --services codereview-ai-service
```

**✅ Checkpoint**: ECS task definition created and backend container ready

---

## 🧪 Step 10: Test Complete Setup

### 10.1 Test S3 Trigger

**⚠️ Important**: Run these commands in **AWS CloudShell** (or Replit Shell with AWS CLI configured)

```bash
# Test S3 trigger (AWS CloudShell)
echo "console.log('hello world');" > test.js
aws s3 cp test.js s3://codereview-ai-files-108782072033/sessions/test-session/test.js

# Check Lambda logs (in another terminal or wait a moment)
aws logs tail /aws/lambda/codereview-ai-processor --follow

# Verify the file was uploaded
aws s3 ls s3://codereview-ai-files-108782072033/sessions/test-session/
```

### 10.2 Test Your Application

**⚠️ Important**: Run these commands in your **Replit Shell**

1. Your `.env` file is already configured with your actual credentials
2. Start your local application: `npm run dev` (serves frontend + backend on port 5000)
3. Open your browser to `http://localhost:5000`
4. Upload a code file and verify the complete workflow:
   - File uploads to S3: codereview-ai-files-108782072033 ✓
   - Lambda triggers ✓  
   - Analysis processing ✓
   - Results display ✓

**✅ Final Checkpoint**: End-to-end analysis workflow complete with Claude 3 Haiku

---

## 💰 Cost Estimates

**Daily Usage (10 analyses):**
- S3: $0.10
- Lambda: $0.05
- ECS Fargate: $2.00
- Bedrock (Claude 3 Haiku): $0.75
- **Total: ~$2.90/day or $87/month**

**Light Usage (2-3 analyses/day):**
- **Total: ~$18-30/month**

---

## ✅ Complete Checklist

**TODAY:**
- [ ] Tested permissions in CloudShell
- [ ] Created S3 bucket with proper configuration
- [ ] Enabled Bedrock access with Claude 3 Haiku
- [ ] Created ECR repository
- [ ] Created IAM roles for ECS and Lambda
- [ ] Created ECS cluster with VPC/security group setup
- [ ] Created Lambda function
- [ ] Configured complete S3 → Lambda trigger

**TOMORROW:**
- [ ] Got access keys from IT
- [ ] Set up local development environment
- [ ] Built frontend for production
- [ ] Built and deployed backend container to ECS
- [ ] Created ECS task definition and service
- [ ] Tested complete S3 → Lambda → Bedrock workflow
- [ ] Verified end-to-end analysis functionality

**🎉 Success!** Your CodeReview AI is running on AWS with Claude 3 Haiku!