import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AwsSetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🚀 AWS Setup Guide</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Hide" : "Show"} Setup Guide
            </Button>
          </CardTitle>
        </CardHeader>
        
        {isExpanded && (
          <CardContent>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-600 mb-4">
                This demo currently runs with simulated AWS services. To connect to real AWS services:
              </p>
              
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                <li>Set up Amazon Bedrock with Claude 3.5 Sonnet access</li>
                <li>Create an S3 bucket for file storage</li>
                <li>Configure Lambda functions for processing</li>
                <li>Set up ECS for the analysis backend</li>
                <li>Add your AWS credentials to environment variables</li>
              </ol>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-700">
                  📚 Check the <code>aws-setup-guide-corporate.md</code> file for detailed setup instructions.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}