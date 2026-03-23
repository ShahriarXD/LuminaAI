import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, deepThink, searchInternet, profile, provider, ragContext, memories } = await req.json();

    // Determine provider and API config
    const selectedProvider = provider || "groq";
    let apiUrl: string;
    let apiKey: string;
    let selectedModel: string;

    if (selectedProvider === "lovable") {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) throw new Error("LOVABLE_API_KEY is not configured");
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = key;
      selectedModel = model || "google/gemini-2.5-flash";
    } else {
      const key = Deno.env.get("GROQ_API_KEY");
      if (!key) throw new Error("GROQ_API_KEY is not configured");
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      apiKey = key;
      selectedModel = model || "llama-3.3-70b-versatile";
    }

    // Build system prompt
    let systemPrompt = "You are a helpful AI assistant. You provide clear, concise, and accurate responses. Be friendly and conversational.";

    // Inject user profile
    if (profile) {
      const parts: string[] = [];
      if (profile.name) parts.push(`The user's name is ${profile.name}.`);
      if (profile.profession) parts.push(`They work as a ${profile.profession}.`);
      if (profile.interests) parts.push(`Their interests include: ${profile.interests}.`);
      if (profile.goals) parts.push(`Their goals are: ${profile.goals}.`);
      if (profile.preferences) parts.push(`Their preferences: ${profile.preferences}.`);
      if (parts.length > 0) {
        systemPrompt += "\n\nUser Profile:\n" + parts.join("\n") + "\n\nTailor your responses based on the user's profile.";
      }
    }

    // Inject long-term memories
    if (memories && memories.length > 0) {
      systemPrompt += "\n\n**Long-term Memory:**\nYou remember these facts about the user from previous conversations:\n";
      systemPrompt += memories.map((m: any) => `- [${m.category}] ${m.content}`).join("\n");
      systemPrompt += "\n\nUse these memories naturally. Don't explicitly say 'I remember' unless the user asks about your memory.";
    }

    // Inject RAG context
    if (ragContext && ragContext.length > 0) {
      systemPrompt += "\n\n**Knowledge Base Context:**\nThe following information was retrieved from the user's uploaded documents. Use it to answer when relevant:\n\n";
      ragContext.forEach((chunk: any, i: number) => {
        systemPrompt += `[Source: ${chunk.fileName || 'Document'}, Chunk ${i + 1}]\n${chunk.content}\n\n`;
      });
      systemPrompt += "When using information from these sources, cite them clearly (e.g., 'According to [filename]...'). If the retrieved context doesn't answer the question, use your general knowledge but mention that.\n";
    }

    // Search Internet mode
    if (searchInternet) {
      systemPrompt += `\n\n**Web Search Mode Active:**
- The user has requested live web-aware responses.
- Simulate providing current, up-to-date information in your answers.
- Structure your response with clear sections.
- Include source citations in this format at the end of your response:

---SOURCES---
[{"title": "Example Source", "url": "https://example.com", "snippet": "Brief description of the source content", "domain": "example.com"}]
---END_SOURCES---

Always include 2-4 realistic source citations when in web search mode.
- Distinguish between your general knowledge and information that would come from live web results.`;
    }

    // Deep Think mode
    if (deepThink) {
      systemPrompt += "\n\n**Deep Think Mode Active:**\n- Think step-by-step before answering.\n- Break complex problems into smaller parts.\n- Provide structured and detailed explanations.\n- Consider multiple perspectives.\n- Use clear headings and numbered steps where appropriate.\n- Be thorough and analytical.";
    }

    // Both modes combined
    if (searchInternet && deepThink) {
      systemPrompt += "\n\n**Combined Mode:** You are using both web search and deep thinking. First gather and present current web information, then provide a thorough analytical breakdown of the findings.";
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("API error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
