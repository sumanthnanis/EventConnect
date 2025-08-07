#!/bin/bash

# Independent Server Startup Script
echo "🚀 Starting CodeReview AI Server (Independent Mode)"
echo "📁 Serving frontend from: dist/public/"
echo "🔌 API endpoints: /api/*"
echo "🌐 Access at: http://0.0.0.0:5000"
echo ""

# Set development environment
export NODE_ENV=development

# Start Python FastAPI server
python main.py