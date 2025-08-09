import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import FileUpload from "@/components/file-upload";
import ProcessingStatus from "@/components/processing-status";
import ReviewResults from "@/components/review-results";
// import AwsSetupGuide from "@/components/aws-setup-guide";
import { useState } from "react";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleUploadComplete = (newSessionId: string) => {
    setSessionId(newSessionId);
  };

  const handleAnalysisComplete = () => {
    setShowResults(true);
  };

  const handleReanalyzeStart = () => {
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <FileUpload onUploadComplete={handleUploadComplete} />
          <ProcessingStatus 
            sessionId={sessionId} 
            onComplete={handleAnalysisComplete}
          />
        </div>

        {showResults && sessionId && (
          <ReviewResults 
            sessionId={sessionId} 
            onReanalyzeStart={handleReanalyzeStart}
          />
        )}

      
      </main>

      <Footer />
    </div>
  );
}
