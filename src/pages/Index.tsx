import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type ModelId, type UserProfile } from "@/lib/chat-api";
import { AppSidebar } from "@/components/AppSidebar";
import { HeroOrb } from "@/components/HeroOrb";
import { ActionChips } from "@/components/ActionChips";
import { ChatInput } from "@/components/ChatInput";
import { ModelSelector } from "@/components/ModelSelector";
import ProfilePage from "@/pages/ProfilePage";
import { toast } from "sonner";

interface ChatMsg { role: "user" | "assistant"; content: string; }
interface ChatRecord { id: string; title: string; updated_at: string; project_id: string | null; }
interface ProjectRecord { id: string; name: string; description: string | null; system_prompt: string | null; }

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelId>("llama-3.3-70b-versatile");
  const [profile, setProfile] = useState<UserProfile>({});
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    let query = supabase.from("chats").select("id, title, updated_at, project_id").order("updated_at", { ascending: false });
    if (activeProjectId) query = query.eq("project_id", activeProjectId);
    const { data } = await query;
    if (data) setChats(data);
  }, [activeProjectId]);

  const loadProjects = useCallback(async () => {
    const { data } = await supabase.from("projects").select("id, name, description, system_prompt").order("updated_at", { ascending: false });
    if (data) setProjects(data);
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    const { data } = await supabase.from("messages").select("role, content").eq("chat_id", chatId).order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMsg[]);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("name, profession, interests, goals, preferences").eq("user_id", userId).single();
    if (data) setProfile(data as UserProfile);
  }, []);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  useEffect(() => {
    if (user) { loadChats(); loadProjects(); loadProfile(user.id); }
  }, [user, loadChats, loadProjects, loadProfile]);

  useEffect(() => { if (activeChatId) loadMessages(activeChatId); else setMessages([]); }, [activeChatId, loadMessages]);
  useEffect(() => { loadChats(); }, [activeProjectId, loadChats]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const createChat = async (firstMessage: string): Promise<string | null> => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    const insertData: any = { user_id: user.id, title };
    if (activeProjectId) insertData.project_id = activeProjectId;
    const { data, error } = await supabase.from("chats").insert(insertData).select("id").single();
    if (error) { toast.error("Failed to create chat"); return null; }
    await loadChats();
    return data.id;
  };

  const handleSend = async (message: string, deepThink: boolean = false) => {
    if (isLoading) return;
    let chatId = activeChatId;
    if (!chatId) { chatId = await createChat(message); if (!chatId) return; setActiveChatId(chatId); }

    const userMsg: ChatMsg = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    await supabase.from("messages").insert({ chat_id: chatId, role: "user", content: message });

    setIsLoading(true);
    let assistantContent = "";

    await streamChat({
      messages: [...messages, userMsg],
      model,
      deepThink,
      profile,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
          return [...prev, { role: "assistant", content: assistantContent }];
        });
      },
      onDone: async () => {
        setIsLoading(false);
        if (assistantContent && chatId) await supabase.from("messages").insert({ chat_id: chatId, role: "assistant", content: assistantContent });
      },
      onError: (error) => { setIsLoading(false); toast.error(error); },
    });
  };

  const handleNewChat = () => { setActiveChatId(null); setMessages([]); };

  const handleDeleteChat = async (id: string) => {
    await supabase.from("chats").delete().eq("id", id);
    if (activeChatId === id) handleNewChat();
    loadChats();
  };

  const handleCreateProject = async () => {
    const { data, error } = await supabase.from("projects").insert({ user_id: user.id, name: "New Project" }).select("id").single();
    if (error) { toast.error("Failed to create project"); return; }
    await loadProjects();
    setActiveProjectId(data.id);
    toast.success("Project created!");
  };

  const handleDeleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    if (activeProjectId === id) setActiveProjectId(null);
    loadProjects(); loadChats();
  };

  const handleRenameProject = async (id: string, name: string) => {
    await supabase.from("projects").update({ name }).eq("id", id);
    loadProjects();
  };

  if (showSettings) {
    return <ProfilePage onBack={() => { setShowSettings(false); loadProfile(user?.id); }} />;
  }

  const showHero = messages.length === 0;
  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="ml-16 flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <ModelSelector value={model} onChange={setModel} />
            {activeProject && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {activeProject.name}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[160px]">{profile.name || user?.email}</span>
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
              <ActionChips onSelect={(label) => handleSend(label, false)} />
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
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "gradient-send text-primary-foreground" : "glass text-foreground"}`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
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
