import { useState, useCallback, useEffect } from "react";
import { Message } from "@/components/chat/ChatMessage";
import { Conversation } from "@/components/chat/ConversationSidebar";
import api from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const { user, isLoading: authLoading } = useAuth();

  // Load conversations once user is authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setConversations([]);
      setActiveConversationId(null);
      setMessages({});
      return;
    }

    const loadConversations = async () => {
      try {
        const list = await api.listConversations();
        const mapped = list.map((c) => ({
          id: String(c.id),
          title: c.title,
          lastMessage: "",
          timestamp: new Date(c.created_at),
        }));
        setConversations(mapped);
        setActiveConversationId(mapped[0]?.id ?? null);

        // preload messages for active conversation
        if (mapped[0]) {
          const convo = await api.getConversation(Number(mapped[0].id));
          setMessages((prev) => ({
            ...prev,
            [mapped[0].id]: (convo.messages || []).map((m: any) => ({
              id: String(m.id),
              role: m.role,
              content: m.content,
              timestamp: new Date(m.created_at),
            })),
          }));
        }
      } catch (err: any) {
        // Not logged in or token invalid
        console.warn('Could not load conversations:', err?.message || err);
      }
    };

    loadConversations();
  }, [user, authLoading]);

  const [isLoading, setIsLoading] = useState(false);

  const currentMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  const currentConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId) return;

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => ({
        ...prev,
        [activeConversationId]: [...(prev[activeConversationId] || []), userMessage],
      }));

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? { ...conv, lastMessage: content, timestamp: new Date() }
            : conv
        )
      );

      setIsLoading(true);

      try {
        // backend expects numeric conversation id
        const convId = Number(activeConversationId);
        const res = await api.askWithHistory(convId, content);

        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: res.response,
          timestamp: new Date(),
        };

        setMessages((prev) => ({
          ...prev,
          [activeConversationId]: [
            ...(prev[activeConversationId] || []),
            assistantMessage,
          ],
        }));
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || 'Failed to get response. Please try again.',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeConversationId]
  );

const uploadFile = useCallback(
  async (file: File, question: string) => {
    if (!activeConversationId) return;

    if (!question.trim()) {
      toast({
        title: "Missing question",
        description: "Please specify what you want to do with the document",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: `📎 ${file.name}\n\n${question}`,
      timestamp: new Date(),
    };

    setMessages((prev) => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), userMessage],
    }));

    setIsLoading(true);

    try {
      const convId = Number(activeConversationId);
      const res = await api.askPdfWithHistory(convId, file, question);

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: res.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => ({
        ...prev,
        [activeConversationId]: [
          ...(prev[activeConversationId] || []),
          assistantMessage,
        ],
      }));

      toast({
        title: "Document analyzed",
        description: `Processed ${file.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to analyze document",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  },
  [activeConversationId]
);


  const createConversation = useCallback(() => {
    (async () => {
      try {
        const convo = await api.createConversation('New Conversation');
        const id = String(convo.id);
        const newConv: Conversation = {
          id,
          title: convo.title,
          lastMessage: '',
          timestamp: new Date(convo.created_at),
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(id);
        setMessages((prev) => ({
          ...prev,
          [id]: [
            {
              id: generateId(),
              role: 'assistant',
              content: "Hello! I'm your legal assistant. How can I help you today?",
              timestamp: new Date(),
            },
          ],
        }));
      } catch (err) {
        toast({ title: 'Error', description: 'Could not create conversation', variant: 'destructive' });
      }
    })();
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setMessages((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });

      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConversationId(remaining[0]?.id || null);
      }
    },
    [activeConversationId, conversations]
  );

  return {
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
  };
}
