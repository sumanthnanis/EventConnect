import AWS from 'aws-sdk';

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const bedrock = new AWS.BedrockRuntime({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'codereview-ai-files';

class AwsService {
  async uploadFileToS3(file: Express.Multer.File, sessionId: string): Promise<string> {
    const key = `sessions/${sessionId}/${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        sessionId,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString()
      }
    };

    try {
      await s3.upload(params).promise();
      return key;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  async getFileFromS3(s3Key: string): Promise<string> {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };

    try {
      const result = await s3.getObject(params).promise();
      return result.Body?.toString('utf-8') || '';
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error('Failed to download file from S3');
    }
  }

  async deleteFileFromS3(s3Key: string): Promise<void> {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };

    try {
      await s3.deleteObject(params).promise();
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  async analyzeCodeWithBedrock(fileContents: string[], fileNames: string[]): Promise<any> {
    const prompt = this.buildAnalysisPrompt(fileContents, fileNames);
    
    const params = {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: '*/*',
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    };

    try {
      const response = await bedrock.invokeModel(params).promise();
      const responseBody = JSON.parse(response.body.toString());
      
      // Parse the analysis result from Claude's response
      return this.parseAnalysisResult(responseBody.content[0].text);
    } catch (error) {
      console.error('Bedrock analysis error:', error);
      throw new Error('Failed to analyze code with Bedrock');
    }
  }

  private buildAnalysisPrompt(fileContents: string[], fileNames: string[]): string {
    const files = fileContents.map((content, index) => 
      `--- File: ${fileNames[index]} ---\n${content}\n`
    ).join('\n');

    return `
You are an expert code reviewer. Analyze the following code files and provide a comprehensive review. Focus on:

1. Code structure and architecture
2. Missing error handling
3. Unused imports or variables
4. Performance optimizations
5. Security vulnerabilities
6. Best practices adherence

Please respond with a JSON object in this exact format:
{
  "passedChecks": number,
  "warnings": number,
  "errors": number,
  "issues": [
    {
      "type": "error|warning|success|suggestion",
      "severity": "low|medium|high|critical",
      "title": "Issue title",
      "description": "Detailed description",
      "file": "filename",
      "line": number (optional),
      "code": "problematic code snippet (optional)",
      "suggestion": "suggested fix (optional)"
    }
  ]
}

Code Files:
${files}

Please provide a thorough analysis and return only the JSON response.
    `;
  }

  private parseAnalysisResult(claudeResponse: string): any {
    try {
      // Extract JSON from Claude's response
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback if JSON parsing fails
      return {
        passedChecks: 0,
        warnings: 1,
        errors: 1,
        issues: [
          {
            type: "error",
            severity: "medium",
            title: "Analysis Parsing Error",
            description: "Failed to parse the analysis result from AI service",
            file: "system",
            code: null,
            suggestion: "Please try the analysis again"
          }
        ]
      };
    } catch (error) {
      console.error('Failed to parse analysis result:', error);
      return {
        passedChecks: 0,
        warnings: 1,
        errors: 1,
        issues: [
          {
            type: "error",
            severity: "medium",
            title: "Analysis Error",
            description: "The AI analysis service encountered an error",
            file: "system",
            code: null,
            suggestion: "Please try the analysis again"
          }
        ]
      };
    }
  }

  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    try {
      return await s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      console.error('Presigned URL generation error:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }
}

export const awsService = new AwsService();
