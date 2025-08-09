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
      console.log('=== MUTATION STARTED ===');
      console.log('Uploading files:', files.length, files.map(f => f.name));
      const formData = new FormData();
      files.forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.size, 'bytes');
        formData.append('files', file);
      });
      formData.append('uploadType', uploadType);

      console.log('FormData entries:', Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `File: ${value.name}` : value]));

      console.log('Making request to:', '/api/upload');
      console.log('Request method:', 'POST');
      console.log('FormData size:', formData.has('files') ? 'Has files' : 'No files');

      try {
        const response = await apiRequest('POST', '/api/upload', formData);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        const result = await response.json();
        console.log('Response data:', result);
        return result;
      } catch (error) {
        console.error('Network/Parse error:', error);
        console.error('Error details:', (error as Error).message, (error as Error).stack);
        throw error;
      }
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
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error message:', (error as Error)?.message);
      console.error('Error stack:', (error as Error)?.stack);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      toast({
        title: "Upload failed",
        description: (error as Error)?.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((files: FileList) => {
    const fileArray = Array.from(files);

    // Validate file types
    const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go'];

    // Filter to only include valid code files
    const validFiles = fileArray.filter(file =>
      validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );

    const invalidFiles = fileArray.filter(file =>
      !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );

    // Show warning for filtered files but continue with valid ones
    if (invalidFiles.length > 0) {
      toast({
        title: `Filtered out ${invalidFiles.length} non-code files`,
        description: `Only uploading ${validFiles.length} code files. Filtered: ${invalidFiles.slice(0, 3).map(f => f.name).join(', ')}${invalidFiles.length > 3 ? '...' : ''}`,
        variant: "default",
      });
    }

    // If no valid files remain, show error
    if (validFiles.length === 0) {
      toast({
        title: "No valid code files found",
        description: "Please upload files with these extensions: .js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .go",
        variant: "destructive",
      });
      return;
    }

    // Use only valid files
    const processFiles = validFiles;

    // Validate file count for folder upload
    if (uploadType === "folder" && processFiles.length > 6) {
      toast({
        title: "Too many files",
        description: "Folder upload supports up to 6 files",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = processFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: "Each file must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    const newFiles: UploadedFile[] = processFiles.map(file => ({
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const files: File[] = [];

      // Process each item
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            if (entry.isFile) {
              // Single file
              const file = item.getAsFile();
              if (file) files.push(file);
            } else if (entry.isDirectory && uploadType === "folder") {
              // Directory - traverse and collect files
              const dirFiles = await traverseDirectory(entry as FileSystemDirectoryEntry);
              files.push(...dirFiles);
            }
          }
        }
      }

      if (files.length > 0) {
        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        handleFileSelect(dt.files);
      }
    } else {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [uploadType, handleFileSelect]);

  // Helper function to traverse directory entries
  const traverseDirectory = useCallback(async (directoryEntry: FileSystemDirectoryEntry): Promise<File[]> => {
    const files: File[] = [];
    const reader = directoryEntry.createReader();

    return new Promise((resolve) => {
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }

          for (const entry of entries) {
            if (entry.isFile) {
              const file = await new Promise<File>((fileResolve) => {
                (entry as FileSystemFileEntry).file(fileResolve);
              });
              files.push(file);
            }
          }

          readEntries(); // Continue reading
        });
      };

      readEntries();
    });
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    // Simple direct test first
    console.log('=== TESTING DIRECT UPLOAD ===');
    try {
      const testFile = uploadedFiles[0].file;
      console.log('Test file:', testFile.name, testFile.size);

      const formData = new FormData();
      formData.append('files', testFile);
      formData.append('uploadType', uploadType);

      console.log('Making direct fetch request...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Direct response status:', response.status);
      console.log('Direct response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Direct upload SUCCESS:', result);
        toast({
          title: "Upload successful",
          description: "File uploaded successfully",
        });
        onUploadComplete(result.sessionId);
      } else {
        const errorText = await response.text();
        console.error('Direct upload FAILED:', response.status, errorText);
        toast({
          title: "Upload failed",
          description: `Error: ${response.status} ${errorText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Direct upload ERROR:', error);
      toast({
        title: "Upload failed",
        description: `Network error: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
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
                {uploadType === "folder"
                  ? "Drop folder here or click to select folder"
                  : "Drop files here or click to upload"}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Supports: .js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .go
              </p>
              {uploadType === "folder" && (
                <p className="text-xs text-blue-600 mt-1">
                  <i className="fas fa-info-circle mr-1"></i>
                  Select a folder containing 3-6 interdependent code files
                </p>
              )}
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
          {...(uploadType === "folder" ? { webkitdirectory: "true" } : {})}
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
                Analyze Code
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


    </div>
  );
}