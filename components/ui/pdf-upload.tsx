"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

export default function PDFUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      setUploadStatus("Please select a valid PDF file");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Processing PDF...");

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus(`PDF processed successfully! Extracted ${result.chunks} text chunks and stored in vector database.`);
      } else {
        setUploadStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setUploadStatus("Error uploading PDF. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              Click to upload PDF
            </span>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500">PDF files only</p>
        </div>
      </div>

      {isUploading && (
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-600">Processing...</span>
        </div>
      )}

      {uploadStatus && (
        <div className="p-4 rounded-md bg-gray-50 border">
          <p className="text-sm text-gray-700">{uploadStatus}</p>
        </div>
      )}
    </div>
  );
}