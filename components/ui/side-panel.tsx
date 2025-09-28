"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, Upload } from "lucide-react";
import PDFUploadModal from "@/components/ui/pdf-upload-modal";

export default function SidePanel() {
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

  return (
    <>
      <div className="w-64 h-full bg-muted border-r p-4 flex flex-col">
        <div className="border-b p-4 -m-4 mb-4">
          <h1 className="text-xl font-semibold">Tools</h1>
        </div>

        <div>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          <div className="mb-2"></div>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setIsPDFModalOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload PDF
          </Button>
        </div>
      </div>

      <PDFUploadModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
      />
    </>
  );
}