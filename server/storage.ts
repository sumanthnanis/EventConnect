import { 
  type FileAnalysis, 
  type InsertFileAnalysis, 
  type AnalysisSession, 
  type InsertAnalysisSession 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Analysis Session methods
  createAnalysisSession(session: InsertAnalysisSession): Promise<AnalysisSession>;
  getAnalysisSession(id: string): Promise<AnalysisSession | undefined>;
  updateAnalysisSession(id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession | undefined>;
  
  // File Analysis methods
  createFileAnalysis(file: InsertFileAnalysis): Promise<FileAnalysis>;
  getFileAnalysis(id: string): Promise<FileAnalysis | undefined>;
  getFileAnalysisBySession(sessionId: string): Promise<FileAnalysis[]>;
  getFileAnalysisByS3Key(s3Key: string): Promise<FileAnalysis | undefined>;
  updateFileAnalysis(id: string, updates: Partial<FileAnalysis>): Promise<FileAnalysis | undefined>;
  updateFileAnalysisByS3Key(s3Key: string, updates: Partial<FileAnalysis>): Promise<FileAnalysis | undefined>;
}

export class MemStorage implements IStorage {
  private analysisSessions: Map<string, AnalysisSession>;
  private fileAnalyses: Map<string, FileAnalysis>;

  constructor() {
    this.analysisSessions = new Map();
    this.fileAnalyses = new Map();
  }

  async createAnalysisSession(insertSession: InsertAnalysisSession): Promise<AnalysisSession> {
    const id = randomUUID();
    const session: AnalysisSession = {
      id,
      status: insertSession.status || 'pending',
      totalFiles: insertSession.totalFiles || 0,
      processedFiles: insertSession.processedFiles || 0,
      createdAt: new Date(),
      completedAt: null
    };
    this.analysisSessions.set(id, session);
    return session;
  }

  async getAnalysisSession(id: string): Promise<AnalysisSession | undefined> {
    return this.analysisSessions.get(id);
  }

  async updateAnalysisSession(id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession | undefined> {
    const session = this.analysisSessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    if (updates.status === 'completed' && !session.completedAt) {
      updatedSession.completedAt = new Date();
    }
    
    this.analysisSessions.set(id, updatedSession);
    return updatedSession;
  }

  async createFileAnalysis(insertFile: InsertFileAnalysis): Promise<FileAnalysis> {
    const id = randomUUID();
    const fileAnalysis: FileAnalysis = {
      id,
      sessionId: insertFile.sessionId,
      fileName: insertFile.fileName,
      fileSize: insertFile.fileSize,
      fileType: insertFile.fileType,
      s3Key: insertFile.s3Key,
      status: insertFile.status || 'uploading',
      analysisResult: null,
      createdAt: new Date(),
      completedAt: null
    };
    this.fileAnalyses.set(id, fileAnalysis);
    return fileAnalysis;
  }

  async getFileAnalysis(id: string): Promise<FileAnalysis | undefined> {
    return this.fileAnalyses.get(id);
  }

  async getFileAnalysisBySession(sessionId: string): Promise<FileAnalysis[]> {
    return Array.from(this.fileAnalyses.values()).filter(
      file => file.sessionId === sessionId
    );
  }

  async getFileAnalysisByS3Key(s3Key: string): Promise<FileAnalysis | undefined> {
    return Array.from(this.fileAnalyses.values()).find(
      file => file.s3Key === s3Key
    );
  }

  async updateFileAnalysis(id: string, updates: Partial<FileAnalysis>): Promise<FileAnalysis | undefined> {
    const file = this.fileAnalyses.get(id);
    if (!file) return undefined;

    const updatedFile = { ...file, ...updates };
    if (updates.status === 'completed' && !file.completedAt) {
      updatedFile.completedAt = new Date();
    }
    
    this.fileAnalyses.set(id, updatedFile);
    return updatedFile;
  }

  async updateFileAnalysisByS3Key(s3Key: string, updates: Partial<FileAnalysis>): Promise<FileAnalysis | undefined> {
    const file = await this.getFileAnalysisByS3Key(s3Key);
    if (!file) return undefined;

    return this.updateFileAnalysis(file.id, updates);
  }
}

export const storage = new MemStorage();
