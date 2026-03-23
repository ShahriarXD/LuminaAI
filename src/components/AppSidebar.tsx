import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, Settings, LogOut, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Chat {
  id: string;
  title: string;
  updated_at: string;
}

interface AppSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
}

export function AppSidebar({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat }: AppSidebarProps) {
  const [expanded, setExpanded] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Collapsed sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 z-40 flex h-full w-16 flex-col items-center py-6 glass"
      >
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <span className="font-display text-lg font-bold text-foreground">C</span>
        </div>

        <nav className="flex flex-1 flex-col items-center gap-2">
          <button
            onClick={onNewChat}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground active:scale-95"
          >
            <Sparkles className="h-[18px] w-[18px]" />
            <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-primary-foreground opacity-0 shadow-glass transition-opacity duration-150 group-hover:opacity-100">New Chat</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 ${expanded ? "bg-muted text-foreground shadow-soft" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
          >
            <MessageSquare className="h-[18px] w-[18px]" />
            <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-primary-foreground opacity-0 shadow-glass transition-opacity duration-150 group-hover:opacity-100">History</span>
          </button>
        </nav>

        <button
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-muted/50 hover:text-foreground active:scale-95"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </motion.aside>

      {/* Expanded chat history panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-16 top-0 z-30 h-full w-60 glass-strong border-r border-border/50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/30">
              <h3 className="font-display text-sm font-semibold text-foreground">Chat History</h3>
              <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none p-2 space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-all duration-150 ${
                    activeChatId === chat.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                  onClick={() => { onSelectChat(chat.id); setExpanded(false); }}
                >
                  <span className="flex-1 truncate">{chat.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {chats.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No chats yet</p>
              )}
            </div>
            <div className="p-2 border-t border-border/30">
              <button
                onClick={() => { onNewChat(); setExpanded(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <Plus className="h-4 w-4" /> New Chat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
