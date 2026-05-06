"use client";

import { useCallback, useEffect, useMemo } from "react";
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
  existingImageUrl?: string | null;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function FileUpload({
  accept,
  maxSize = 5 * 1024 * 1024,
  multiple = false,
  value,
  onChange,
  label = "Перетащите файл или нажмите для выбора",
  hint,
  existingImageUrl,
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

  const files = useMemo(
    () => (value ? (Array.isArray(value) ? value : [value]) : []),
    [value]
  );

  const previews = useMemo(
    () =>
      files.map((file) => (isImageFile(file) ? URL.createObjectURL(file) : null)),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  const showExistingPreview = !!existingImageUrl && files.length === 0;

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

      {showExistingPreview && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">Текущее изображение:</p>
          <div className="inline-block rounded-lg border bg-muted/30 p-2">
            <img
              src={existingImageUrl as string}
              alt="Текущее изображение"
              className="max-h-40 max-w-full rounded object-contain"
            />
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, i) => {
            const previewUrl = previews[i];
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border p-2"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="h-16 w-16 shrink-0 rounded object-cover bg-muted"
                  />
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} МБ
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
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
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
