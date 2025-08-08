#!/bin/bash
# Deploy CodeReview AI code to EC2 instance
# Run this AFTER the EC2 instance is created and you have the Public IP

# Usage: ./deploy-code-to-instance.sh <PUBLIC_IP>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <PUBLIC_IP>"
    echo "Example: $0 54.123.45.67"
    exit 1
fi

PUBLIC_IP=$1
KEY_FILE="codereview-ai-key.pem"

echo "🚀 Deploying CodeReview AI to EC2 Instance"
echo "========================================="
echo "Target IP: $PUBLIC_IP"
echo ""

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ SSH key file not found: $KEY_FILE"
    echo "Make sure you ran the deploy-to-ec2.sh script first"
    exit 1
fi

echo "📦 Step 1: Building production bundle..."
npm run build

echo ""
echo "📤 Step 2: Creating deployment package..."
# Create a deployment tar file
tar -czf codereview-ai-deploy.tar.gz \
    main.py \
    server/ \
    dist/ \
    pyproject.toml \
    uv.lock \
    package.json

echo "   ✅ Created deployment package: codereview-ai-deploy.tar.gz"

echo ""
echo "🔄 Step 3: Uploading to EC2 instance..."
# Upload the package
scp -i $KEY_FILE -o StrictHostKeyChecking=no \
    codereview-ai-deploy.tar.gz \
    ec2-user@$PUBLIC_IP:/opt/codereview-ai/

echo "   ✅ Code uploaded to instance"

echo ""
echo "⚙️  Step 4: Installing and starting application..."
# SSH into instance and deploy
ssh -i $KEY_FILE -o StrictHostKeyChecking=no ec2-user@$PUBLIC_IP << 'EOFREMOTE'
cd /opt/codereview-ai

# Extract the code
tar -xzf codereview-ai-deploy.tar.gz

# Install Python dependencies using uv
if ! command -v uv &> /dev/null; then
    pip3.11 install uv
fi

# Install dependencies
uv sync --frozen

# Create environment file with AWS credentials
cat > .env << 'EOFENV'
# AWS Configuration (YOUR ACTUAL CREDENTIALS)
AWS_ACCESS_KEY_ID=AWS_API_KEY
AWS_SECRET_ACCESS_KEY=TphZYjJIiof1mPBU5BhoQGUwbq6EtwRbmP/P0ZrG
AWS_DEFAULT_REGION=us-east-1

# S3 Configuration
S3_BUCKET_NAME=codereview-ai-files-108782072033

# Bedrock Configuration
BEDROCK_MODEL_ID=us.anthropic.claude-3-7-sonnet-20250219-v1:0
BEDROCK_REGION=us-east-1

# Application Settings
ENVIRONMENT=production
USE_AWS_SERVICES=true
PORT=5000
NODE_ENV=production
EOFENV

# Set proper permissions
chmod 600 .env

# Start the service
sudo systemctl daemon-reload
sudo systemctl start codereview-ai
sudo systemctl status codereview-ai

echo ""
echo "✅ Application deployed and started!"
echo "🌐 Your CodeReview AI is now live at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5000"
EOFREMOTE

echo ""
echo "🎉 Deployment Complete!"
echo "========================================"
echo "🌐 Your public CodeReview AI website is now running!"
echo "📱 Access it at: http://$PUBLIC_IP:5000"
echo ""
echo "🔍 To check logs:"
echo "   ssh -i $KEY_FILE ec2-user@$PUBLIC_IP"
echo "   sudo journalctl -u codereview-ai -f"
echo ""
echo "🛠️  To restart the service:"
echo "   ssh -i $KEY_IP ec2-user@$PUBLIC_IP"
echo "   sudo systemctl restart codereview-ai"
echo ""

# Clean up
rm -f codereview-ai-deploy.tar.gz

echo "✅ Deployment script completed!"