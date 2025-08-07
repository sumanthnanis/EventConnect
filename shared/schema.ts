import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const fileAnalysis = pgTable("file_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  s3Key: text("s3_key").notNull(),
  status: text("status").notNull().default("uploading"), // uploading, processing, completed, error
  analysisResult: jsonb("analysis_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const analysisSession = pgTable("analysis_session", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull().default("pending"), // pending, processing, completed, error
  totalFiles: integer("total_files").notNull().default(0),
  processedFiles: integer("processed_files").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertFileAnalysisSchema = createInsertSchema(fileAnalysis).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertAnalysisSessionSchema = createInsertSchema(analysisSession).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertFileAnalysis = z.infer<typeof insertFileAnalysisSchema>;
export type FileAnalysis = typeof fileAnalysis.$inferSelect;
export type InsertAnalysisSession = z.infer<typeof insertAnalysisSessionSchema>;
export type AnalysisSession = typeof analysisSession.$inferSelect;

// Frontend-only types for file upload
export const fileUploadSchema = z.object({
  files: z.array(z.instanceof(File)).min(1, "At least one file is required"),
  uploadType: z.enum(["single", "folder"]),
});

export type FileUploadData = z.infer<typeof fileUploadSchema>;

// API response types
export const analysisResultSchema = z.object({
  passedChecks: z.number(),
  warnings: z.number(),
  errors: z.number(),
  issues: z.array(z.object({
    type: z.enum(["error", "warning", "success", "suggestion"]),
    severity: z.enum(["low", "medium", "high", "critical"]),
    title: z.string(),
    description: z.string(),
    file: z.string(),
    line: z.number().optional(),
    code: z.string().optional(),
    suggestion: z.string().optional(),
  })),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
