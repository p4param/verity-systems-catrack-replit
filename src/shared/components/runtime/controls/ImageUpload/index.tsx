import React, { useState, useRef } from "react";
import { RuntimeControlProps } from "../types";
import { Button } from "@/components/ui/button";
import { Image, X, CheckCircle, AlertCircle } from "lucide-react";

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

interface UploadedImage {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  previewUrl: string;
}

export const ImageUploadControl: React.FC<RuntimeControlProps> = ({
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

  // Internal state of uploaded images
  const [images, setImages] = useState<UploadedImage[]>(() => {
    if (!value) return [];
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch (e) {
      return [];
    }
  });

  const properties = field.properties || (field.metadata?.properties as Record<string, any>) || {};
  const allowMultiple = properties.allowMultiple ?? false; // default false for profile/image fields
  const maxFiles = properties.maxFiles ?? 3;
  const maxSizeMB = properties.maxSizeMB ?? 5;
  const allowedExtensions = properties.allowedExtensions || [".png", ".jpg", ".jpeg", ".webp", ".gif"];

  const updateImagesAndNotify = (newImages: UploadedImage[]) => {
    setImages(newImages);
    onChange(JSON.stringify(newImages));
  };

  const handleFileSelection = (selectedFiles: FileList) => {
    if (!isEditable) return;

    const currentImages = [...images];
    const incomingFiles = Array.from(selectedFiles);

    if (!allowMultiple && incomingFiles.length > 0) {
      currentImages.length = 0;
    }

    if (currentImages.length + incomingFiles.length > maxFiles) {
      alert(`You can only upload a maximum of ${maxFiles} images.`);
      return;
    }

    incomingFiles.forEach((file) => {
      // Check MIME type
      if (!file.type.startsWith("image/")) {
        alert("Only image files are allowed.");
        return;
      }

      // Extension Check
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        alert(`Extension ${ext} not allowed. Supported: ${allowedExtensions.join(", ")}`);
        return;
      }

      // Size Check
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        alert(`Image size exceeds limit of ${maxSizeMB}MB.`);
        return;
      }

      const fileId = Math.random().toString(36).substring(7);
      const newUpload: UploadedImage = {
        id: fileId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading",
        previewUrl: URL.createObjectURL(file),
      };

      currentImages.push(newUpload);
      updateImagesAndNotify([...currentImages]);

      // Mock progress simulation
      let prog = 0;
      const interval = setInterval(() => {
        prog += 25;
        setImages((prev) => {
          const updated = prev.map((img) => {
            if (img.id === fileId) {
              const status = prog >= 100 ? "completed" : "uploading";
              return { ...img, progress: Math.min(prog, 100), status } as UploadedImage;
            }
            return img;
          });
          if (prog >= 100) {
            onChange(JSON.stringify(updated));
            clearInterval(interval);
          }
          return updated;
        });
      }, 250);
    });
  };

  const handleDelete = (id: string) => {
    if (!isEditable) return;
    const newImages = images.filter((img) => img.id !== id);
    updateImagesAndNotify(newImages);
  };

  return (
    <div className="space-y-4" onBlur={onBlur} onFocus={onFocus}>
      {/* Upload Zone */}
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
          className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
            isDragOver ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20 hover:border-primary/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple={allowMultiple}
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelection(e.target.files);
              }
            }}
          />
          <Image className="h-5 w-5 text-muted-foreground" />
          <div className="text-xs font-semibold text-foreground">
            Drop image or <span className="text-primary hover:underline">browse</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Max: {maxSizeMB}MB (Allowed: {allowedExtensions.join(", ")})
          </div>
        </div>
      )}

      {/* Grid of uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div 
              key={img.id} 
              className="relative aspect-square border border-border rounded-xl overflow-hidden group shadow-sm bg-card"
            >
              <img
                src={img.previewUrl}
                alt={img.name}
                className="h-full w-full object-cover"
              />
              
              {/* Progress Overlay */}
              {img.status === "uploading" && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-3 gap-2">
                  <div className="text-[10px] font-medium animate-pulse text-primary">Uploading</div>
                  <Progress value={img.progress} className="h-1 w-full bg-muted" />
                </div>
              )}

              {/* Status and Actions Indicator */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                {img.status === "completed" && (
                  <div className="h-5 w-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle className="h-3 w-3" />
                  </div>
                )}
                {img.status === "error" && (
                  <div className="h-5 w-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md">
                    <AlertCircle className="h-3 w-3" />
                  </div>
                )}
                {isEditable && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-5 w-5 rounded-full shadow-md hover:bg-destructive/90"
                    onClick={() => handleDelete(img.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* File details overlay on hover */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] truncate">
                {img.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploadControl;
