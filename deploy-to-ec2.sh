#!/bin/bash
# CodeReview AI - EC2 Deployment Script
# Deploy your working CodeReview AI to a public EC2 instance

set -e  # Exit on any error

echo "🚀 CodeReview AI - EC2 Public Deployment"
echo "========================================"

# Configuration
INSTANCE_TYPE="t3.medium"  # Good for moderate traffic
AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2023
KEY_NAME="codereview-ai-key"
SECURITY_GROUP="codereview-ai-public-sg"
REGION="us-east-1"

echo "📋 Deployment Configuration:"
echo "   Instance Type: $INSTANCE_TYPE"
echo "   Region: $REGION" 
echo "   Key Name: $KEY_NAME"
echo ""

# Step 1: Create Key Pair (if it doesn't exist)
echo "🔐 Step 1: Creating SSH Key Pair..."
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION &>/dev/null; then
    aws ec2 create-key-pair \
        --key-name $KEY_NAME \
        --region $REGION \
        --query 'KeyMaterial' \
        --output text > ${KEY_NAME}.pem
    
    chmod 400 ${KEY_NAME}.pem
    echo "   ✅ Created new key pair: ${KEY_NAME}.pem"
    echo "   ⚠️  SAVE THIS FILE! You'll need it to SSH into your instance"
else
    echo "   ✅ Key pair already exists: $KEY_NAME"
fi

# Step 2: Create Security Group
echo ""
echo "🛡️  Step 2: Creating Security Group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name $SECURITY_GROUP \
    --description "Security group for CodeReview AI public website" \
    --region $REGION \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
        --group-names $SECURITY_GROUP \
        --region $REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text)

echo "   ✅ Security Group ID: $SG_ID"

# Configure security group rules
echo "   🔧 Configuring security rules..."

# SSH access (port 22)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "   SSH rule already exists"

# HTTP access (port 80)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "   HTTP rule already exists"

# HTTPS access (port 443)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "   HTTPS rule already exists"

# CodeReview AI app (port 5000)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5000 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "   App port rule already exists"

echo "   ✅ Security group configured for public access"

# Step 3: Create User Data Script
echo ""
echo "📜 Step 3: Creating instance startup script..."
cat > user-data.sh << 'EOF'
#!/bin/bash
# Startup script for CodeReview AI EC2 instance

# Update system
dnf update -y

# Install Node.js 20
dnf install -y nodejs npm

# Install Python 3.11 and pip
dnf install -y python3.11 python3.11-pip

# Install Git
dnf install -y git

# Install Docker (for potential future use)
dnf install -y docker
systemctl start docker
systemctl enable docker

# Create app directory
mkdir -p /home/ec2-user/EventConnect
cd /home/ec2-user/EventConnect

# Create systemd service file
cat > /etc/systemd/system/codereview-ai.service << 'EOFSERVICE'
[Unit]
Description=CodeReview AI Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/EventConnect
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/python3.11 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOFSERVICE

# Set ownership
chown -R ec2-user:ec2-user /home/ec2-user/EventConnect

# Enable service (will start after code deployment)
systemctl enable codereview-ai

echo "✅ EC2 instance setup completed" > /var/log/setup.log
EOF

echo "   ✅ User data script created"

# Step 4: Launch EC2 Instance
echo ""
echo "🚀 Step 4: Launching EC2 Instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --user-data file://user-data.sh \
    --region $REGION \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=CodeReview-AI-Public}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "   ✅ Instance launched: $INSTANCE_ID"
echo "   ⏳ Waiting for instance to be running..."

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "🎉 EC2 Instance Ready!"
echo "========================================"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
echo "   SSH Command: ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo ""
echo "🔧 Next Steps:"
echo "   1. Wait 3-5 minutes for the instance to finish setup"
echo "   2. SSH into the instance and deploy your code"
echo "   3. Your app will be available at: http://$PUBLIC_IP:5000"
echo ""
echo "📱 Quick SSH and Deploy:"
echo "   ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo ""

# Clean up temp files
rm -f user-data.sh

echo "✅ Deployment script completed!"
echo "💡 Run the deployment commands below to finish setup"