import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, chatId } = await req.json();

    // Use Lovable AI to extract key facts
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversationText = messages
      .slice(-10) // Last 10 messages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Extract key personal facts, preferences, and important information about the user from this conversation. Return a JSON array of objects with "content" (the fact) and "category" (one of: preference, fact, goal, interest, skill, context). Only extract genuinely useful long-term facts. If nothing notable, return an empty array. Return ONLY valid JSON array, no other text.`,
          },
          { role: "user", content: conversationText },
        ],
        tools: [{
          type: "function",
          function: {
            name: "store_memories",
            description: "Store extracted memories from conversation",
            parameters: {
              type: "object",
              properties: {
                memories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      content: { type: "string" },
                      category: { type: "string", enum: ["preference", "fact", "goal", "interest", "skill", "context"] },
                    },
                    required: ["content", "category"],
                  },
                },
              },
              required: ["memories"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "store_memories" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let memories: any[] = [];

    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        memories = parsed.memories || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    // Store memories
    if (memories.length > 0) {
      // Check for duplicates by content similarity
      const { data: existing } = await supabase
        .from("memories")
        .select("content")
        .eq("user_id", user.id);

      const existingContents = new Set((existing || []).map(m => m.content.toLowerCase()));
      const newMemories = memories.filter(
        (m: any) => !existingContents.has(m.content.toLowerCase())
      );

      if (newMemories.length > 0) {
        await supabase.from("memories").insert(
          newMemories.map((m: any) => ({
            user_id: user.id,
            content: m.content,
            category: m.category,
            source_chat_id: chatId || null,
            importance: 5,
          }))
        );
      }

      return new Response(JSON.stringify({ extracted: newMemories.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ extracted: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-memories error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
