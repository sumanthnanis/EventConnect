import { Button } from "@/components/ui/button";

export default function AwsSetupGuide() {
  const setupSteps = [
    {
      id: 's3',
      title: '1. S3 Bucket Setup',
      icon: 'fas fa-database',
      iconColor: 'text-blue-400',
      items: [
        'Create S3 bucket with unique name',
        'Enable CORS for frontend uploads',
        'Configure lifecycle policy for auto-cleanup',
        'Set up bucket notifications for Lambda triggers'
      ]
    },
    {
      id: 'lambda',
      title: '2. Lambda Function',
      icon: 'fas fa-bolt',
      iconColor: 'text-yellow-400',
      items: [
        'Deploy function with S3 trigger configuration',
        'Set IAM permissions for S3 and ECS access',
        'Configure environment variables for ECS endpoint',
        'Test function with sample S3 events'
      ]
    },
    {
      id: 'ecs',
      title: '3. ECS Fargate Setup',
      icon: 'fas fa-cog',
      iconColor: 'text-green-400',
      items: [
        'Create ECS cluster and task definition',
        'Push FastAPI Docker image to ECR',
        'Configure service with proper CPU/memory',
        'Set up load balancer for high availability'
      ]
    },
    {
      id: 'bedrock',
      title: '4. Amazon Bedrock',
      icon: 'fas fa-brain',
      iconColor: 'text-purple-400',
      items: [
        'Enable Bedrock service in AWS console',
        'Request access to Claude or Titan models',
        'Configure IAM permissions for model access',
        'Test API calls with sample prompts'
      ]
    },
    {
      id: 'iam',
      title: '5. IAM Configuration',
      icon: 'fas fa-shield-alt',
      iconColor: 'text-red-400',
      items: [
        'Create service roles for Lambda and ECS',
        'Set up policies for cross-service communication',
        'Configure least privilege access principles',
        'Test permissions with AWS CLI'
      ]
    },
    {
      id: 'monitoring',
      title: '6. Monitoring & Logs',
      icon: 'fas fa-chart-line',
      iconColor: 'text-blue-400',
      items: [
        'Set up CloudWatch log groups',
        'Configure alarms for error rates',
        'Enable X-Ray tracing for debugging',
        'Create CloudWatch dashboard'
      ]
    }
  ];

  return (
    <div className="mt-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold">AWS Configuration Guide</h3>
          <p className="text-slate-300 mt-1">Complete setup instructions for end-to-end deployment</p>
        </div>
        <div className="flex items-center space-x-2">
          <i className="fab fa-aws text-3xl text-orange-400"></i>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {setupSteps.slice(0, 3).map((step) => (
            <div key={step.id} className="bg-slate-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <i className={`${step.icon} ${step.iconColor} mr-2`}></i>
                {step.title}
              </h4>
              <div className="text-sm text-slate-300 space-y-2">
                {step.items.map((item, index) => (
                  <p key={index}>• {item}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {setupSteps.slice(3).map((step) => (
            <div key={step.id} className="bg-slate-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <i className={`${step.icon} ${step.iconColor} mr-2`}></i>
                {step.title}
              </h4>
              <div className="text-sm text-slate-300 space-y-2">
                {step.items.map((item, index) => (
                  <p key={index}>• {item}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Estimated setup time: 2-3 hours for experienced AWS users
          </div>
          <div className="flex items-center space-x-3">
            <Button className="bg-orange-600 hover:bg-orange-700">
              <i className="fas fa-rocket mr-1"></i>
              Deploy with CDK
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <i className="fas fa-file-code mr-1"></i>
              View Templates
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
