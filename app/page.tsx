import ChatAssistant from "@/components/chat/chat-assistant";
import SidePanel from "@/components/ui/side-panel";

export default function Home() {
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <SidePanel />

      <div className="flex-1 flex flex-col max-w-4xl overflow-hidden">
        <div className="border-b p-4">
          <h1 className="text-xl font-semibold">Claims AI Assistant</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatAssistant />
        </div>
      </div>
    </div>
  );
}
