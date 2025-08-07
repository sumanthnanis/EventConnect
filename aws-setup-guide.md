# Complete AWS Setup Guide for CodeReview AI

This guide provides **beginner-friendly**, step-by-step instructions to configure AWS services for the CodeReview AI application. Follow each section carefully - the steps are designed for someone who has never used AWS before.

## 🎯 What We're Building

Your CodeReview AI will use these AWS services:

| Service | What It Does | Why We Need It |
|---------|-------------|----------------|
| **S3 Bucket** | Stores uploaded code files temporarily | Files need somewhere safe to live during analysis |
| **AWS Lambda** | Triggers when files are uploaded | Automatically starts analysis when files arrive |
| **ECS Fargate** | Runs the analysis backend | Does the heavy lifting of code analysis |
| **Amazon Bedrock** | AI-powered code review | Provides intelligent insights about your code |
| **IAM Roles** | Security permissions | Lets services talk to each other safely |

**Total Expected Cost**: $5-20/month depending on usage

---

## 📋 Before You Start

### What You Need:
- [ ] A computer with internet access
- [ ] A credit card (AWS requires this, but you'll use free tier mostly)
- [ ] 2-3 hours of time
- [ ] This guide open in your browser

### Skills Required:
- Basic computer navigation
- Ability to copy/paste commands
- Following step-by-step instructions

**No coding or AWS experience required!**

---

## 🚀 Step 1: Create Your AWS Account

### 1.1 Sign Up for AWS
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click **"Create an AWS Account"**
3. Enter your email address
4. Choose **"Personal"** account type
5. Fill in your information (name, address, phone)
6. Enter credit card details (you won't be charged immediately)
7. Choose **"Basic Plan (Free)"** for support
8. Complete phone verification

### 1.2 Access AWS Console
1. After signup, go to [console.aws.amazon.com](https://console.aws.amazon.com)
2. Sign in with your new account
3. You should see the AWS Management Console

**✅ Checkpoint**: You can see the AWS dashboard with various service icons

---

## 🛠️ Step 2: Install Required Tools

### 2.1 Install AWS CLI (Command Line Interface)

**For Windows:**
1. Download from: [AWS CLI Windows Installer](https://awscli.amazonaws.com/AWSCLIV2.msi)
2. Run the installer
3. Follow the setup wizard
4. Open Command Prompt and type: `aws --version`

**For Mac:**
```bash
# Install using Homebrew (if you have it)
brew install awscli

# Or download the installer from AWS website
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**For Linux (Ubuntu/Debian):**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 2.2 Configure AWS CLI
1. In your terminal/command prompt, run:
```bash
aws configure
```

2. You'll be asked for 4 pieces of information:
   - **AWS Access Key ID**: We'll get this in the next step
   - **AWS Secret Access Key**: We'll get this in the next step  
   - **Default region**: Type `us-east-1`
   - **Default output format**: Type `json`

**We'll come back to this after we create the access keys!**

---

## 🔑 Step 3: Create Access Keys

### 3.1 Create IAM User
1. In AWS Console, search for **"IAM"** in the top search bar
2. Click on **"IAM"** service
3. In the left menu, click **"Users"**
4. Click **"Create user"** button
5. Enter username: `codereview-ai-user`
6. Click **"Next"**

### 3.2 Set Permissions
1. Choose **"Attach policies directly"**
2. Search for and check these policies:
   - `AmazonS3FullAccess`
   - `AWSLambdaFullAccess`
   - `AmazonECS_FullAccess`
   - `AmazonBedrockFullAccess`
   - `IAMFullAccess`
3. Click **"Next"**
4. Click **"Create user"**

### 3.3 Create Access Keys
1. Click on your new user: `codereview-ai-user`
2. Click **"Security credentials"** tab
3. Scroll down to **"Access keys"**
4. Click **"Create access key"**
5. Choose **"Command Line Interface (CLI)"**
6. Check the confirmation box
7. Click **"Next"**
8. Add description: `CodeReview AI Application`
9. Click **"Create access key"**

### 3.4 Save Your Keys (IMPORTANT!)
1. **COPY** the **Access Key ID** and **Secret Access Key**
2. **SAVE THEM SAFELY** - you'll never see the secret key again!
3. Download the CSV file as backup
4. Click **"Done"**

### 3.5 Complete AWS CLI Configuration
Now go back to your terminal and run:
```bash
aws configure
```
Enter the keys you just saved:
- **AWS Access Key ID**: [paste your access key]
- **AWS Secret Access Key**: [paste your secret key]
- **Default region**: `us-east-1`
- **Default output format**: `json`

**✅ Checkpoint**: Run `aws s3 ls` - you should see a list (even if empty) without errors

---

## 📦 Step 4: Create S3 Bucket

### 4.1 Create the Bucket
1. Choose a unique bucket name: `codereview-ai-files-[YOUR-NAME]-[RANDOM-NUMBER]`
   - Example: `codereview-ai-files-john-12345`
   - Must be globally unique across all AWS users!

2. Create the bucket:
```bash
aws s3 mb s3://codereview-ai-files-john-12345 --region us-east-1
```
Replace `codereview-ai-files-john-12345` with your chosen name.

### 4.2 Configure CORS (Cross-Origin Resource Sharing)
1. Create a file called `cors-config.json`:
```json
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

2. Apply the CORS configuration:
```bash
aws s3api put-bucket-cors --bucket codereview-ai-files-john-12345 --cors-configuration file://cors-config.json
```

### 4.3 Set Lifecycle Policy (Auto-cleanup)
1. Create `lifecycle-config.json`:
```json
{
    "Rules": [
        {
            "ID": "delete-after-7-days",
            "Status": "Enabled",
            "Filter": {},
            "Expiration": {
                "Days": 7
            }
        }
    ]
}
```

2. Apply lifecycle policy:
```bash
aws s3api put-bucket-lifecycle-configuration --bucket codereview-ai-files-john-12345 --lifecycle-configuration file://lifecycle-config.json
```

**✅ Checkpoint**: Run `aws s3 ls` and see your bucket listed

---

## ⚡ Step 5: Enable Amazon Bedrock

### 5.1 Access Bedrock Service
1. In AWS Console, search for **"Bedrock"** 
2. Click on **"Amazon Bedrock"**
3. You might see a welcome screen - click **"Get started"**

### 5.2 Enable Model Access
1. In the left menu, click **"Model access"**
2. Click **"Request model access"** button
3. Find **"Claude 3 Haiku"** by Anthropic
4. Click **"Request access"** next to it
5. Fill out the use case form:
   - **Use case details**: "Code review and analysis for development projects"
   - **Industry**: Software & Technology
   - Click **"Next"**
6. Review and click **"Submit"**

### 5.3 Wait for Approval
- **Claude 3 Haiku** usually gets approved instantly
- Check the status - it should show **"Access granted"**
- If pending, wait 5-10 minutes and refresh

**✅ Checkpoint**: Claude 3 Haiku shows "Access granted" status

---

## 🔧 Step 6: Create Lambda Function

### 6.1 Create the Function
1. In AWS Console, search for **"Lambda"**
2. Click **"Create function"**
3. Choose **"Author from scratch"**
4. Function name: `codereview-ai-processor`
5. Runtime: **Python 3.11**
6. Architecture: **x86_64**
7. Click **"Create function"**

### 6.2 Set Up Function Code
1. In the code editor, replace the default code with:

```python
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Triggered when files are uploaded to S3
    Sends processing request to ECS backend
    """
    try:
        # Log the S3 event
        logger.info(f"Received S3 event: {json.dumps(event)}")
        
        # Extract bucket and object key from S3 event
        for record in event.get('Records', []):
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            
            logger.info(f"Processing file: {key} from bucket: {bucket}")
            
            # Here we would normally call ECS backend
            # For now, just log the event
            logger.info("File processing initiated successfully")
        
        return {
            'statusCode': 200,
            'body': json.dumps('File processing initiated')
        }
        
    except Exception as e:
        logger.error(f"Error processing S3 event: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
```

2. Click **"Deploy"** to save the function

### 6.3 Configure S3 Trigger
1. Click **"Add trigger"**
2. Select **"S3"**
3. Choose your bucket: `codereview-ai-files-john-12345`
4. Event type: **"All object create events"**
5. Prefix: `sessions/` (only trigger for files in sessions folder)
6. Click **"Add"**

### 6.4 Set IAM Permissions
1. Click on **"Configuration"** tab
2. Click **"Permissions"** on the left
3. Click on the execution role (blue link)
4. Click **"Add permissions"** → **"Attach policies"**
5. Search and attach:
   - `AmazonS3ReadOnlyAccess`
   - `AmazonBedrockFullAccess`
6. Click **"Add permissions"**

**✅ Checkpoint**: Lambda function shows "Active" status and S3 trigger is configured

---

## 🐳 Step 7: Set Up ECS Fargate (Backend)

### 7.1 Create ECS Cluster
1. Search for **"ECS"** in AWS Console
2. Click **"Create cluster"**
3. Cluster name: `codereview-ai-cluster`
4. Infrastructure: **AWS Fargate (serverless)**
5. Click **"Create"**

### 7.2 Create Task Definition
1. Click **"Task definitions"** in left menu
2. Click **"Create new task definition"**
3. Task definition family: `codereview-ai-backend`
4. Launch type: **AWS Fargate**
5. Operating system: **Linux/X86_64**
6. CPU: **0.25 vCPU**
7. Memory: **0.5 GB**

### 7.3 Container Configuration
1. In **Container definitions**:
   - Container name: `backend`
   - Image URI: `python:3.11-slim` (we'll update this later)
   - Port: `8000`
   - Protocol: `TCP`

2. **Environment variables**:
   - `AWS_DEFAULT_REGION`: `us-east-1`
   - `S3_BUCKET_NAME`: `codereview-ai-files-john-12345`

3. Click **"Create"**

### 7.4 Create Service
1. Go back to your cluster: `codereview-ai-cluster`
2. Click **"Create service"**
3. Launch type: **Fargate**
4. Task definition: `codereview-ai-backend`
5. Service name: `backend-service`
6. Number of tasks: **1**
7. **Networking**:
   - Create new VPC: Yes
   - Subnets: Select all available
   - Security group: Create new
   - Auto-assign public IP: **ENABLED**
8. Click **"Create service"**

**✅ Checkpoint**: ECS service shows "RUNNING" status (may take 5-10 minutes)

---

## 🔐 Step 8: Configure Environment Variables

### 8.1 Create Environment File
Create a `.env` file in your CodeReview AI project root:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_DEFAULT_REGION=us-east-1

# S3 Configuration
S3_BUCKET_NAME=codereview-ai-files-john-12345

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_REGION=us-east-1

# ECS Configuration (we'll fill these after deployment)
ECS_CLUSTER_NAME=codereview-ai-cluster
ECS_SERVICE_NAME=backend-service
ECS_TASK_DEFINITION=codereview-ai-backend

# Application Settings
NODE_ENV=production
```

### 8.2 Update Your Project Configuration
1. Replace `your_access_key_here` with your actual AWS Access Key ID
2. Replace `your_secret_key_here` with your actual AWS Secret Access Key
3. Replace `codereview-ai-files-john-12345` with your actual bucket name

**⚠️ SECURITY NOTE**: Never commit this `.env` file to version control!

---

## 🧪 Step 9: Test Your Setup

### 9.1 Test S3 Access
```bash
# Upload a test file
echo "console.log('test');" > test.js
aws s3 cp test.js s3://codereview-ai-files-john-12345/sessions/test/test.js

# Verify it was uploaded
aws s3 ls s3://codereview-ai-files-john-12345/sessions/test/

# Clean up
aws s3 rm s3://codereview-ai-files-john-12345/sessions/test/test.js
rm test.js
```

### 9.2 Test Bedrock Access
```bash
aws bedrock list-foundation-models --region us-east-1
```
You should see Claude models listed.

### 9.3 Check Lambda Logs
1. Go to **CloudWatch** in AWS Console
2. Click **"Logs"** → **"Log groups"**
3. Find `/aws/lambda/codereview-ai-processor`
4. Check recent log entries

**✅ Checkpoint**: All tests pass without errors

---

## 🚀 Step 10: Update Your Application

### 10.1 Enable Production Mode
In your CodeReview AI application, update the environment:

```bash
# In your terminal, in the project directory
export NODE_ENV=production
export AWS_ACCESS_KEY_ID=your_access_key_here
export AWS_SECRET_ACCESS_KEY=your_secret_key_here
export S3_BUCKET_NAME=codereview-ai-files-john-12345
```

### 10.2 Test the Full Flow
1. Start your application: `npm run dev`
2. Upload a code file through the web interface
3. Check that:
   - File appears in S3 bucket
   - Lambda function gets triggered (check CloudWatch logs)
   - Analysis results appear in your app

---

## 💰 Cost Management

### Expected Monthly Costs:
- **S3**: $1-3 (file storage and requests)
- **Lambda**: $0-1 (execution time)
- **ECS Fargate**: $5-15 (depending on usage)
- **Bedrock**: $2-10 (Claude API calls)

### Cost Optimization:
1. **S3 Lifecycle**: Files auto-delete after 7 days
2. **ECS**: Scales down when not in use
3. **Lambda**: Only runs when files are uploaded
4. **Bedrock**: Pay per API call only

### Monitoring Costs:
1. Go to **AWS Billing Dashboard**
2. Set up **Budget Alerts** for $20/month
3. Enable **Cost Explorer** to track spending

---

## 🆘 Troubleshooting

### Common Issues:

**"Access Denied" Errors:**
- Check your IAM permissions
- Verify AWS credentials are correct
- Ensure bucket name is exactly right

**Lambda Not Triggering:**
- Check S3 trigger configuration
- Verify files are uploaded to `sessions/` prefix
- Check CloudWatch logs for errors

**Bedrock "Model Not Available":**
- Ensure Claude 3 Haiku access is approved
- Check you're using the correct region (us-east-1)
- Wait 10-15 minutes after approval

**ECS Service Not Starting:**
- Check task definition configuration
- Verify security group allows inbound traffic
- Check CloudWatch logs for container errors

### Getting Help:
- Check AWS documentation for each service
- Review CloudWatch logs for detailed error messages
- AWS Support (if you have a support plan)

---

## ✅ Completion Checklist

- [ ] AWS account created and verified
- [ ] AWS CLI installed and configured
- [ ] IAM user created with proper permissions
- [ ] S3 bucket created with CORS and lifecycle policies
- [ ] Amazon Bedrock enabled with Claude 3 Haiku access
- [ ] Lambda function created and configured with S3 trigger
- [ ] ECS cluster and service running
- [ ] Environment variables configured in your application
- [ ] Test uploads working end-to-end
- [ ] Cost monitoring and budgets set up

**🎉 Congratulations!** Your CodeReview AI is now running on real AWS services!

---

## 📞 Need Help?

If you get stuck at any step:
1. **Double-check** you followed each step exactly
2. **Check the troubleshooting section** above
3. **Review AWS CloudWatch logs** for detailed error messages
4. **Contact me** with the specific error message and which step you're on

Remember: AWS setup can be tricky the first time, but you've got this! 💪
