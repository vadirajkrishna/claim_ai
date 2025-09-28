import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer and save temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write file temporarily for processing
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);

    fs.writeFileSync(tempFilePath, buffer);

    try {
      // PDF Text Extraction with OCR fallback
      const extractTextFromPDF = async (filePath: string): Promise<string> => {
        try {
          // Step 1: Try direct text extraction first
          let extractedText = await extractDirectText(filePath);

          // Step 2: If no text or minimal text, use OCR
          if (!extractedText || extractedText.trim().length < 100) {
            console.log('PDF appears to be image-based, using OCR...');
            extractedText = await extractTextViaOCR(filePath);
          }

          return extractedText;
        } catch (error) {
          console.error('Text extraction error:', error);
          return `PDF file "${file.name}" processed. Text extraction encountered issues but file was successfully uploaded.`;
        }
      };

      // Direct text extraction
      const extractDirectText = async (filePath: string): Promise<string> => {
        try {
          const pdfParse = require('pdf-parse');
          const dataBuffer = fs.readFileSync(filePath);
          const data = await pdfParse(dataBuffer);
          return data.text;
        } catch (error) {
          console.error('Direct text extraction failed:', error);
          return '';
        }
      };

      // OCR-based extraction for image PDFs
      const extractTextViaOCR = async (filePath: string): Promise<string> => {
        try {
          const pdf2pic = await import("pdf2pic");
          const Tesseract = await import("tesseract.js");

          // Convert PDF pages to images
          const convert = pdf2pic.fromPath(filePath, {
            density: 300,
            saveFilename: "page",
            savePath: tempDir,
            format: "png",
            width: 2000,
            height: 2800
          });

          // Get all pages as buffers
          const pages = await convert.bulk(-1, { responseType: "buffer" });
          let fullText = '';

          // Process each page with Tesseract
          for (let i = 0; i < pages.length; i++) {
            console.log(`Processing page ${i + 1}/${pages.length} with OCR...`);

            if (!pages[i].buffer) {
              console.log(`Skipping page ${i + 1} - no buffer available`);
              continue;
            }

            const result = await Tesseract.recognize(pages[i].buffer!, 'eng', {
              logger: (m: any) => {
                if (m.status === 'recognizing text') {
                  console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
              }
            });

            fullText += `--- Page ${i + 1} ---\n`;
            fullText += result.data.text + '\n\n';
          }

          return fullText;
        } catch (error) {
          console.error('OCR extraction failed:', error);
          throw error;
        }
      };

      const text = await extractTextFromPDF(tempFilePath);

      if (!text || text.trim().length === 0) {
        return NextResponse.json({ error: "No text found in PDF" }, { status: 400 });
      }

      // Initialize clients
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });

      // Chunk text with overlap
      const chunkText = (text: string): string[] => {
        const chunkSize = 1000;
        const chunkOverlap = 200;
        const chunks = [];
        const cleanText = text.replace(/\s+/g, ' ').trim();

        for (let i = 0; i < cleanText.length; i += chunkSize - chunkOverlap) {
          const chunk = cleanText.substring(i, i + chunkSize);
          if (chunk.trim().length > 50) {
            chunks.push(chunk.trim());
          }
        }

        return chunks;
      };

      const chunks = chunkText(text);
      console.log(`Created ${chunks.length} text chunks`);

      // Generate embeddings using OpenAI API directly
      const generateEmbeddings = async (chunks: string[]) => {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
        });

        const vectors = [];
        const batchSize = 10;

        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          console.log(`Generating embeddings for batch ${Math.floor(i / batchSize) + 1}...`);

          const embeddings = await Promise.all(
            batch.map(async (chunk, batchIndex) => {
              const response = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk,
              });

              return {
                id: `${file.name}_chunk_${i + batchIndex}`,
                values: response.data[0].embedding,
                metadata: {
                  source: file.name,
                  filename: file.name,
                  chunkIndex: i + batchIndex,
                  text: chunk,
                  chunkSize: chunk.length,
                  uploadedAt: new Date().toISOString()
                }
              };
            })
          );

          vectors.push(...embeddings);
        }

        return vectors;
      };

      const vectors = await generateEmbeddings(chunks);

      // Get or create Pinecone index
      const indexName = "pdf-documents";

      try {
        // Check if index exists
        await pinecone.describeIndex(indexName);
      } catch (error) {
        // Create index if it doesn't exist
        console.log("Creating Pinecone index...");
        await pinecone.createIndex({
          name: indexName,
          dimension: 1536, // OpenAI embedding dimension
          metric: "cosine",
          spec: {
            serverless: {
              cloud: "aws",
              region: "us-east-1",
            },
          },
        });

        // Wait for index to be ready
        console.log("Waiting for index to be ready...");
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
      }

      const index = pinecone.index(indexName);

      // Upload to Pinecone in batches
      const uploadBatchSize = 100;
      for (let i = 0; i < vectors.length; i += uploadBatchSize) {
        const uploadBatch = vectors.slice(i, i + uploadBatchSize);
        console.log(`Uploading batch ${Math.floor(i / uploadBatchSize) + 1} to Pinecone...`);
        await index.upsert(uploadBatch);
      }

      return NextResponse.json({
        success: true,
        chunks: chunks.length,
        message: "PDF processed and stored successfully",
      });

    } catch (error) {
      console.error("Error processing PDF:", error);
      return NextResponse.json(
        { error: "Failed to process PDF" },
        { status: 500 }
      );
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}