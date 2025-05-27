import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Music } from 'lucide-react';
import { clsx } from 'clsx';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav']
    },
    maxFiles: 1
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive ? "border-blue-500 bg-blue-50/5" : "border-gray-700 hover:border-blue-400"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        {isDragActive ? (
          <Music className="w-12 h-12 text-blue-500" />
        ) : (
          <Upload className="w-12 h-12 text-gray-400" />
        )}
        <div>
          <p className="text-lg font-medium text-gray-300">
            {isDragActive ? "Drop your audio file here" : "Drag & drop your piano audio file"}
          </p>
          <p className="text-sm text-gray-400 mt-1">or click to browse</p>
        </div>
        <p className="text-xs text-gray-500">Supported formats: MP3, WAV</p>
      </div>
    </div>
  );
}