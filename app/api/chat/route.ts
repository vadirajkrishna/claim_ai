import { SYSTEM_INSTRUCTIONS, SQL_QUERY_PROMPT } from "@/components/agent/prompt";
import { NextRequest, NextResponse } from "next/server";
import { Agent, handoff, run } from '@openai/agents';

// SQL Query Generator Agent
const sqlQueryGeneratorAgent = new Agent({
  name: 'SQL Query Generator',
  instructions: SQL_QUERY_PROMPT,
  model: 'gpt-5'
});

// Create handoff object without onHandoff callback to avoid the inputType requirement
const sqlHandoff = handoff(sqlQueryGeneratorAgent, {
  toolNameOverride: 'generate_sql_queries',
  toolDescriptionOverride: 'Generate PostgreSQL fraud detection queries for a specific claim ID',
});

// Main Orchestrator Agent
const orchestratorAgent = new Agent({
  name: 'Fraud Investigation Assistant',
  instructions: SYSTEM_INSTRUCTIONS,
  model: 'gpt-5',
  handoffs: [sqlHandoff]
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Run the orchestrator agent
    const result = await run(orchestratorAgent, message);

    return NextResponse.json({
      response: result.finalOutput
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
