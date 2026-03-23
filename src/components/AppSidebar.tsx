import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, MessageSquare, FolderKanban, LogOut, Plus, Trash2, X,
  Pencil, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Chat {
  id: string;
  title: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface AppSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onOpenSettings: () => void;
}

type Panel = "none" | "chats" | "projects";

export function AppSidebar({
  chats, activeChatId, onSelectChat, onNewChat, onDeleteChat,
  projects = [], activeProjectId, onSelectProject, onCreateProject, onDeleteProject, onRenameProject,
  onOpenSettings,
}: AppSidebarProps) {
  const [panel, setPanel] = useState<Panel>("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const togglePanel = (p: Panel) => setPanel(panel === p ? "none" : p);

  const startRename = (proj: Project) => { setEditingId(proj.id); setEditName(proj.name); };
  const commitRename = () => {
    if (editingId && editName.trim()) onRenameProject(editingId, editName.trim());
    setEditingId(null);
  };

  const activeProject = (projects || []).find((p) => p.id === activeProjectId);

  return (
    <>
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
          <SidebarIcon icon={Sparkles} label="New Chat" onClick={onNewChat} />
          <SidebarIcon icon={MessageSquare} label="Chats" active={panel === "chats"} onClick={() => togglePanel("chats")} />
          <SidebarIcon icon={FolderKanban} label="Projects" active={panel === "projects"} onClick={() => togglePanel("projects")} />
          <SidebarIcon icon={Settings} label="Settings" onClick={onOpenSettings} />
        </nav>

        <SidebarIcon icon={LogOut} label="Logout" onClick={handleLogout} />
      </motion.aside>

      <AnimatePresence>
        {panel !== "none" && (
          <motion.div
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-16 top-0 z-30 h-full w-64 glass-strong border-r border-border/50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/30">
              <h3 className="font-display text-sm font-semibold text-foreground">
                {panel === "chats" ? "Chat History" : "Projects"}
              </h3>
              <button onClick={() => setPanel("none")} className="btn-icon-sm text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {panel === "chats" && activeProject && (
              <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs text-primary">
                <FolderKanban className="h-3 w-3" />
                <span className="truncate font-medium">{activeProject.name}</span>
                <button onClick={() => onSelectProject(null)} className="ml-auto btn-icon-sm text-primary/60 hover:text-primary">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-none p-2 space-y-1">
              {panel === "chats" ? (
                chats.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No chats yet</p>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 hover:translate-x-0.5 ${
                        activeChatId === chat.id ? "bg-primary/10 text-foreground shadow-soft" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                      onClick={() => { onSelectChat(chat.id); setPanel("none"); }}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="flex-1 truncate">{chat.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                        className="opacity-0 group-hover:opacity-100 btn-icon-sm text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )
              ) : (
                <>
                  <button
                    onClick={() => onSelectProject(null)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 hover:translate-x-0.5 ${
                      activeProjectId === null ? "bg-primary/10 text-foreground shadow-soft" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <span>All Chats</span>
                  </button>

                  {(projects || []).map((proj) => (
                    <div
                      key={proj.id}
                      className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 hover:translate-x-0.5 ${
                        activeProjectId === proj.id ? "bg-primary/10 text-foreground shadow-soft" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                      onClick={() => { onSelectProject(proj.id); setPanel("chats"); }}
                    >
                      <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      {editingId === proj.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => e.key === "Enter" && commitRename()}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="flex-1 bg-transparent text-sm outline-none border-b border-primary/30"
                        />
                      ) : (
                        <span className="flex-1 truncate">{proj.name}</span>
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        <button onClick={(e) => { e.stopPropagation(); startRename(proj); }} className="btn-icon-sm text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteProject(proj.id); }} className="btn-icon-sm text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="p-2 border-t border-border/30">
              <button
                onClick={() => {
                  if (panel === "chats") { onNewChat(); setPanel("none"); }
                  else onCreateProject();
                }}
                className="btn-premium flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground"
              >
                <Plus className="h-4 w-4" />
                {panel === "chats" ? "New Chat" : "New Project"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarIcon({
  icon: Icon, label, active, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 btn-press ${
        active ? "bg-muted text-foreground shadow-soft" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
      <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-primary-foreground opacity-0 shadow-glass transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1">
        {label}
      </span>
    </button>
  );
}
