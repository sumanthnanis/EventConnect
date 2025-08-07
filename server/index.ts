// Simple FastAPI launcher
import { exec } from "child_process";

console.log("🚀 Starting CodeReview AI FastAPI server directly...");

// Execute Python directly
const python = exec("python main.py", {
  cwd: process.cwd().replace("/server", "")
});

python.stdout?.on('data', (data) => {
  process.stdout.write(data);
});

python.stderr?.on('data', (data) => {
  process.stderr.write(data);
});

python.on('error', (error) => {
  console.error('Failed to start FastAPI:', error);
  process.exit(1);
});

python.on('exit', (code) => {
  process.exit(code || 0);
});