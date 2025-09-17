import ChatAssistant from "@/components/chat/chat-assistant";

export default function Home() {
  return (
    <div className="h-screen bg-background flex flex-col max-w-4xl mx-auto">
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
      </div>

      <div className="flex-1">
        <ChatAssistant />
      </div>
    </div>
  );
}
