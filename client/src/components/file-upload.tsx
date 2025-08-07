import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onUploadComplete: (sessionId: string) => void;
}

interface UploadedFile {
  file: File;
  id: string;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadType, setUploadType] = useState<"single" | "folder">("folder");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
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
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    
    // Validate file types
    const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go'];
    const invalidFiles = fileArray.filter(file => 
      !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file types",
        description: "Please upload only code files (.js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .go)",
        variant: "destructive",
      });
      return;
    }

    // Validate file count for folder upload
    if (uploadType === "folder" && fileArray.length > 6) {
      toast({
        title: "Too many files",
        description: "Folder upload supports up to 6 files",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = fileArray.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: "Each file must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    const newFiles: UploadedFile[] = fileArray.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
    }));

    setUploadedFiles(newFiles);
  }, [uploadType, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (uploadType === "folder" && e.dataTransfer.items) {
      // Handle folder drop
      const items = Array.from(e.dataTransfer.items);
      const files: File[] = [];
      
      items.forEach(item => {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      });
      
      if (files.length > 0) {
        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        handleFileSelect(dt.files);
      }
    } else {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [uploadType, handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(uploadedFiles.map(f => f.file));
  };

  const handleDemoUpload = () => {
    // Create mock files for demo
    const mockFiles = [
      new File(['console.log("Hello World");'], 'demo.js', { type: 'text/javascript' }),
      new File(['function test() { return true; }'], 'utils.js', { type: 'text/javascript' })
    ];
    
    uploadMutation.mutate(mockFiles);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    const iconMap: Record<string, string> = {
      'js': 'text-blue-600',
      'jsx': 'text-blue-600',
      'ts': 'text-blue-600',
      'tsx': 'text-blue-600',
      'py': 'text-green-600',
      'java': 'text-orange-600',
      'cpp': 'text-purple-600',
      'c': 'text-purple-600',
      'go': 'text-cyan-600',
    };
    return iconMap[ext || ''] || 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Upload Files</h2>
            <p className="text-sm text-slate-600 mt-1">
              Upload single files or folders with 3-6 interdependent files
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={uploadType === "single" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadType("single")}
            >
              <i className="fas fa-file-code mr-1"></i>
              Single File
            </Button>
            <Button
              variant={uploadType === "folder" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadType("folder")}
            >
              <i className="fas fa-folder mr-1"></i>
              Folder
            </Button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer group ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 hover:border-blue-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                isDragOver 
                  ? 'bg-blue-100' 
                  : 'bg-slate-100 group-hover:bg-blue-50'
              }`}>
                <i className={`fas fa-cloud-upload-alt text-2xl transition-colors ${
                  isDragOver 
                    ? 'text-blue-500' 
                    : 'text-slate-400 group-hover:text-blue-500'
                }`}></i>
              </div>
            </div>
            <div>
              <p className="text-base font-medium text-slate-900">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Supports: .js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .go
              </p>
            </div>
            <div className="flex justify-center space-x-4 text-xs text-slate-500">
              <span><i className="fas fa-file-code mr-1"></i>Max 10MB per file</span>
              <span><i className="fas fa-layer-group mr-1"></i>Up to 6 files per folder</span>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={uploadType === "folder"}
          accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.go"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 bg-${getFileIcon(uploadedFile.file.name).split('-')[1]}-100 rounded flex items-center justify-center`}>
                    <i className={`fas fa-file-code ${getFileIcon(uploadedFile.file.name)} text-sm`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{uploadedFile.file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(uploadedFile.file.size / 1024).toFixed(1)} KB • {uploadedFile.file.type || 'Unknown type'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadedFile.id)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
          <Button
            onClick={handleUpload}
            disabled={uploadedFiles.length === 0 || uploadMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {uploadMutation.isPending ? (
              <>
                <i className="fas fa-spinner animate-spin mr-2"></i>
                Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-magic mr-2"></i>
                Analyze Code with AI
              </>
            )}
          </Button>
          
          {/* Demo Button */}
          <Button
            onClick={handleDemoUpload}
            disabled={uploadMutation.isPending}
            variant="outline"
            className="w-full"
          >
            <i className="fas fa-play-circle mr-2"></i>
            Try Demo (No Files Needed)
          </Button>
        </div>
      </div>

      {/* Architecture Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="fas fa-cloud text-white"></i>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">AWS-Powered Analysis</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <i className="fas fa-arrow-right text-blue-500 w-4"></i>
                <span>Files uploaded directly to S3 with pre-signed URLs</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-arrow-right text-blue-500 w-4"></i>
                <span>Lambda triggers FastAPI backend on ECS Fargate</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-arrow-right text-blue-500 w-4"></i>
                <span>Amazon Bedrock (Claude) analyzes code structure</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-arrow-right text-blue-500 w-4"></i>
                <span>Stateless processing with auto-cleanup</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
