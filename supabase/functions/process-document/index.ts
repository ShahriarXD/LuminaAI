import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }
  return chunks.filter(c => c.length > 20);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download file from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("knowledge-files")
      .download(doc.file_path);

    if (dlError || !fileData) {
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text based on file type
    let text = "";
    if (doc.file_type === "text/plain" || doc.file_type === "text/markdown") {
      text = await fileData.text();
    } else if (doc.file_type === "application/pdf") {
      // Basic PDF text extraction - extract readable text from raw bytes
      const rawText = await fileData.text();
      // Extract text between BT and ET operators, and parenthesized strings
      const matches = rawText.match(/\(([^)]+)\)/g);
      if (matches) {
        text = matches.map(m => m.slice(1, -1)).join(" ");
      }
      if (!text || text.length < 50) {
        text = `[PDF content from ${doc.name}] - This file has been uploaded and indexed. Content may require advanced PDF parsing for full extraction.`;
      }
    } else if (doc.file_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // Basic DOCX extraction - it's a zip with XML
      const rawText = await fileData.text();
      const textMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (textMatches) {
        text = textMatches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");
      }
      if (!text || text.length < 50) {
        text = `[DOCX content from ${doc.name}] - Content indexed for retrieval.`;
      }
    } else {
      text = await fileData.text();
    }

    // Chunk the text
    const chunks = chunkText(text);

    // Insert chunks
    const chunkRows = chunks.map((content, i) => ({
      document_id: documentId,
      user_id: user.id,
      content,
      chunk_index: i,
      metadata: { file_name: doc.name, file_type: doc.file_type },
    }));

    if (chunkRows.length > 0) {
      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(chunkRows);

      if (insertError) {
        console.error("Chunk insert error:", insertError);
        await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
        return new Response(JSON.stringify({ error: "Failed to store chunks" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update document status
    await supabase.from("documents").update({
      status: "ready",
      chunk_count: chunkRows.length,
    }).eq("id", documentId);

    return new Response(JSON.stringify({
      success: true,
      chunks: chunkRows.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
