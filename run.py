#!/usr/bin/env python3
"""
Startup script for CodeReview AI
FastAPI backend with JavaScript frontend
"""

import subprocess
import sys
import os

def main():
    """Start the application"""
    print("🚀 Starting CodeReview AI...")
    print("📝 FastAPI backend with JavaScript frontend")
    
    # Set environment
    os.environ['NODE_ENV'] = 'development'
    
    try:
        # Run the FastAPI server
        subprocess.run([sys.executable, 'main.py'], check=True)
    except KeyboardInterrupt:
        print("\n👋 Shutting down CodeReview AI...")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()