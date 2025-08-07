import { storage } from "../storage";
import { awsService } from "./aws";

class FileProcessor {
  async processSession(sessionId: string): Promise<void> {
    try {
      console.log(`Starting processing for session: ${sessionId}`);
      
      // Get all files for the session
      const files = await storage.getFileAnalysisBySession(sessionId);
      
      if (files.length === 0) {
        throw new Error('No files found for session');
      }

      // Update session status
      await storage.updateAnalysisSession(sessionId, { 
        status: 'processing' 
      });

      // Process each file
      for (const file of files) {
        await this.processFile(file.id);
      }

      // For development, simulate file analysis instead of using AWS
      const mockAnalysisResult = this.generateMockAnalysis(files.map(f => f.fileName));

      // Distribute analysis results across files
      const issuesPerFile = this.distributeIssuesAcrossFiles(mockAnalysisResult, files.map(f => f.fileName));

      // Update each file with its portion of the analysis
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileResult = issuesPerFile[file.fileName] || {
          passedChecks: 0,
          warnings: 0,
          errors: 0,
          issues: []
        };

        await storage.updateFileAnalysis(file.id, {
          status: 'completed',
          analysisResult: fileResult
        });
      }

      // Update session as completed
      await storage.updateAnalysisSession(sessionId, { 
        status: 'completed',
        processedFiles: files.length
      });

      console.log(`Session ${sessionId} processing completed successfully`);

    } catch (error) {
      console.error(`Error processing session ${sessionId}:`, error);
      
      // Update session with error status
      await storage.updateAnalysisSession(sessionId, { 
        status: 'error' 
      });

      throw error;
    }
  }

  private async processFile(fileId: string): Promise<void> {
    // Update file status to processing
    await storage.updateFileAnalysis(fileId, {
      status: 'processing'
    });

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update to analyzing status
    await storage.updateFileAnalysis(fileId, {
      status: 'analyzing'
    });
  }

  private generateMockAnalysis(fileNames: string[]): any {
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

  private distributeIssuesAcrossFiles(analysisResult: any, fileNames: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    // Initialize each file with empty results
    fileNames.forEach(fileName => {
      result[fileName] = {
        passedChecks: 0,
        warnings: 0,
        errors: 0,
        issues: []
      };
    });

    // Distribute issues based on file names mentioned in the issues
    if (analysisResult.issues) {
      analysisResult.issues.forEach((issue: any) => {
        const targetFile = issue.file || fileNames[0]; // Default to first file if not specified
        
        if (result[targetFile]) {
          result[targetFile].issues.push(issue);
          
          // Update counters based on issue type
          switch (issue.type) {
            case 'error':
              result[targetFile].errors++;
              break;
            case 'warning':
              result[targetFile].warnings++;
              break;
            case 'success':
              result[targetFile].passedChecks++;
              break;
          }
        }
      });
    }

    // Distribute overall metrics
    const totalFiles = fileNames.length;
    const passedPerFile = Math.floor((analysisResult.passedChecks || 0) / totalFiles);
    
    fileNames.forEach(fileName => {
      if (result[fileName].passedChecks === 0) {
        result[fileName].passedChecks = passedPerFile;
      }
    });

    return result;
  }
}

export const fileProcessor = new FileProcessor();