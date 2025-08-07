#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

// This TypeScript file starts the Python FastAPI backend
// It's needed because the workflow expects server/index.ts

console.log('🚀 Starting Python FastAPI backend...');

const pythonScript = path.join(process.cwd(), 'main.py');

// Start Python FastAPI server
const pythonProcess = spawn('python3', [pythonScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

pythonProcess.on('error', (error) => {
  console.error('❌ Failed to start Python server:', error.message);
  // Try with 'python' if 'python3' fails
  console.log('🔄 Trying with "python" command...');
  const fallbackProcess = spawn('python', [pythonScript], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
  
  fallbackProcess.on('error', (fallbackError) => {
    console.error('❌ Failed to start Python server with fallback:', fallbackError.message);
    process.exit(1);
  });
  
  fallbackProcess.on('close', (code) => {
    console.log(`Python server exited with code ${code}`);
    process.exit(code || 0);
  });
});

pythonProcess.on('close', (code) => {
  console.log(`Python server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, stopping Python server...');
  pythonProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, stopping Python server...');
  pythonProcess.kill('SIGTERM');
});

// Keep the process alive
console.log('✅ Python backend bridge started successfully');