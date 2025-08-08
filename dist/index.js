// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  analysisSessions;
  fileAnalyses;
  constructor() {
    this.analysisSessions = /* @__PURE__ */ new Map();
    this.fileAnalyses = /* @__PURE__ */ new Map();
  }
  async createAnalysisSession(insertSession) {
    const id = randomUUID();
    const session = {
      id,
      status: insertSession.status || "pending",
      totalFiles: insertSession.totalFiles || 0,
      processedFiles: insertSession.processedFiles || 0,
      createdAt: /* @__PURE__ */ new Date(),
      completedAt: null
    };
    this.analysisSessions.set(id, session);
    return session;
  }
  async getAnalysisSession(id) {
    return this.analysisSessions.get(id);
  }
  async updateAnalysisSession(id, updates) {
    const session = this.analysisSessions.get(id);
    if (!session) return void 0;
    const updatedSession = { ...session, ...updates };
    if (updates.status === "completed" && !session.completedAt) {
      updatedSession.completedAt = /* @__PURE__ */ new Date();
    }
    this.analysisSessions.set(id, updatedSession);
    return updatedSession;
  }
  async createFileAnalysis(insertFile) {
    const id = randomUUID();
    const fileAnalysis = {
      id,
      sessionId: insertFile.sessionId,
      fileName: insertFile.fileName,
      fileSize: insertFile.fileSize,
      fileType: insertFile.fileType,
      s3Key: insertFile.s3Key,
      status: insertFile.status || "uploading",
      analysisResult: null,
      createdAt: /* @__PURE__ */ new Date(),
      completedAt: null
    };
    this.fileAnalyses.set(id, fileAnalysis);
    return fileAnalysis;
  }
  async getFileAnalysis(id) {
    return this.fileAnalyses.get(id);
  }
  async getFileAnalysisBySession(sessionId) {
    return Array.from(this.fileAnalyses.values()).filter(
      (file) => file.sessionId === sessionId
    );
  }
  async getFileAnalysisByS3Key(s3Key) {
    return Array.from(this.fileAnalyses.values()).find(
      (file) => file.s3Key === s3Key
    );
  }
  async updateFileAnalysis(id, updates) {
    const file = this.fileAnalyses.get(id);
    if (!file) return void 0;
    const updatedFile = { ...file, ...updates };
    if (updates.status === "completed" && !file.completedAt) {
      updatedFile.completedAt = /* @__PURE__ */ new Date();
    }
    this.fileAnalyses.set(id, updatedFile);
    return updatedFile;
  }
  async updateFileAnalysisByS3Key(s3Key, updates) {
    const file = await this.getFileAnalysisByS3Key(s3Key);
    if (!file) return void 0;
    return this.updateFileAnalysis(file.id, updates);
  }
};
var storage = new MemStorage();

// server/services/file-processor.ts
var FileProcessor = class {
  async processSession(sessionId) {
    try {
      console.log(`Starting processing for session: ${sessionId}`);
      const files = await storage.getFileAnalysisBySession(sessionId);
      if (files.length === 0) {
        throw new Error("No files found for session");
      }
      await storage.updateAnalysisSession(sessionId, {
        status: "processing"
      });
      for (const file of files) {
        await this.processFile(file.id);
      }
      const mockAnalysisResult = this.generateMockAnalysis(files.map((f) => f.fileName));
      const issuesPerFile = this.distributeIssuesAcrossFiles(mockAnalysisResult, files.map((f) => f.fileName));
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileResult = issuesPerFile[file.fileName] || {
          passedChecks: 0,
          warnings: 0,
          errors: 0,
          issues: []
        };
        await storage.updateFileAnalysis(file.id, {
          status: "completed",
          analysisResult: fileResult
        });
      }
      await storage.updateAnalysisSession(sessionId, {
        status: "completed",
        processedFiles: files.length
      });
      console.log(`Session ${sessionId} processing completed successfully`);
    } catch (error) {
      console.error(`Error processing session ${sessionId}:`, error);
      await storage.updateAnalysisSession(sessionId, {
        status: "error"
      });
      throw error;
    }
  }
  async processFile(fileId) {
    await storage.updateFileAnalysis(fileId, {
      status: "processing"
    });
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    await storage.updateFileAnalysis(fileId, {
      status: "analyzing"
    });
  }
  generateMockAnalysis(fileNames) {
    const issues = [
      {
        type: "warning",
        severity: "medium",
        title: "Missing error handling",
        description: "Function does not handle potential errors from async operations",
        file: fileNames[0],
        line: 15,
        code: "const result = await apiCall();",
        suggestion: "try { const result = await apiCall(); } catch (error) { console.error(error); }"
      },
      {
        type: "suggestion",
        severity: "low",
        title: "Consider using const instead of let",
        description: "Variable is never reassigned, consider using const for better immutability",
        file: fileNames[0],
        line: 8,
        code: "let userName = 'default';",
        suggestion: "const userName = 'default';"
      },
      {
        type: "success",
        severity: "low",
        title: "Good use of TypeScript interfaces",
        description: "Proper type definitions improve code maintainability",
        file: fileNames[0]
      }
    ];
    if (fileNames.length > 1) {
      issues.push({
        type: "error",
        severity: "high",
        title: "Unused import statement",
        description: "Import is declared but never used in the module",
        file: fileNames[1],
        line: 3,
        code: "import { unusedFunction } from './utils';",
        suggestion: "Remove the unused import or use the function"
      });
    }
    return {
      passedChecks: 8,
      warnings: 2,
      errors: fileNames.length > 1 ? 1 : 0,
      issues
    };
  }
  distributeIssuesAcrossFiles(analysisResult, fileNames) {
    const result = {};
    fileNames.forEach((fileName) => {
      result[fileName] = {
        passedChecks: 0,
        warnings: 0,
        errors: 0,
        issues: []
      };
    });
    if (analysisResult.issues) {
      analysisResult.issues.forEach((issue) => {
        const targetFile = issue.file || fileNames[0];
        if (result[targetFile]) {
          result[targetFile].issues.push(issue);
          switch (issue.type) {
            case "error":
              result[targetFile].errors++;
              break;
            case "warning":
              result[targetFile].warnings++;
              break;
            case "success":
              result[targetFile].passedChecks++;
              break;
          }
        }
      });
    }
    const totalFiles = fileNames.length;
    const passedPerFile = Math.floor((analysisResult.passedChecks || 0) / totalFiles);
    fileNames.forEach((fileName) => {
      if (result[fileName].passedChecks === 0) {
        result[fileName].passedChecks = passedPerFile;
      }
    });
    return result;
  }
};
var fileProcessor = new FileProcessor();

