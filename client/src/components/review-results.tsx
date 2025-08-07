import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@shared/schema";

interface ReviewResultsProps {
  sessionId: string;
}

export default function ReviewResults({ sessionId }: ReviewResultsProps) {
  const { data: results, isLoading } = useQuery({
    queryKey: ['/api/analysis/results', sessionId],
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center py-8">
          <i className="fas fa-exclamation-circle text-slate-400 text-3xl mb-4"></i>
          <p className="text-slate-600">No analysis results found</p>
        </div>
      </div>
    );
  }

  const { passedChecks, warnings, errors, issues } = results as AnalysisResult;

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return 'fas fa-times';
      case 'warning':
        return 'fas fa-exclamation';
      case 'success':
        return 'fas fa-check';
      case 'suggestion':
        return 'fas fa-lightbulb';
      default:
        return 'fas fa-info';
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'bg-red-500',
          text: 'text-red-700',
          title: 'text-red-800',
          badge: 'bg-red-200 text-red-800'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'bg-amber-500',
          text: 'text-amber-700',
          title: 'text-amber-800',
          badge: 'bg-amber-200 text-amber-800'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: 'bg-emerald-500',
          text: 'text-emerald-700',
          title: 'text-emerald-800',
          badge: 'bg-emerald-200 text-emerald-800'
        };
      case 'suggestion':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'bg-blue-500',
          text: 'text-blue-700',
          title: 'text-blue-800',
          badge: 'bg-blue-200 text-blue-800'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          icon: 'bg-slate-500',
          text: 'text-slate-700',
          title: 'text-slate-800',
          badge: 'bg-slate-200 text-slate-800'
        };
    }
  };

  const getPriorityText = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'Critical Priority';
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium Priority';
      case 'low':
        return 'Low Priority';
      default:
        return 'Unknown Priority';
    }
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `code-review-${sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-check-circle text-emerald-600"></i>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Code Review Results</h3>
            <p className="text-sm text-slate-600">Analysis completed by Amazon Bedrock Claude</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportResults}>
            <i className="fas fa-download mr-1"></i>
            Export
          </Button>
          <Button variant="outline" size="sm">
            <i className="fas fa-share-alt mr-1"></i>
            Share
          </Button>
        </div>
      </div>

      {/* Review Summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-600">{passedChecks}</div>
              <div className="text-sm text-emerald-700 font-medium">Passed Checks</div>
            </div>
            <i className="fas fa-check-circle text-emerald-500 text-2xl"></i>
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-amber-600">{warnings}</div>
              <div className="text-sm text-amber-700 font-medium">Warnings</div>
            </div>
            <i className="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{errors}</div>
              <div className="text-sm text-red-700 font-medium">Critical Issues</div>
            </div>
            <i className="fas fa-times-circle text-red-500 text-2xl"></i>
          </div>
        </div>
      </div>

      {/* Detailed Review Items */}
      <div className="space-y-4">
        {issues.map((issue, index) => {
          const colors = getIssueColor(issue.type);
          return (
            <div key={index} className={`border rounded-lg p-4 ${colors.border} ${colors.bg}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.icon}`}>
                  <i className={`${getIssueIcon(issue.type)} text-white text-xs`}></i>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-sm font-semibold ${colors.title}`}>{issue.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${colors.badge}`}>
                      {issue.file}{issue.line ? `:${issue.line}` : ''}
                    </span>
                  </div>
                  <p className={`text-sm mb-3 ${colors.text}`}>{issue.description}</p>
                  
                  {issue.code && (
                    <div className="bg-slate-900 rounded-md p-3 mb-3">
                      <code className="text-sm font-mono text-green-400">
                        <pre className="whitespace-pre-wrap">{issue.code}</pre>
                      </code>
                    </div>
                  )}
                  
                  {issue.suggestion && (
                    <div className="bg-slate-900 rounded-md p-3 mb-3">
                      <div className="text-slate-400 text-xs mb-2">// Suggested fix:</div>
                      <code className="text-sm font-mono text-green-400">
                        <pre className="whitespace-pre-wrap">{issue.suggestion}</pre>
                      </code>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs">
                    <span className={colors.text}>
                      <i className="fas fa-exclamation-circle mr-1"></i>
                      {getPriorityText(issue.severity)}
                    </span>
                    <span className="text-slate-600">
                      <i className="fas fa-clock mr-1"></i>
                      ~5 min fix
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <i className="fas fa-clock mr-1"></i>
            Analysis completed
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline">
              <i className="fas fa-redo mr-1"></i>
              Re-analyze
            </Button>
            <Button onClick={exportResults}>
              <i className="fas fa-download mr-1"></i>
              Download Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
