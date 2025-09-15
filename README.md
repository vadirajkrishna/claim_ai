# TypeScript Next.js AI SDK 5 Starter

A minimal starter template for building AI-powered applications with Next.js 15, TypeScript, and AI SDK 5.

## What's included

- **Next.js 15** with App Router and TypeScript
- **AI SDK 5** with OpenAI provider for text generation
- **Basic chat interface** with message history
- **Tailwind CSS** for styling
- **Non-streaming AI responses** for simple interactions

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and start chatting with the AI assistant

## What it does

- Simple chat interface where you can send messages to an AI assistant
- Uses GPT-4 via OpenAI for generating responses
- Displays conversation history with user and assistant messages
- Shows loading state while waiting for AI responses
- Responsive design that works on mobile and desktop
