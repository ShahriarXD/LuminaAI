import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export interface UserProfile {
  name?: string;
  profession?: string;
  interests?: string;
  goals?: string;
  preferences?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export const AVAILABLE_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B", description: "Most capable" },
  { id: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B", description: "Fast & lightweight" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", description: "Balanced performance" },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]["id"];

export async function streamChat({
  messages,
  model,
  deepThink,
  searchInternet,
  profile,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  model: ModelId;
  deepThink?: boolean;
  searchInternet?: boolean;
  profile?: UserProfile;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, model, deepThink, searchInternet, profile }),
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
        if (jsonStr === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Unknown error");
  }
}
