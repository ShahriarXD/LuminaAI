import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { streamChat } from "@/lib/chat-api";
import { AppSidebar } from "@/components/AppSidebar";
import { HeroOrb } from "@/components/HeroOrb";
import { ActionChips } from "@/components/ActionChips";
import { ChatInput } from "@/components/ChatInput";
import { toast } from "sonner";
import { User } from "lucide-react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface ChatRecord {
  id: string;
  title: string;
  updated_at: string;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chats
  const loadChats = useCallback(async () => {
    const { data } = await supabase
      .from("chats")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (data) setChats(data);
  }, []);

  // Load messages for a chat
  const loadMessages = useCallback(async (chatId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMsg[]);
  }, []);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (user) loadChats();
  }, [user, loadChats]);

  useEffect(() => {
    if (activeChatId) loadMessages(activeChatId);
    else setMessages([]);
  }, [activeChatId, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createChat = async (firstMessage: string): Promise<string | null> => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();
    if (error) { toast.error("Failed to create chat"); return null; }
    await loadChats();
    return data.id;
  };

  const handleSend = async (message: string) => {
    if (isLoading) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = await createChat(message);
      if (!chatId) return;
      setActiveChatId(chatId);
    }

    const userMsg: ChatMsg = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);

    // Save user message
    await supabase.from("messages").insert({ chat_id: chatId, role: "user", content: message });

    setIsLoading(true);
    let assistantContent = "";

    const allMessages = [...messages, userMsg];

    await streamChat({
      messages: allMessages,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
          }
          return [...prev, { role: "assistant", content: assistantContent }];
        });
      },
      onDone: async () => {
        setIsLoading(false);
        if (assistantContent && chatId) {
          await supabase.from("messages").insert({ chat_id: chatId, role: "assistant", content: assistantContent });
        }
      },
      onError: (error) => {
        setIsLoading(false);
        toast.error(error);
      },
    });
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const handleDeleteChat = async (id: string) => {
    await supabase.from("chats").delete().eq("id", id);
    if (activeChatId === id) handleNewChat();
    loadChats();
  };

  const showHero = messages.length === 0;

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      <main className="ml-16 flex flex-1 flex-col">
        <header className="flex items-center justify-end px-6 py-4">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{user?.email}</span>
          </motion.div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8">
          {showHero ? (
            <div className="flex flex-col items-center gap-8">
              <motion.h1
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-center font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl"
                style={{ lineHeight: "1.1" }}
              >
                <span className="text-gradient-muted">AI Powered</span>{" "}
                <span className="text-foreground">Smart</span>
                <br />
                <span className="text-foreground">Chat Assistant</span>
              </motion.h1>

              <HeroOrb />

              <ActionChips onSelect={handleSend} />
              <ChatInput onSend={handleSend} isLoading={isLoading} />
            </div>
          ) : (
            <div className="flex w-full max-w-2xl flex-1 flex-col">
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-2 py-4 scrollbar-none">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "gradient-send text-primary-foreground"
                          : "glass text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="glass rounded-2xl px-4 py-3 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
              <div className="pb-4 pt-2">
                <ChatInput onSend={handleSend} isLoading={isLoading} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
