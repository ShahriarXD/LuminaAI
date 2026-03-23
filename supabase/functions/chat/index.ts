import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, deepThink, profile } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const selectedModel = model || "llama-3.3-70b-versatile";

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
        systemPrompt += "\n\nUser Profile:\n" + parts.join("\n") + "\n\nTailor your responses based on the user's profile, interests, and goals.";
      }
    }

    // Deep Think mode
    if (deepThink) {
      systemPrompt += "\n\n**Deep Think Mode Active:**\n- Think step-by-step before answering.\n- Break complex problems into smaller parts.\n- Provide structured and detailed explanations.\n- Consider multiple perspectives.\n- Use clear headings and numbered steps where appropriate.\n- Be thorough and analytical.";
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
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
      console.error("Groq API error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Groq API error: ${response.status}` }), {
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
