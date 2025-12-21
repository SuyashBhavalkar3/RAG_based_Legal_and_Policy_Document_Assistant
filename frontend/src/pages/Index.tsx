import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";

const Index = () => {
  const {
    conversations,
    activeConversationId,
    currentMessages,
    currentConversation,
    isLoading,
    setActiveConversationId,
    sendMessage,
    uploadFile,
    createConversation,
    deleteConversation,
  } = useChat();

  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={createConversation}
        onDelete={deleteConversation}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
      <main className="flex-1 min-w-0">
        <ChatContainer
          messages={currentMessages}
          onSend={sendMessage}
          onFileUpload={uploadFile}
          isLoading={isLoading}
          conversationTitle={currentConversation?.title}
        />
      </main>
    </div>
  );
};

export default Index;
