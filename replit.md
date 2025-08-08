# CodeReview AI - Intelligent Code Analysis Platform

## Overview

CodeReview AI is an intelligent code analysis platform that leverages Amazon Bedrock's AI capabilities to provide comprehensive code reviews and feedback. The application allows users to upload individual files or folders containing interdependent code files, which are then processed through AWS services to generate detailed analysis reports including code quality assessments, structural improvements, and best practice recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **CRITICAL: Fixed all major gaps in AWS setup guide** (August 8, 2025)
- **Fixed missing S3 event notification setup** - Users were only running permission command, missing actual trigger
- **Added missing Step 3** - Bedrock setup was completely missing from sequence
- **Fixed port inconsistencies** - Guide showed 8000, app uses 5000
- **Added VPC/subnet configuration** - ECS deployment was missing network setup
- **Added security group creation** - Required for ECS tasks to accept traffic
- **Fixed Claude model versions** - Standardized on Claude 3 Haiku (more cost-effective)
- **Added frontend build step** - Production deployment was missing React build
- **Added placeholder replacement instructions** - Users weren't replacing bucket names/account IDs
- **Added CloudWatch log group creation** - Required before ECS task definition
- **Added ECS service creation** - Tasks weren't being deployed as services
- **Removed duplicate sections** - Guide had conflicting duplicate content
- All steps now properly sequenced with correct dependencies and checkpoints

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **File Handling**: Native HTML5 file upload with drag-and-drop support

### Backend Architecture
- **Runtime**: Python 3.11 with FastAPI framework
- **Language**: Python with type hints and Pydantic models
- **File Processing**: FastAPI's multipart form handling for file uploads
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development
- **API Design**: RESTful endpoints with structured error handling and request logging
- **Background Tasks**: Async background processing for file analysis
- **Server**: Uvicorn ASGI server with auto-reload in development

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Connection**: Neon Database serverless PostgreSQL for cloud deployment
- **Session Management**: PostgreSQL-backed session storage using connect-pg-simple
- **File Storage**: AWS S3 for temporary file storage with lifecycle policies

### Database Schema
- **Analysis Sessions**: Track upload sessions with status progression and file counts
- **File Analysis**: Individual file records with S3 references and analysis results
- **Relationships**: Session-to-files one-to-many relationship for organized analysis tracking

### Authentication and Authorization
- **Session-based**: Traditional session-based authentication with PostgreSQL storage
- **AWS Credentials**: Environment-based AWS service authentication
- **File Access**: S3 pre-signed URLs for secure file uploads and retrieval

## External Dependencies

### AWS Services
- **S3 Bucket**: File storage with CORS configuration and lifecycle management
- **Lambda Functions**: Event-driven file processing triggered by S3 uploads
- **ECS Fargate**: Containerized FastAPI backend for scalable processing
- **Amazon Bedrock**: AI/ML service for code analysis using Claude or Titan models
- **IAM Roles**: Service-to-service authentication and authorization

### Third-party Libraries
- **UI Framework**: React ecosystem with modern hooks and functional components
- **Form Handling**: React Hook Form with Zod schema validation
- **Database**: Drizzle ORM with PostgreSQL driver for type-safe database operations (frontend schema)
- **Backend Framework**: FastAPI with Pydantic for data validation and async request handling
- **AWS SDK**: Boto3 for S3 operations and Bedrock integration
- **Build Tools**: Vite for fast development and optimized production builds
- **Server**: Uvicorn ASGI server for high-performance async Python web serving

### Development Tools
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **ESLint/Prettier**: Code quality and formatting (configured via components.json)
- **Replit Integration**: Development environment optimization with cartographer plugin