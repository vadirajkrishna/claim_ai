import { Pinecone } from "@pinecone-database/pinecone";

// Service to handle PDF document search using the tool_retriever logic
export async function searchPDFDocuments(query: string, topK: number = 5) {
  try {
    // Initialize clients
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Generate embedding for the query
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    console.log(`Generating embedding for query: "${query}"`);
    const queryEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    // Query Pinecone
    const indexName = "pdf-documents";
    const index = pinecone.index(indexName);

    console.log(`Searching Pinecone with topK: ${topK}`);
    const queryResponse = await index.query({
      vector: queryEmbedding.data[0].embedding,
      topK,
      includeMetadata: true
    });

    // Format results
    const results = queryResponse.matches.map(match => ({
      score: match.score,
      text: match.metadata?.text || 'No text available',
      source: match.metadata?.source || 'Unknown source',
      filename: match.metadata?.filename || 'Unknown file',
      chunkIndex: match.metadata?.chunkIndex || 0,
      chunkSize: match.metadata?.chunkSize || 0,
      uploadedAt: match.metadata?.uploadedAt || null
    }));

    console.log(`Found ${results.length} results`);

    // Format the results for consistency
    const formattedResults = results.map((result, index) => ({
      rank: index + 1,
      relevanceScore: result.score,
      content: result.text,
      source: result.source,
      filename: result.filename,
      chunkIndex: result.chunkIndex,
      uploadedAt: result.uploadedAt
    }));

    return {
      success: true,
      query,
      totalResults: results.length,
      results: formattedResults
    };

  } catch (error) {
    console.error('PDF search service error:', error);
    return {
      success: false,
      error: `Failed to search PDF documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      query,
      totalResults: 0,
      results: []
    };
  }
}