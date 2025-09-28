import { SYSTEM_INSTRUCTIONS } from "@/components/agent/prompt";
import { Agent } from '@openai/agents';
import { sqlQueryGeneratorAgent } from './pg-query-generator';
import { pdfReaderAgent } from './agent-pdf-reader';
import { handoff } from '@openai/agents';

// Create handoff object for SQL queries
const sqlHandoff = handoff(sqlQueryGeneratorAgent, {
  toolNameOverride: 'generate_sql_queries',
  toolDescriptionOverride: 'Generate PostgreSQL fraud detection queries and SQL analysis for claims data. Use this when users ask for SQL queries, database queries, or want to analyze claims for fraud patterns.',
});

// Create handoff object for PDF document analysis
const pdfHandoff = handoff(pdfReaderAgent, {
  toolNameOverride: 'analyze_pdf_documents',
  toolDescriptionOverride: 'Analyze PDF documents and answer questions about Vadiraj\'s professional experience. Use this when users ask about documents, document analysis, document review approaches, OR when they ask anything about Vadiraj, his skills, experience, background, education, work history, projects, career, or professional qualifications.',
});

// Main Orchestrator Agent
export const orchestratorAgent = new Agent({
  name: 'Fraud Investigation Assistant',
  instructions: SYSTEM_INSTRUCTIONS,
  model: 'gpt-5',
  handoffs: [sqlHandoff, pdfHandoff]
});