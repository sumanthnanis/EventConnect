import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface ProcessingStatusProps {
  sessionId: string | null;
  onComplete: () => void;
}

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  completedAt?: string;
}

export default function ProcessingStatus({ sessionId, onComplete }: ProcessingStatusProps) {
  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/analysis/status', sessionId],
    enabled: !!sessionId,
    refetchInterval: sessionId ? 2000 : false, // Poll every 2 seconds when active
  });

  useEffect(() => {
    if (status?.status === 'completed') {
      onComplete();
    }
  }, [status?.status, onComplete]);

  if (!sessionId) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900">Analysis Status</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
              <span className="text-sm font-medium text-slate-500">Waiting</span>
            </div>
          </div>
          
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-clock text-slate-400 text-2xl"></i>
            </div>
            <p className="text-slate-600">Upload files to start analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-slate-400">0</div>
            <div className="text-xs text-slate-600 mt-1">Files Uploaded</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-slate-400">0</div>
            <div className="text-xs text-slate-600 mt-1">KB Total Size</div>
          </div>
        </div>
      </div>
    );
  }

  const steps: ProcessingStep[] = [
    {
      id: 'upload',
      title: 'Files uploaded to S3',
      description: status?.uploadCompleted ? `Completed in ${status.uploadTime}s` : 'Uploading files...',
      status: status?.uploadCompleted ? 'completed' : 'processing'
    },
    {
      id: 'lambda',
      title: 'Lambda function triggered',
      description: status?.lambdaCompleted ? 'Metadata extracted successfully' : 'Processing metadata...',
      status: status?.lambdaCompleted ? 'completed' : status?.uploadCompleted ? 'processing' : 'pending'
    },
    {
      id: 'ecs',
      title: 'ECS FastAPI processing',
      description: status?.ecsCompleted ? 'Code structure analyzed' : 'Analyzing code structure...',
      status: status?.ecsCompleted ? 'completed' : status?.lambdaCompleted ? 'processing' : 'pending'
    },
    {
      id: 'bedrock',
      title: 'Amazon Bedrock analysis',
      description: status?.bedrockCompleted ? 'AI analysis completed' : 'Running AI analysis...',
      status: status?.bedrockCompleted ? 'completed' : status?.ecsCompleted ? 'processing' : 'pending'
    }
  ];

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <i className="fas fa-check text-white text-sm"></i>;
      case 'processing':
        return <i className="fas fa-cog text-white text-sm animate-spin"></i>;
      case 'error':
        return <i className="fas fa-times text-white text-sm"></i>;
      default:
        return <i className="fas fa-clock text-slate-400 text-sm"></i>;
    }
  };

  const getStepColor = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'processing':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-200';
    }
  };

  const getStatusColor = () => {
    if (status?.status === 'error') return 'text-red-600';
    if (status?.status === 'completed') return 'text-emerald-600';
    return 'text-blue-600';
  };

  const getStatusText = () => {
    if (isLoading) return 'Loading...';
    if (status?.status === 'error') return 'Error';
    if (status?.status === 'completed') return 'Completed';
    return 'Processing';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Analysis Status</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              status?.status === 'completed' ? 'bg-emerald-500' : 
              status?.status === 'error' ? 'bg-red-500' : 
              'bg-blue-500 animate-pulse'
            }`}></div>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(step)}`}>
                {getStepIcon(step)}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  step.status === 'pending' ? 'text-slate-500' : 'text-slate-900'
                }`}>
                  {step.title}
                </p>
                <p className={`text-xs ${
                  step.status === 'pending' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {status?.totalFiles || 0}
          </div>
          <div className="text-xs text-slate-600 mt-1">Files Uploaded</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200 text-center">
          <div className="text-2xl font-bold text-slate-600">
            {status?.totalSize ? (status.totalSize / 1024).toFixed(1) : '0'}
          </div>
          <div className="text-xs text-slate-600 mt-1">KB Total Size</div>
        </div>
      </div>
    </div>
  );
}
