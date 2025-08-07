import { useQuery } from "@tanstack/react-query";

export default function ReviewResults({ sessionId }) {
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['/api/results', sessionId],
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded mb-4"></div>
          <div className="h-4 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Results</h3>
        <p className="text-red-700">Unable to load analysis results. Please try again.</p>
      </div>
    );
  }

  if (!results || !results.results) {
    return null;
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIssueColor = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Analysis Results</h3>
          <div className="text-sm text-slate-500">
            {results.totalFiles} files analyzed • Completed {new Date(results.completedAt).toLocaleString()}
          </div>
        </div>

        <div className="space-y-6">
          {results.results.map((fileResult, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-slate-900">📄 {fileResult.fileName}</h4>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-slate-500">
                    {(fileResult.fileSize / 1024).toFixed(1)} KB
                  </span>
                  <div className={`text-2xl font-bold ${getScoreColor(fileResult.analysis.overall_score)}`}>
                    {fileResult.analysis.overall_score}/100
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-slate-700">{fileResult.analysis.summary}</p>
              </div>

              {fileResult.analysis.issues && fileResult.analysis.issues.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-slate-900 mb-2">Issues Found</h5>
                  <div className="space-y-2">
                    {fileResult.analysis.issues.map((issue, issueIndex) => (
                      <div key={issueIndex} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-md">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getIssueColor(issue.type)}`}>
                          {issue.type}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">Line {issue.line}: {issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-xs text-slate-600 mt-1">💡 {issue.suggestion}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fileResult.analysis.recommendations && fileResult.analysis.recommendations.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-slate-900 mb-2">Recommendations</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {fileResult.analysis.recommendations.map((rec, recIndex) => (
                      <li key={recIndex} className="text-sm text-slate-700">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {fileResult.analysis.security_concerns && fileResult.analysis.security_concerns.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-red-900 mb-2">🔐 Security Concerns</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {fileResult.analysis.security_concerns.map((concern, concernIndex) => (
                      <li key={concernIndex} className="text-sm text-red-700">{concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {fileResult.analysis.performance_notes && fileResult.analysis.performance_notes.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-blue-900 mb-2">⚡ Performance Notes</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {fileResult.analysis.performance_notes.map((note, noteIndex) => (
                      <li key={noteIndex} className="text-sm text-blue-700">{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}