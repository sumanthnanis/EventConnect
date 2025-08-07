import { spawn } from 'child_process';
import path from 'path';

// Bridge script to run the Python FastAPI server
// This allows the Node.js workflow to start the Python backend

const pythonScript = path.join(process.cwd(), 'main.py');

console.log('Starting Python FastAPI server...');

const pythonProcess = spawn('python', [pythonScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

pythonProcess.on('error', (error) => {
  console.error('Failed to start Python server:', error);
  process.exit(1);
});

pythonProcess.on('close', (code) => {
  console.log(`Python server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Received SIGINT, terminating Python server...');
  pythonProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, terminating Python server...');
  pythonProcess.kill('SIGTERM');
});