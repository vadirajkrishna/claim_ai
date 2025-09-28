import { NextRequest, NextResponse } from "next/server";
import { run } from '@openai/agents';
import { orchestratorAgent } from '../agents/orchestrator-agent';

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

    // Get the final output
    const output = result.finalOutput;
    console.log("output is", output)
    return NextResponse.json({
      response: output || 'No response generated'
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
