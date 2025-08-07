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

      // Download all file contents from S3
      const fileContents: string[] = [];
      const fileNames: string[] = [];

      for (const file of files) {
        try {
          const content = await awsService.getFileFromS3(file.s3Key);
          fileContents.push(content);
          fileNames.push(file.fileName);
        } catch (error) {
          console.error(`Failed to download file ${file.fileName}:`, error);
          fileContents.push('// File could not be read');
          fileNames.push(file.fileName);
        }
      }

      // Analyze with Bedrock
      console.log(`Analyzing ${files.length} files with Bedrock...`);
      const analysisResult = await awsService.analyzeCodeWithBedrock(fileContents, fileNames);

      // Distribute analysis results across files
      const issuesPerFile = this.distributeIssuesAcrossFiles(analysisResult, fileNames);

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

      // Clean up S3 files after processing (optional)
      // await this.cleanupS3Files(files);

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

  private async cleanupS3Files(files: any[]): Promise<void> {
    try {
      const deletePromises = files.map(file => 
        awsService.deleteFileFromS3(file.s3Key).catch(error => 
          console.error(`Failed to delete ${file.s3Key}:`, error)
        )
      );
      
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${files.length} files from S3`);
    } catch (error) {
      console.error('Error during S3 cleanup:', error);
    }
  }
}

export const fileProcessor = new FileProcessor();
