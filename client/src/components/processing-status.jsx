import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export default function ProcessingStatus({ sessionId, onComplete }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/status', sessionId],
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
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-slate-600 mb-2">Upload files to start analysis</p>
            <p className="text-sm text-slate-500">Select files above to begin the code review process</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getProgressPercentage = () => {
    if (!status || !status.totalFiles) return 0;
    return Math.round((status.processedFiles / status.totalFiles) * 100);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded mb-4"></div>
          <div className="h-4 bg-slate-200 rounded mb-4"></div>
          <div className="h-4 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Analysis Status</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(status?.status)}`}></div>
            <span className="text-sm font-medium text-slate-600">{getStatusText(status?.status)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Progress</span>
            <span>{status?.processedFiles || 0} of {status?.totalFiles || 0} files</span>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          
          <div className="text-center text-sm text-slate-500">
            {getProgressPercentage()}% complete
          </div>
        </div>

        {status?.files && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-900 mb-3">File Status</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {status.files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(file.status)}`}></div>
                    <span className="text-sm text-slate-700">{file.fileName}</span>
                    <span className="text-xs text-slate-500">
                      ({(file.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{getStatusText(file.status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {status?.status === 'processing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">AI Analysis in Progress</p>
              <p className="text-xs text-blue-700">Our AI is reviewing your code for quality, structure, and best practices</p>
            </div>
          </div>
        </div>
      )}

      {status?.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">Analysis Complete!</p>
              <p className="text-xs text-green-700">Your code review results are ready to view</p>
            </div>
          </div>
        </div>
      )}

      {status?.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <div>
              <p className="text-sm font-medium text-red-900">Analysis Error</p>
              <p className="text-xs text-red-700">There was an error processing your files. Please try again.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}