import express from "express";
import path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "child_process";
import { existsSync } from "fs";

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_PORT = process.env.PYTHON_PORT || 8000;

// Start Python FastAPI server
let pythonProcess: any = null;

function startPythonServer() {
  console.log("Starting Python FastAPI server...");
  
  pythonProcess = spawn("python", ["main.py"], {
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, PORT: PYTHON_PORT.toString() }
  });
  
  pythonProcess.on("error", (error: Error) => {
    console.error("Failed to start Python server:", error);
  });
  
  pythonProcess.on("exit", (code: number) => {
    if (code !== 0) {
      console.log(`Python server exited with code ${code}`);
    }
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down servers...");
  if (pythonProcess) {
    pythonProcess.kill("SIGINT");
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down servers...");
  if (pythonProcess) {
    pythonProcess.kill("SIGTERM");
  }
  process.exit(0);
});

// Start Python server
startPythonServer();

// Proxy API requests to Python FastAPI server
app.use(
  "/api",
  createProxyMiddleware({
    target: `http://127.0.0.1:${PYTHON_PORT}`,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    onError: (err, req, res) => {
      console.error("Proxy error:", err.message);
      res.writeHead(500, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({ 
        message: "API server unavailable. Please wait for the Python server to start." 
      }));
    }
  })
);

// Serve React frontend static files
const frontendPath = path.join(process.cwd(), "dist", "public");

// Check if built frontend exists
if (!existsSync(frontendPath)) {
  console.warn("Frontend not built. Please run 'vite build' first.");
}

app.use(express.static(frontendPath));

// Fallback to serve React app for client-side routing
app.get("*", (req, res) => {
  const indexPath = path.join(frontendPath, "index.html");
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend not found. Please run 'vite build' first.");
  }
});

// Start the Express server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Frontend: http://0.0.0.0:${PORT}`);
  console.log(`🔌 API: http://0.0.0.0:${PORT}/api`);
});