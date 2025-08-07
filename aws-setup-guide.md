# AWS Configuration Guide for CodeReview AI

This guide provides step-by-step instructions to configure AWS services for the CodeReview AI application.

## Tech Stack Summary

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **S3 Bucket** | Temporary file storage | CORS enabled, lifecycle policies for auto-cleanup |
| **AWS Lambda** | File processing trigger | Triggered by S3 uploads, calls ECS backend |
| **ECS Fargate** | FastAPI backend host | Runs containerized Python backend for analysis |
| **Amazon Bedrock** | AI code analysis | Claude/Titan models for intelligent code review |
| **IAM Roles** | Service permissions | Cross-service authentication and authorization |
| **CloudWatch** | Monitoring & logs | Error tracking and performance monitoring |

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed (for ECS deployment)
- Node.js and npm installed

## 1. S3 Bucket Setup

### Create S3 Bucket
```bash
aws s3 mb s3://codereview-ai-files-[UNIQUE-SUFFIX] --region us-east-1