// server/routes.ts
import multer from "multer";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    // 10MB limit
    files: 6
    // Maximum 6 files
  }
});
async function registerRoutes(app2) {
  app2.post("/api/upload", upload.array("files"), async (req, res) => {
    try {
      const files = req.files;
      const uploadType = req.body.uploadType;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      console.log(`Upload request - Type: ${uploadType}, Files received:`, files.map((f) => ({
        name: f.originalname,
        size: f.size,
        type: f.mimetype
      })));
      const validExtensions = [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".go"];
      const invalidFiles = files.filter(
        (file) => !validExtensions.some((ext) => file.originalname.toLowerCase().endsWith(ext))
      );
      if (invalidFiles.length > 0) {
        console.log("Invalid files found:", invalidFiles.map((f) => f.originalname));
        return res.status(400).json({
          message: `Invalid file types found: ${invalidFiles.map((f) => f.originalname).join(", ")}. Only code files (.js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .go) are allowed.`
        });
      }
      const session = await storage.createAnalysisSession({
        status: "pending",
        totalFiles: files.length,
        processedFiles: 0
      });
      const uploadPromises = files.map(async (file) => {
        const s3Key = `sessions/${session.id}/${Date.now()}-${file.originalname}`;
        return storage.createFileAnalysis({
          sessionId: session.id,
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype || "application/octet-stream",
          s3Key,
          status: "uploading"
        });
      });
      await Promise.all(uploadPromises);
      await storage.updateAnalysisSession(session.id, {
        status: "processing"
      });
      fileProcessor.processSession(session.id).catch(console.error);
      res.json({
        sessionId: session.id,
        message: "Files uploaded successfully"
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        message: "Upload failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/analysis/status/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const session = await storage.getAnalysisSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const files = await storage.getFileAnalysisBySession(sessionId);
      const uploadCompleted = files.every((f) => f.status !== "uploading");
      const lambdaCompleted = files.every((f) => ["processing", "completed"].includes(f.status));
      const ecsCompleted = files.every((f) => ["analyzing", "completed"].includes(f.status));
      const bedrockCompleted = session.status === "completed";
      const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
      res.json({
        status: session.status,
        totalFiles: session.totalFiles,
        processedFiles: session.processedFiles,
        totalSize,
        uploadCompleted,
        lambdaCompleted,
        ecsCompleted,
        bedrockCompleted,
        uploadTime: uploadCompleted ? 1.2 : null
      });
    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({
        message: "Failed to get status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/analysis/results/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const session = await storage.getAnalysisSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.status !== "completed") {
        return res.status(400).json({ message: "Analysis not completed yet" });
      }
      const files = await storage.getFileAnalysisBySession(sessionId);
      let passedChecks = 0;
      let warnings = 0;
      let errors = 0;
      const allIssues = [];
      files.forEach((file) => {
        if (file.analysisResult) {
          const result = file.analysisResult;
          passedChecks += result.passedChecks || 0;
          warnings += result.warnings || 0;
          errors += result.errors || 0;
          if (result.issues) {
            allIssues.push(...result.issues);
          }
        }
      });
      res.json({
        passedChecks,
        warnings,
        errors,
        issues: allIssues
      });
    } catch (error) {
      console.error("Results fetch error:", error);
      res.status(500).json({
        message: "Failed to get results",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/webhook/process", async (req, res) => {
    try {
      const { sessionId, s3Key } = req.body;
      if (!sessionId || !s3Key) {
        return res.status(400).json({ message: "Missing sessionId or s3Key" });
      }
      const file = await storage.getFileAnalysisByS3Key(s3Key);
      if (file) {
        await storage.updateFileAnalysis(file.id, {
          status: "processing"
        });
      }
      res.json({ message: "Processing triggered" });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({
        message: "Webhook failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
