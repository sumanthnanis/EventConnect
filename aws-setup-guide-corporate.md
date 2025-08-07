# AWS Setup Guide - Corporate Account Version

This guide is for users who have corporate AWS access with restricted permissions. We'll work with your existing access and use the AWS Console UI for most operations.

## 🎯 What We're Building

Your CodeReview AI will use these AWS services:

| Service | What It Does | Why We Need It |
|---------|-------------|----------------|
| **S3 Bucket** | Stores uploaded code files temporarily | Files need somewhere safe to live during analysis |
| **AWS Lambda** | Triggers when files are uploaded | Automatically starts analysis when files arrive |
| **Amazon Bedrock** | AI-powered code review | Provides intelligent insights about your code |
| **CloudWatch** | Logging and monitoring | Track what's happening and debug issues |

**Note**: We'll skip ECS Fargate since it requires more complex permissions, and use Lambda for all processing.

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

## 🔑 Step 1: Get Your AWS Credentials

### 1.1 Find Your Access Keys
Since you can't create IAM users, we need to get your existing credentials:

**Option A: Check with IT/DevOps Team**
Ask your IT team for:
- AWS Access Key ID
- AWS Secret Access Key
- The region your company uses (likely `us-east-1` or `us-west-2`)

**Option B: Create Access Keys from Your User**
1. In AWS Console, click your username (top right)
2. Click **"Security credentials"**
3. Scroll to **"Access keys"**
4. If you can create access keys, click **"Create access key"**
5. Choose **"Command Line Interface (CLI)"**
6. Save the keys securely

**Option C: Use AWS CloudShell**
1. In AWS Console, look for CloudShell icon (terminal icon in top toolbar)
2. Click it to open CloudShell
3. You can run AWS commands directly here without local setup

### 1.2 Test Your Permissions
Let's check what you can access:

**In CloudShell or terminal:**
```bash
# Test S3 access
aws s3 ls

# Test Lambda access
aws lambda list-functions --region us-east-1

# Test Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

**✅ Checkpoint**: You can run at least the S3 command without "Access Denied" errors

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