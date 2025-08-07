#!/usr/bin/env python3

import os
import uvicorn

# Set environment variables
os.environ.setdefault('NODE_ENV', 'development')

if __name__ == "__main__":
    # Import the FastAPI app
    from main import app
    
    # Get port from environment variable, default to 5000
    port = int(os.environ.get('PORT', 5000))
    
    # Run with uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=os.environ.get('NODE_ENV') == 'development',
        access_log=True
    )