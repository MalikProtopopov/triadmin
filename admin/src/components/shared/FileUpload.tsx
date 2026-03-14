"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  accept?: Record<string, string[]>;
  maxSize?: number;
  multiple?: boolean;
  value?: File | File[] | null;
  onChange: (files: File | File[] | null) => void;
  label?: string;
  hint?: string;
}

export function FileUpload({
  accept,
  maxSize = 5 * 1024 * 1024,
  multiple = false,
  value,
  onChange,
  label = "Перетащите файл или нажмите для выбора",
  hint,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (multiple) {
        onChange(acceptedFiles);
      } else {
        onChange(acceptedFiles[0] || null);
      }
    },
    [multiple, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
  });

  const files = value ? (Array.isArray(value) ? value : [value]) : [];

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="truncate flex-1">{file.name}</span>
              <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} МБ</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  if (multiple) {
                    const newFiles = files.filter((_, idx) => idx !== i);
                    onChange(newFiles.length ? newFiles : null);
                  } else {
                    onChange(null);
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
