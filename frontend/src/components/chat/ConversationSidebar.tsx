import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus,
  MessageSquare,
  Trash2,
  Moon,
  Sun,
  Scale,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isDark,
  onToggleTheme,
}: ConversationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-72"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <Scale className="w-6 h-6 text-sidebar-primary" />
            <span className="font-serif text-lg font-semibold text-sidebar-accent-foreground">
              LegalChat
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
        >
          {isCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNew}
          className={cn(
            "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-all",
            isCollapsed ? "w-10 h-10 p-0" : "w-full"
          )}
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">New Chat</span>}
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-1">
        {conversations.map((conv, index) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full text-left rounded-lg transition-all group animate-slide-in-left",
              isCollapsed ? "p-2" : "p-3",
              activeId === conv.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
            )}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-sidebar-muted" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-sidebar-muted truncate">
                    {conv.lastMessage}
                  </p>
                </div>
              )}
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 text-sidebar-muted hover:text-destructive hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Button
          variant="ghost"
          onClick={onToggleTheme}
          className={cn(
            "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
            isCollapsed ? "w-10 h-10 p-0" : "w-full justify-start"
          )}
        >
          {isDark ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          {!isCollapsed && (
            <span className="ml-2">{isDark ? "Light Mode" : "Dark Mode"}</span>
          )}
        </Button>
        <SignOutButton isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}

function SignOutButton({ isCollapsed }: { isCollapsed: boolean }) {
  const { signOut } = useAuth();

  return (
    <Button
      variant="ghost"
      onClick={signOut}
      className={cn(
        "text-sidebar-muted hover:text-destructive hover:bg-sidebar-accent",
        isCollapsed ? "w-10 h-10 p-0" : "w-full justify-start"
      )}
    >
      <LogOut className="w-4 h-4" />
      {!isCollapsed && <span className="ml-2">Sign Out</span>}
    </Button>
  );
}
