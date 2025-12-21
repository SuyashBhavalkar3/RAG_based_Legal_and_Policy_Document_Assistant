import { useRef, useEffect } from "react";
import { ChatMessage, Message } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Scale } from "lucide-react";

interface ChatContainerProps {
  messages: Message[];
  onSend: (message: string) => void;
  onFileUpload?: (file: File, question: string) => void;
  isLoading?: boolean;
  conversationTitle?: string;
}


export function ChatContainer({
  messages,
  onSend,
  onFileUpload,
  isLoading = false,
  conversationTitle,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <h1 className="font-serif text-xl font-semibold text-foreground">
          {conversationTitle || "New Conversation"}
        </h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
              Legal Assistant
            </h2>
            <p className="text-muted-foreground max-w-md text-sm">
              Ask questions about contracts, regulations, case law, or upload legal
              documents for analysis. I'm here to help you navigate complex legal
              matters.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-3 animate-message-in">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
                  <Scale className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div className="bg-chat-assistant border border-chat-assistant-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {/* <ChatInput
        onSend={onSend}
        onFileUpload={onFileUpload}
        disabled={isLoading}
      /> */}
      <ChatInput
        onSend={onSend}
        onFileUpload={onFileUpload}
        disabled={isLoading}
      />
    </div>
  );
}
