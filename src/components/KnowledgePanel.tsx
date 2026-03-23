import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Trash2, Loader2, CheckCircle, AlertCircle, X, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentRecord {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: string;
  chunk_count: number;
  scope: string;
  created_at: string;
}

interface KnowledgePanelProps {
  userId: string;
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function KnowledgePanel({ userId, projectId, isOpen, onClose }: KnowledgePanelProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [scope, setScope] = useState<"personal" | "project">(projectId ? "project" : "personal");
  const [memories, setMemories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"files" | "memory">("files");

  const loadDocuments = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setDocuments(data as DocumentRecord[]);
  }, [userId]);

  const loadMemories = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setMemories(data);
  }, [userId]);

  useEffect(() => {
    if (isOpen) { loadDocuments(); loadMemories(); }
  }, [isOpen, loadDocuments, loadMemories]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        const filePath = `${userId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await (supabase as any).storage
          .from("knowledge-files")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: docData, error: docError } = await (supabase as any)
          .from("documents")
          .insert({
            user_id: userId,
            project_id: scope === "project" ? projectId : null,
            name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            status: "processing",
            scope,
          })
          .select("id")
          .single();

        if (docError) {
          toast.error(`Failed to create record for ${file.name}`);
          continue;
        }

        // Trigger processing
        const { data: { session } } = await supabase.auth.getSession();
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ documentId: docData.id }),
        }).then(() => {
          setTimeout(loadDocuments, 2000);
        });

        toast.success(`Uploading ${file.name}...`);
      } catch (err) {
        toast.error(`Error uploading ${file.name}`);
      }
    }

    setIsUploading(false);
    loadDocuments();
  };

  const handleDelete = async (doc: DocumentRecord) => {
    await (supabase as any).storage.from("knowledge-files").remove([doc.file_path]);
    await (supabase as any).from("documents").delete().eq("id", doc.id);
    toast.success("File deleted");
    loadDocuments();
  };

  const handleDeleteMemory = async (id: string) => {
    await (supabase as any).from("memories").delete().eq("id", id);
    toast.success("Memory removed");
    loadMemories();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "processing": return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />;
      case "ready": return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case "failed": return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return null;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 z-50 h-full w-80 glass-strong border-l border-border/50 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/30">
          <h3 className="font-display text-sm font-semibold text-foreground">Knowledge Base</h3>
          <button onClick={onClose} className="btn-icon-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-border/30">
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${activeTab === "files" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="h-3 w-3 inline mr-1" /> Files
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${activeTab === "memory" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Brain className="h-3 w-3 inline mr-1" /> Memory ({memories.length})
          </button>
        </div>

        {activeTab === "files" ? (
          <>
            {/* Scope selector */}
            {projectId && (
              <div className="flex gap-1 p-2 border-b border-border/30">
                <button
                  onClick={() => setScope("personal")}
                  className={`flex-1 text-[10px] font-medium py-1 rounded-md transition-colors ${scope === "personal" ? "bg-accent/10 text-accent" : "text-muted-foreground"}`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setScope("project")}
                  className={`flex-1 text-[10px] font-medium py-1 rounded-md transition-colors ${scope === "project" ? "bg-accent/10 text-accent" : "text-muted-foreground"}`}
                >
                  Project
                </button>
              </div>
            )}

            {/* Upload area */}
            <label className="mx-3 mt-3 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {isUploading ? "Uploading..." : "Drop files or click to upload"}
              </span>
              <span className="text-[10px] text-muted-foreground/60">PDF, TXT, MD, DOCX</span>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.txt,.md,.docx"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={isUploading}
              />
            </label>

            {/* File list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No files uploaded yet</p>
              ) : (
                documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    {statusIcon(doc.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatSize(doc.file_size)} · {doc.chunk_count} chunks · {doc.scope}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="btn-icon-sm text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
            {memories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No memories yet. Chat more and I'll remember important things!
              </p>
            ) : (
              memories.map((mem) => (
                <motion.div
                  key={mem.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex items-start gap-2 rounded-xl px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-md shrink-0 mt-0.5">
                    {mem.category}
                  </span>
                  <p className="text-xs text-foreground flex-1">{mem.content}</p>
                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="btn-icon-sm text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
