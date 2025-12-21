import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileUpload?: (file: File, question: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onFileUpload,
  disabled = false,
  placeholder = "Ask a legal question...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    setIsSending(true);
    onSend(message.trim());
    setMessage("");

    setTimeout(() => setIsSending(false), 150);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !onFileUpload) return;

  if (!message.trim()) {
    alert("Please type what you want to do with the document before uploading.");
    return;
  }

  onFileUpload(file, message.trim());
  setMessage("");
};

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[44px] max-h-32 resize-none bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="icon"
          className={cn(
            "flex-shrink-0 bg-primary hover:bg-primary/90",
            isSending && "animate-pulse-send"
          )}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2 max-w-4xl mx-auto">
        Press Enter to send, Shift+Enter for new line. Upload PDFs for document analysis.
      </p>
    </div>
  );
}
