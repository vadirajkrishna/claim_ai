import PDFUpload from "@/components/ui/pdf-upload";

export default function UploadPDF() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upload PDF</h1>
      <div className="space-y-4">
        <p className="text-gray-600">
          Upload a PDF document to extract its text content, process it with OCR,
          and store it in the vector database for AI-powered analysis.
        </p>
        <PDFUpload />
      </div>
    </div>
  );
}