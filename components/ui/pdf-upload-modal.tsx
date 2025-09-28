"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X } from "lucide-react";

interface PDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PDFUploadModal({ isOpen, onClose }: PDFUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File upload triggered");
    const file = event.target.files?.[0];
    console.log("Selected file:", file);

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

  const handleClose = () => {
    if (!isUploading) {
      setUploadStatus("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg p-4 w-64 mx-4 relative shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload PDF</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isUploading}
            className="p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Upload a PDF document to extract its text content, process it with OCR,
            and store it in the vector database for AI-powered analysis.
          </p>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => document.getElementById("pdf-upload-modal")?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                Click to upload PDF
              </span>
              <p className="text-xs text-gray-500">PDF files only</p>
              <input
                id="pdf-upload-modal"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
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
      </div>
    </div>
  );
}