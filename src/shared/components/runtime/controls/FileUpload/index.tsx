import React, { useState, useRef } from "react";
import { RuntimeControlProps } from "../types";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";

const Progress = ({ value, className }: { value: number; className?: string }) => {
  return (
    <div className={`w-full bg-muted rounded-full overflow-hidden h-1.5 ${className}`}>
      <div 
        className="bg-primary h-full transition-all duration-300 ease-out" 
        style={{ width: `${value}%` }} 
      />
    </div>
  );
};

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  previewUrl?: string;
}

export const FileUploadControl: React.FC<RuntimeControlProps> = ({
  field,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  readonly,
}) => {
  const isEditable = !disabled && !readonly;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Internal state of uploaded files mapped from value (value holds JSON string/array of files metadata)
  const [files, setFiles] = useState<UploadedFile[]>(() => {
    if (!value) return [];
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch (e) {
      return [];
    }
  });

  const properties = field.properties || (field.metadata?.properties as Record<string, any>) || {};
  const allowMultiple = properties.allowMultiple ?? true;
  const maxFiles = properties.maxFiles ?? 5;
  const maxSizeMB = properties.maxSizeMB ?? 10;
  const allowedExtensions = properties.allowedExtensions || [".pdf", ".docx", ".xlsx", ".png", ".jpg"];

  const updateFilesAndNotify = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    // Serialize file details to form state
    onChange(JSON.stringify(newFiles));
  };

  const handleFileSelection = (selectedFiles: FileList) => {
    if (!isEditable) return;

    const currentFiles = [...files];
    const incomingFiles = Array.from(selectedFiles);

    // Limit checks
    if (!allowMultiple && incomingFiles.length > 0) {
      // Replace with single file
      currentFiles.length = 0;
    }

    if (currentFiles.length + incomingFiles.length > maxFiles) {
      alert(`You can only upload a maximum of ${maxFiles} files.`);
      return;
    }

    incomingFiles.forEach((file) => {
      // Extension Check
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        alert(`File extension ${ext} is not allowed. Supported extensions: ${allowedExtensions.join(", ")}`);
        return;
      }

      // Size Check
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        alert(`File size exceeds limit of ${maxSizeMB}MB.`);
        return;
      }

      const fileId = Math.random().toString(36).substring(7);
      const isImage = file.type.startsWith("image/");
      const newUpload: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading",
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      };

      currentFiles.push(newUpload);
      updateFilesAndNotify([...currentFiles]);

      // Mock progress simulation
      let prog = 0;
      const interval = setInterval(() => {
        prog += 20;
        setFiles((prev) => {
          const updated = prev.map((f) => {
            if (f.id === fileId) {
              const status = prog >= 100 ? "completed" : "uploading";
              return { ...f, progress: Math.min(prog, 100), status } as UploadedFile;
            }
            return f;
          });
          // Serialize once completed
          if (prog >= 100) {
            onChange(JSON.stringify(updated));
            clearInterval(interval);
          }
          return updated;
        });
      }, 300);
    });
  };

  const handleDelete = (id: string) => {
    if (!isEditable) return;
    const newFiles = files.filter((f) => f.id !== id);
    updateFilesAndNotify(newFiles);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4" onBlur={onBlur} onFocus={onFocus}>
      {/* Drag & Drop Zone */}
      {isEditable && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files) {
              handleFileSelection(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
            isDragOver ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20 hover:border-primary/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple={allowMultiple}
            accept={allowedExtensions.join(",")}
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelection(e.target.files);
              }
            }}
          />
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-sm font-semibold text-foreground">
            Drag & drop or <span className="text-primary hover:underline">browse</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Supports: {allowedExtensions.join(", ")} (Max: {maxSizeMB}MB)
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          {files.map((file) => (
            <div key={file.id} className="p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{formatSize(file.size)}</span>
                    {file.status === "uploading" && (
                      <span className="text-primary animate-pulse font-medium">Uploading ({file.progress}%)</span>
                    )}
                    {file.status === "completed" && (
                      <span className="text-emerald-500 flex items-center gap-1 font-medium">
                        <CheckCircle className="h-3 w-3" /> Completed
                      </span>
                    )}
                    {file.status === "error" && (
                      <span className="text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3" /> Failed
                      </span>
                    )}
                  </div>
                  {file.status === "uploading" && (
                    <Progress value={file.progress} className="h-1 mt-1.5 bg-muted/60" />
                  )}
                </div>
              </div>
              {isEditable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadControl;
