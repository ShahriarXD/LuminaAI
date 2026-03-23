import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  streamChat, cleanSourceMarkers, retrieveRelevantChunks, fetchMemories, triggerMemoryExtraction,
  type ModelId, type ProviderType, type UserProfile, type SourceCitation, type RAGChunk, type Memory,
} from "@/lib/chat-api";
import { AppSidebar } from "@/components/AppSidebar";
import { HeroOrb, type OrbState } from "@/components/HeroOrb";
import { ActionChips } from "@/components/ActionChips";
import { ChatInput } from "@/components/ChatInput";
import { ModelSelector } from "@/components/ModelSelector";
import { SpeakButton } from "@/components/SpeakButton";
import { SourceCitations } from "@/components/SourceCitations";
import { SearchStatus } from "@/components/SearchStatus";
import { KnowledgePanel } from "@/components/KnowledgePanel";
import ProfilePage from "@/pages/ProfilePage";
import { exportAsMarkdown, exportAsPdf } from "@/lib/export-chat";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface ChatMsg { role: "user" | "assistant"; content: string; sources?: SourceCitation[]; }
interface ChatRecord { id: string; title: string; updated_at: string; project_id: string | null; is_pinned?: boolean; tags?: string[]; }
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
  const [provider, setProvider] = useState<ProviderType>("groq");
  const [profile, setProfile] = useState<UserProfile>({});
  const [showSettings, setShowSettings] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tts = useTextToSpeech();
  const isMobile = useIsMobile();

  const loadChats = useCallback(async () => {
    let query = supabase.from("chats").select("id, title, updated_at, project_id, is_pinned, tags").order("updated_at", { ascending: false });
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

  const loadMemories = useCallback(async (userId: string) => {
    const mems = await fetchMemories(userId);
    setMemories(mems);
  }, []);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  useEffect(() => {
    if (user) { loadChats(); loadProjects(); loadProfile(user.id); loadMemories(user.id); }
  }, [user, loadChats, loadProjects, loadProfile, loadMemories]);

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

  const handleSend = async (message: string, deepThink: boolean = false, searchInternet: boolean = false) => {
    if (isLoading) return;
    let chatId = activeChatId;
    if (!chatId) { chatId = await createChat(message); if (!chatId) return; setActiveChatId(chatId); }

    const userMsg: ChatMsg = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    await supabase.from("messages").insert({ chat_id: chatId, role: "user", content: message });

    let ragContext: RAGChunk[] = [];
    if (user) {
      ragContext = await retrieveRelevantChunks(message, user.id, activeProjectId);
    }

    setIsLoading(true);
    let assistantContent = "";
    let msgSources: SourceCitation[] = [];

    await streamChat({
      messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
      model,
      provider,
      deepThink,
      searchInternet,
      profile,
      ragContext: ragContext.length > 0 ? ragContext : undefined,
      memories: memories.length > 0 ? memories : undefined,
      onDelta: (chunk) => {
        assistantContent += chunk;
        const displayContent = cleanSourceMarkers(assistantContent);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: displayContent } : m));
          return [...prev, { role: "assistant", content: displayContent }];
        });
      },
      onSources: (sources) => {
        msgSources = sources;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, sources } : m));
          return prev;
        });
      },
      onDone: async () => {
        setIsLoading(false);
        const cleanContent = cleanSourceMarkers(assistantContent);
        if (cleanContent && chatId) {
          await supabase.from("messages").insert({ chat_id: chatId, role: "assistant", content: cleanContent });
        }
        if (chatId) {
          triggerMemoryExtraction(
            [...messages, userMsg, { role: "assistant" as const, content: cleanContent }],
            chatId
          );
          setTimeout(() => { if (user) loadMemories(user.id); }, 5000);
        }
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

  const handlePinChat = async (id: string, pinned: boolean) => {
    await supabase.from("chats").update({ is_pinned: pinned } as any).eq("id", id);
    loadChats();
  };

  const handleShareChat = async (id: string) => {
    const shareId = crypto.randomUUID().slice(0, 12);
    await supabase.from("chats").update({ is_public: true, share_id: shareId } as any).eq("id", id);
    const url = `${window.location.origin}/shared/${shareId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard!");
    loadChats();
  };

  const handleExportChat = async (id: string, format: "md" | "pdf") => {
    const chat = chats.find((c) => c.id === id);
    const { data: msgs } = await supabase.from("messages").select("role, content").eq("chat_id", id).order("created_at", { ascending: true });
    if (!msgs) return;
    if (format === "md") exportAsMarkdown(chat?.title || "Chat", msgs);
    else exportAsPdf(chat?.title || "Chat", msgs);
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

  const handleModelChange = (newModel: ModelId, newProvider: ProviderType) => {
    setModel(newModel);
    setProvider(newProvider);
  };

  if (showSettings) {
    return <ProfilePage onBack={() => { setShowSettings(false); loadProfile(user?.id); }} />;
  }

  const showHero = messages.length === 0;
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const orbState: OrbState = isLoading ? "streaming" : "idle";

  return (
    <div className="flex min-h-screen min-h-[100dvh]">
      <AppSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onPinChat={handlePinChat}
        onShareChat={handleShareChat}
        onExportChat={handleExportChat}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onOpenSettings={() => setShowSettings(true)}
        onOpenKnowledge={() => setShowKnowledge(true)}
      />

      <main className={`flex flex-1 flex-col ${isMobile ? "ml-0" : "ml-16"}`}>
        <header className={`flex items-center justify-between py-3 ${isMobile ? "px-14 pt-4" : "px-6 py-4"}`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <ModelSelector value={model} provider={provider} onChange={handleModelChange} />
            {activeProject && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full truncate max-w-[120px] sm:max-w-none">
                {activeProject.name}
              </span>
            )}
            {memories.length > 0 && !isMobile && (
              <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                🧠 {memories.length} memories
              </span>
            )}
          </div>
          {!isMobile && (
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">{profile.name || user?.email}</span>
          )}
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-3 sm:px-4 pb-4 sm:pb-8">
          <AnimatePresence mode="wait">
            {showHero ? (
              <motion.div
                key="hero"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-5 sm:gap-8 w-full max-w-2xl"
              >
                <motion.h1
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight"
                  style={{ lineHeight: "1.1" }}
                >
                  <span className="text-gradient-muted">AI Powered</span>{" "}
                  <span className="text-foreground">Smart</span>
                  <br />
                  <span className="text-foreground">Chat Assistant</span>
                </motion.h1>
                <HeroOrb state={orbState} />
                <ActionChips onSelect={(label) => handleSend(label, false)} />
                <ChatInput onSend={handleSend} onAttach={() => setShowKnowledge(true)} isLoading={isLoading} />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex w-full max-w-2xl flex-1 flex-col"
              >
                <div ref={scrollRef} className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto px-1 sm:px-2 py-4 scrollbar-none">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.4, delay: i === 0 ? 0.15 : 0, ease: [0.16, 1, 0.3, 1] }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex flex-col ${isMobile ? "max-w-[90%]" : "max-w-[80%]"}`}>
                        <div
                          className={`rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "gradient-send text-primary-foreground shadow-glow"
                              : "glass text-foreground"
                          }`}
                          style={msg.role === "assistant" ? {
                            boxShadow: "0 2px 16px hsl(240 20% 50% / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.3)",
                          } : undefined}
                        >
                          {msg.content}
                        </div>
                        {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                          <SourceCitations sources={msg.sources} />
                        )}
                        {msg.role === "assistant" && tts.isSupported && msg.content && (
                          <SpeakButton
                            isPlaying={tts.isPlaying && speakingIdx === i}
                            isPaused={tts.isPaused && speakingIdx === i}
                            onSpeak={() => { setSpeakingIdx(i); tts.speak(msg.content); }}
                            onPause={tts.pause}
                            onResume={tts.resume}
                            onStop={() => { tts.stop(); setSpeakingIdx(null); }}
                          />
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="flex flex-col gap-1">
                        <SearchStatus isSearching={true} isThinking={true} hasRagContext={false} />
                        <div className="glass rounded-2xl px-4 py-3 text-sm text-muted-foreground" style={{ boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.3)" }}>
                          <span className="inline-flex gap-1">
                            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="pb-3 sm:pb-4 pt-2">
                  <ChatInput onSend={handleSend} onAttach={() => setShowKnowledge(true)} isLoading={isLoading} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {user && (
        <KnowledgePanel
          userId={user.id}
          projectId={activeProjectId}
          isOpen={showKnowledge}
          onClose={() => setShowKnowledge(false)}
        />
      )}
    </div>
  );
};

export default Index;
