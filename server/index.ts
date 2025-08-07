// Redirect to Python FastAPI server
import { spawn } from "child_process";

console.log("🚀 Starting CodeReview AI with FastAPI backend...");

const pythonProcess = spawn("python", ["main.py"], {
  stdio: "inherit",
  cwd: process.cwd().replace("/server", "")
});

pythonProcess.on("error", (error) => {
  console.error("Failed to start FastAPI server:", error);
  process.exit(1);
});

pythonProcess.on("exit", (code) => {
  console.log(`FastAPI server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle shutdown gracefully
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down...");
  pythonProcess.kill("SIGINT");
});

process.on("SIGTERM", () => {
  pythonProcess.kill("SIGTERM");
});