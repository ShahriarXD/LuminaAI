import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export interface UserProfile {
  name?: string;
  profession?: string;
  interests?: string;
  goals?: string;
  preferences?: string;
}

export interface SourceCitation {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export interface RAGChunk {
  content: string;
  fileName: string;
  chunkIndex: number;
}

export interface Memory {
  id: string;
  content: string;
  category: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;

export type ProviderType = "groq" | "lovable";

export const PROVIDERS = [
  { id: "groq" as const, label: "Groq", description: "Fast inference" },
  { id: "lovable" as const, label: "Lovable AI", description: "Gemini & GPT-5" },
] as const;

export const IMAGE_MODELS = [
  { id: "google/gemini-2.5-flash-image", label: "Flash Image", description: "Fast generation" },
  { id: "google/gemini-3-pro-image-preview", label: "Pro Image", description: "Higher quality" },
  { id: "google/gemini-3.1-flash-image-preview", label: "Flash Image Pro", description: "Fast + pro quality" },
] as const;

export type ImageModelId = typeof IMAGE_MODELS[number]["id"];

export const AVAILABLE_MODELS = [
  // Groq models
  { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B", description: "Most capable", provider: "groq" as const },
  { id: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B", description: "Fast & lightweight", provider: "groq" as const },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", description: "Balanced performance", provider: "groq" as const },
  // Lovable AI models
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Fast & capable", provider: "lovable" as const },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Most powerful", provider: "lovable" as const },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Next-gen fast", provider: "lovable" as const },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Strong & efficient", provider: "lovable" as const },
  { id: "openai/gpt-5", label: "GPT-5", description: "Premium reasoning", provider: "lovable" as const },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]["id"];

function parseSources(text: string): { cleanText: string; sources: SourceCitation[] } {
  const sourceMatch = text.match(/---SOURCES---\n?([\s\S]*?)\n?---END_SOURCES---/);
  if (!sourceMatch) return { cleanText: text, sources: [] };

  const cleanText = text.replace(/\n?---SOURCES---[\s\S]*?---END_SOURCES---\n?/, "").trim();
  try {
    const sources = JSON.parse(sourceMatch[1].trim());
    return { cleanText, sources };
  } catch {
    return { cleanText, sources: [] };
  }
}

export async function streamChat({
  messages,
  model,
  provider,
  deepThink,
  searchInternet,
  profile,
  ragContext,
  memories,
  onDelta,
  onDone,
  onError,
  onSources,
}: {
  messages: Msg[];
  model: ModelId;
  provider?: ProviderType;
  deepThink?: boolean;
  searchInternet?: boolean;
  profile?: UserProfile;
  ragContext?: RAGChunk[];
  memories?: Memory[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onSources?: (sources: SourceCitation[]) => void;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, model, provider, deepThink, searchInternet, profile, ragContext, memories }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Request failed" }));
      onError(err.error || "Request failed");
      return;
    }

    if (!resp.body) { onError("No response body"); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          // Parse sources from final content
          if (onSources && fullContent) {
            const { sources } = parseSources(fullContent);
            if (sources.length > 0) onSources(sources);
          }
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onDelta(content);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Parse sources from final content
    if (onSources && fullContent) {
      const { sources } = parseSources(fullContent);
      if (sources.length > 0) onSources(sources);
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Unknown error");
  }
}

// Helper to clean source markers from displayed text
export function cleanSourceMarkers(text: string): string {
  return text.replace(/\n?---SOURCES---[\s\S]*?---END_SOURCES---\n?/, "").trim();
}

// RAG: simple keyword-based retrieval from chunks
export async function retrieveRelevantChunks(
  query: string,
  userId: string,
  projectId: string | null,
  limit = 5
): Promise<RAGChunk[]> {
  // Get keywords from query
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5);

  if (keywords.length === 0) return [];

  // Search chunks using ilike for each keyword
  let queryBuilder = (supabase as any)
    .from("document_chunks")
    .select("content, chunk_index, metadata")
    .eq("user_id", userId)
    .limit(limit);

  // Build OR condition for keywords
  const orConditions = keywords.map(k => `content.ilike.%${k}%`).join(",");
  queryBuilder = queryBuilder.or(orConditions);

  const { data, error } = await queryBuilder;

  if (error || !data) return [];

  return data.map((chunk: any) => ({
    content: chunk.content,
    fileName: chunk.metadata?.file_name || "Document",
    chunkIndex: chunk.chunk_index,
  }));
}

// Fetch user memories
export async function fetchMemories(userId: string, limit = 20): Promise<Memory[]> {
  const { data, error } = await (supabase as any)
    .from("memories")
    .select("id, content, category")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// Trigger memory extraction (fire and forget)
export async function triggerMemoryExtraction(messages: Msg[], chatId: string | null) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages: messages.slice(-10), chatId }),
    });
  } catch {
    // Silent fail - memory extraction is non-critical
  }
}

// Image generation
export interface GeneratedImage {
  type: string;
  image_url: { url: string };
}

export async function generateImage({
  prompt,
  model,
  onResult,
  onError,
}: {
  prompt: string;
  model?: ImageModelId;
  onResult: (text: string, images: GeneratedImage[]) => void;
  onError: (error: string) => void;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const resp = await fetch(IMAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ prompt, model: model || "google/gemini-2.5-flash-image" }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Request failed" }));
      onError(err.error || "Image generation failed");
      return;
    }

    const data = await resp.json();
    onResult(data.text || "", data.images || []);
  } catch (e) {
    onError(e instanceof Error ? e.message : "Unknown error");
  }
}
