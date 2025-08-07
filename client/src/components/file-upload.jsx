import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function FileUpload({ onUploadComplete }) {
  const [uploadType, setUploadType] = useState("folder");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      console.log('Uploading files:', files.length, files.map(f => f.name));
      const formData = new FormData();
      files.forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.size, 'bytes');
        formData.append('files', file);
      });
      formData.append('uploadType', uploadType);

      console.log('FormData entries:', Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `File: ${value.name}` : value]));

      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: `${uploadedFiles.length} files uploaded successfully`,
      });
      onUploadComplete(data.sessionId);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const processFiles = useCallback((fileList) => {
    const files = Array.from(fileList);
    console.log('Processing files:', files.length);
    
    const processedFiles = files.map((file, index) => ({
      file,
      id: `file-${Date.now()}-${index}`,
    }));
    
    setUploadedFiles(processedFiles);
    
    if (processedFiles.length > 0) {
      uploadMutation.mutate(processedFiles.map(f => f.file));
    }
  }, [uploadMutation]);

  const handleFileSelect = useCallback((event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Upload Code Files</h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-slate-600">Ready</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setUploadType("folder")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                uploadType === "folder"
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              📁 Folder Upload
            </button>
            <button
              onClick={() => setUploadType("single")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                uploadType === "single"
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              📄 Individual Files
            </button>
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 hover:border-slate-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📤</span>
            </div>
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-2">
                {uploadType === "folder"
                  ? "Drop your project folder here"
                  : "Drop individual files here"}
              </h4>
              <p className="text-slate-600 mb-4">
                {uploadType === "folder"
                  ? "Upload a folder containing multiple code files for comprehensive analysis"
                  : "Select individual code files (.js, .jsx, .ts, .tsx, .py, .java, etc.)"}
              </p>
              <Button 
                onClick={triggerFileSelect}
                disabled={uploadMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploadMutation.isPending ? "Uploading..." : "Choose Files"}
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={uploadType === "single"}
          webkitdirectory={uploadType === "folder"}
          accept={uploadType === "single" ? ".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.swift,.kt,.scala,.clj,.hs,.ml,.fs,.elm,.dart,.lua,.r,.m,.mm,.cc,.cxx,.h,.hpp,.cs,.vb,.pas,.ada,.f,.f90,.f95,.jl,.nim,.cr,.zig,.odin,.v,.asm,.s" : ""}
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-900 mb-3">
              Selected Files ({uploadedFiles.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {uploadedFiles.map((uploadedFile) => (
                <div key={uploadedFile.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">📄</span>
                    <span className="text-sm text-slate-700">{uploadedFile.file.name}</span>
                    <span className="text-xs text-slate-500">
                      ({(uploadedFile.file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="text-slate-400 hover:text-red-500 text-sm"
                    disabled={uploadMutation.isPending}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {uploadMutation.isPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">Uploading files...</p>
              <p className="text-xs text-blue-700">Please wait while we process your files</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}