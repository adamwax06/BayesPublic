"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Camera } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  onImageUploaded: (imageData: string) => void;
  onReset?: () => void;
  loading?: boolean;
}

export function ImageUpload({
  onImageUploaded,
  onReset,
  loading = false,
}: ImageUploadProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Accept images and PDFs
    const isImage = file.type.startsWith("image/");
    const isPdfFile = file.type === "application/pdf";
    if (!isImage && !isPdfFile) {
      alert("Please upload an image or PDF file");
      return;
    }

    // Read the file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64Image = e.target.result as string;
        setImage(base64Image);
        setIsPdf(isPdfFile);
        onImageUploaded(base64Image);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onReset) onReset();
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {!image ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragActive ? "border-purple-600 bg-purple-50" : "border-gray-300"
          } transition-all`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            accept="image/*,application/pdf"
            className="hidden"
          />

          <div className="mx-auto flex flex-col items-center justify-center">
            <Upload className="h-8 w-8 text-gray-400 mb-3" />
            <p className="mb-1 text-sm font-medium text-gray-700">
              Upload your homework image
            </p>
            <p className="mb-3 text-xs text-gray-500">
              Drag and drop or click to upload
            </p>
            <Button
              onClick={handleButtonClick}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={loading}
              size="sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              Choose File
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-gray-300 p-2 flex items-center justify-center">
          {isPdf ? (
            <>
              <Upload className="h-10 w-10 text-gray-500" />
              <span className="ml-2 text-sm text-gray-700">PDF attached</span>
            </>
          ) : (
            <Image
              src={image}
              alt="Homework"
              width={400}
              height={300}
              className="w-full h-auto max-h-[300px] object-contain"
              style={{ maxHeight: "300px" }}
            />
          )}
          <Button
            onClick={handleReset}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 h-8 w-8 p-0"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
