import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertFileAnalysisSchema, insertAnalysisSessionSchema } from "@shared/schema";
import { awsService } from "./services/aws";
import { fileProcessor } from "./services/file-processor";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 6 // Maximum 6 files
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload endpoint
  app.post("/api/upload", upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const uploadType = req.body.uploadType as 'single' | 'folder';

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Validate file types
      const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go'];
      const invalidFiles = files.filter(file => 
        !validExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext))
      );

      if (invalidFiles.length > 0) {
        return res.status(400).json({ 
          message: "Invalid file types. Only code files are allowed." 
        });
      }

      // Create analysis session
      const session = await storage.createAnalysisSession({
        status: 'pending',
        totalFiles: files.length,
        processedFiles: 0
      });

      // Upload files to S3 and create file analysis records
      const uploadPromises = files.map(async (file) => {
        const s3Key = await awsService.uploadFileToS3(file, session.id);
        
        return storage.createFileAnalysis({
          sessionId: session.id,
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype || 'application/octet-stream',
          s3Key,
          status: 'uploading'
        });
      });

      await Promise.all(uploadPromises);

      // Update session status
      await storage.updateAnalysisSession(session.id, { 
        status: 'processing' 
      });

      // Trigger processing asynchronously
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

  // Get analysis status
  app.get("/api/analysis/status/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      const session = await storage.getAnalysisSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const files = await storage.getFileAnalysisBySession(sessionId);
      
      // Calculate processing steps
      const uploadCompleted = files.every(f => f.status !== 'uploading');
      const lambdaCompleted = files.every(f => ['processing', 'completed'].includes(f.status));
      const ecsCompleted = files.every(f => ['analyzing', 'completed'].includes(f.status));
      const bedrockCompleted = session.status === 'completed';

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

  // Get analysis results
  app.get("/api/analysis/results/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      const session = await storage.getAnalysisSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.status !== 'completed') {
        return res.status(400).json({ message: "Analysis not completed yet" });
      }

      const files = await storage.getFileAnalysisBySession(sessionId);
      
      // Aggregate results from all files
      let passedChecks = 0;
      let warnings = 0;
      let errors = 0;
      const allIssues: any[] = [];

      files.forEach(file => {
        if (file.analysisResult) {
          const result = file.analysisResult as any;
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

  // Webhook for AWS Lambda to trigger processing
  app.post("/api/webhook/process", async (req, res) => {
    try {
      const { sessionId, s3Key } = req.body;
      
      if (!sessionId || !s3Key) {
        return res.status(400).json({ message: "Missing sessionId or s3Key" });
      }

      // This would be called by Lambda function after S3 upload
      // Update file status and potentially trigger further processing
      await storage.updateFileAnalysisByS3Key(s3Key, {
        status: 'processing'
      });

      res.json({ message: "Processing triggered" });

    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ 
        message: "Webhook failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
