# AWS Configuration Guide for CodeReview AI

This guide provides step-by-step instructions to configure AWS services for the CodeReview AI application.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed (for ECS deployment)
- Node.js and npm installed

## 1. S3 Bucket Setup

### Create S3 Bucket
```bash
aws s3 mb s3://codereview-ai-files-[UNIQUE-SUFFIX] --region us-east-1
