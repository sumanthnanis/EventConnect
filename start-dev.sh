#!/bin/bash
# Start the FastAPI backend server and Vite frontend server

echo "Starting CodeReview AI with FastAPI backend and JavaScript frontend..."

# Start FastAPI backend on port 8000
echo "Starting FastAPI backend server..."
python main.py &
FASTAPI_PID=$!

# Wait a moment for backend to start
sleep 3

# Test backend health
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ FastAPI backend is running on port 5000"
else
    echo "❌ FastAPI backend failed to start"
    exit 1
fi

echo "🚀 CodeReview AI is ready!"
echo "📝 Upload code files to test the functionality"

# Keep the script running
wait $FASTAPI_PID