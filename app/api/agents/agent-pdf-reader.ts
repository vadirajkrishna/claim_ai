import { Agent, tool } from '@openai/agents';
import { z } from 'zod';
import { searchPDFDocuments } from '../tools/pdf-search-service';

const PDF_READER_PROMPT = `
You are an expert PDF document analyzer and information retrieval assistant. Your role is to help users find and analyze information from uploaded PDF documents using semantic search.

## Your Capabilities:
- Search through uploaded PDF documents using semantic queries
- Extract relevant information based on user requests
- Provide comprehensive answers based on document content
- Answer questions about Vadiraj's professional experience from his uploaded CV
- Analyze document structure and content patterns
- Guide users on effective document analysis strategies

## Response Guidelines:
- Always format responses using markdown
- Use **bold** for important findings and key information
- Present extracted text in blockquotes when directly citing documents
- Use bullet points to organize multiple findings
- Include source information (filename, relevance scores when available)
- Structure responses with clear headings

## Search Strategy:
When users ask questions about specific document content or request information from documents:
1. Use the search_pdf_documents tool to find relevant document sections
2. Analyze multiple search results to provide comprehensive answers
3. Synthesize information from different parts of documents
4. Highlight contradictions or gaps in the documentation if found
5. Always cite sources and provide context

## Special Focus - Vadiraj's Professional Experience:
When users ask anything related to Vadiraj's professional experience, background, skills, education, work history, projects, or career:
- ALWAYS use the search_pdf_documents tool to find relevant information from his CV
- Provide detailed answers based on the CV content
- Include specific details about his experience, skills, and accomplishments
- Present the information in a professional and comprehensive manner
- Cite the CV as the source of information

## Response Format:
When presenting search results, use this structure:
- Brief summary of findings
- Detailed information from documents (in blockquotes)
- Source citations
- Additional insights or analysis

For general document analysis questions, provide guidance and best practices without searching.
`;

// Define the PDF search tool using the proper format
const searchPDFTool = tool({
  name: 'search_pdf_documents',
  description: 'Search through uploaded PDF documents using semantic search to find relevant information based on user queries',
  parameters: z.object({
    query: z.string().describe('The search query to find relevant information in PDF documents'),
    topK: z.number().optional().default(5).describe('Number of top results to return (default: 5)')
  }),
  async execute({ query, topK = 5 }) {
    try {
      const searchResult = await searchPDFDocuments(query, topK);

      if (!searchResult.success) {
        return {
          error: searchResult.error,
          message: "Unable to search documents at this time. Please try again later."
        };
      }

      if (searchResult.totalResults === 0) {
        return {
          message: `No relevant documents found for query: "${query}". You may want to try different search terms or check if documents have been uploaded.`,
          query,
          totalResults: 0
        };
      }

      // Format results for the agent
      const formattedResults = searchResult.results.map((result: any) => ({
        content: result.content,
        filename: result.filename,
        relevanceScore: Math.round(result.relevanceScore * 100) / 100,
        source: result.source,
        rank: result.rank
      }));

      return {
        success: true,
        query,
        totalResults: searchResult.totalResults,
        results: formattedResults,
        message: `Found ${searchResult.totalResults} relevant document sections for your query.`
      };

    } catch (error) {
      console.error('PDF search error in agent:', error);
      return {
        error: "An error occurred while searching documents",
        message: "Unable to search documents at this time. Please try again later."
      };
    }
  }
});

// PDF Reader Agent with integrated search capability
export const pdfReaderAgent = new Agent({
  name: 'PDF Document Reader',
  instructions: PDF_READER_PROMPT,
  model: 'gpt-5',
  tools: [searchPDFTool]
});