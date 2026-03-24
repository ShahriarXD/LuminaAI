# LuminAI

LuminAI is a premium AI workspace built with Vite, React, TypeScript, and Supabase. It combines conversational chat, long-term memory, web-aware responses, file understanding, voice input/output, project workspaces, public chat sharing, and image OCR for question-paper understanding inside a polished glassmorphism UI.

## Features

- Premium AI chat interface with a persistent workspace feel
- Deep Think and web-search chat modes
- Long-term memory extraction and reuse across conversations
- Project-based chat organization
- Public chat sharing and export to Markdown/PDF
- Voice input and text-to-speech playback
- File knowledge base ingestion for document retrieval
- Image OCR with Groq vision for question papers and scanned documents
- Quick OCR follow-up actions like:
  - Extract Questions
  - Solve All
  - Solve Question 1
  - Make Answer Key
  - Convert to Markdown
  - Summarize Paper

## Tech Stack

- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS, shadcn/ui, custom design tokens in `src/index.css`
- Motion: Framer Motion
- 3D / Visual identity: React Three Fiber, Drei
- Backend: Supabase
- Auth / DB / Storage: Supabase Auth, Postgres, Storage, Edge Functions
- AI provider: Groq
- Testing: Vitest, Testing Library, Playwright
- Deployment: Vercel for the frontend, Supabase for backend services

## Project Structure

```text
.
├── src/
│   ├── components/         # UI building blocks and chat surfaces
│   ├── components/chat/    # Message rendering, markdown, OCR quick actions
│   ├── hooks/              # Mobile detection, voice, speech helpers
│   ├── integrations/       # Supabase client and generated DB types
│   ├── lib/                # Chat API, OCR helpers, exports, utilities
│   ├── pages/              # Landing page, main workspace, profile, shared chat
│   └── index.css           # Design tokens and shared surface styles
├── supabase/
│   ├── functions/          # Edge Functions for chat, OCR, memory, docs
│   ├── migrations/         # Database schema migrations
│   └── config.toml         # Function config
├── public/
├── vercel.json
└── package.json
```

## Main App Flows

### Chat

The main authenticated app lives in `src/pages/Index.tsx`. It handles:

- loading chats, projects, profile, and memories
- streaming assistant responses through the Supabase `chat` edge function
- storing messages in Supabase
- rendering assistant markdown and citations
- voice playback controls

### OCR / Question-Paper Understanding

Image OCR is integrated into the existing chat workflow, not as a separate tool. The flow is:

1. User clicks `Upload` in chat and selects an image
2. Frontend validates and previews the image
3. Frontend calls the Supabase `process-image-ocr` edge function
4. Groq vision extracts text and structure from the image
5. OCR output is saved as an assistant message in the same chat
6. Follow-up prompts reuse the extracted paper text from message history

Relevant files:

- `src/components/ChatInput.tsx`
- `src/pages/Index.tsx`
- `src/components/chat/ChatMessage.tsx`
- `src/components/chat/OCRQuickActions.tsx`
- `src/lib/ocr/api.ts`
- `src/lib/ocr/types.ts`
- `supabase/functions/process-image-ocr/index.ts`

### Knowledge Base / RAG

The project includes document ingestion and chunk retrieval through:

- `supabase/functions/process-document/index.ts`
- `src/components/KnowledgePanel.tsx`

Note: the knowledge panel is currently kept in the codebase but hidden from the visible app UI.

## Prerequisites

Before running locally, make sure you have:

- Node.js 20+
- npm 10+ or another compatible package manager
- A Supabase project
- A Groq API key
- Vercel account only if you want to deploy the frontend
- Supabase CLI if you want to deploy functions or push migrations

## Environment Variables

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Client-side variables:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |

Server-side secrets are used inside Supabase Edge Functions, not in the Vite app:

| Secret | Required | Used For |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Chat responses and image OCR |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Edge Functions that need elevated DB/storage access |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Update `.env` with your Supabase project values.

### 3. Run the app

```bash
npm run dev
```

Vite will start the local app, typically at `http://localhost:5173`.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
npm run test:watch
```

## Supabase Setup

This repo expects a Supabase project with:

- chat tables
- messages
- projects
- profiles
- documents and document chunks
- memories
- edge functions for chat, memory extraction, document processing, and OCR

### Link the project

```bash
npx supabase link --project-ref tqzbgfuvshggftbfucfx
```

### Push migrations

```bash
npx supabase db push
```

### Deploy edge functions

```bash
npx supabase functions deploy chat
npx supabase functions deploy extract-memories
npx supabase functions deploy process-document
npx supabase functions deploy process-image-ocr
```

### Set Groq secret

```bash
npx supabase secrets set GROQ_API_KEY=your_real_groq_api_key
```

## Important Operational Note

If your remote database schema already exists but migration history is missing, `supabase db push` may fail with `relation already exists`. In that case:

1. open Supabase SQL Editor
2. apply the missing schema change manually if needed
3. repair migration history carefully before future pushes

For the OCR rollout, the required schema change is:

```sql
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_metadata JSONB;
```

## OCR / Vision Model Notes

OCR uses a Groq vision-capable model through the `process-image-ocr` function. The function:

- validates image payloads
- rejects unsupported formats or oversized files
- sends the image and structured OCR prompt to Groq
- extracts visible text and question-paper structure
- returns normalized OCR result JSON to the app

Supported image types:

- PNG
- JPG / JPEG
- WEBP

Current frontend validation limit:

- 8 MB per image

## Deployment

### Frontend

This app is configured for Vercel. Routing is handled in `vercel.json` so SPA routes resolve correctly.

Typical Vercel flow:

1. import the repo into Vercel
2. set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. deploy

### Backend

Supabase handles:

- auth
- database
- file storage
- edge functions

Frontend deployment and Supabase deployment are separate steps.

## Testing and Validation

Recommended checks before pushing:

```bash
npx tsc --noEmit
npm run build
```

Optional:

```bash
npm run lint
npm run test
```

## UI / Design Notes

LuminAI intentionally keeps its existing premium visual language:

- glassmorphism surfaces
- bright premium light theme
- orb-centered identity
- soft motion and polished transitions
- chat-first layout

The README does not describe the app as a generic dashboard because the codebase is built around a distinctive AI workspace aesthetic and conversational workflow.

## Known Caveats

- Some builds may still warn about a large client chunk from Vite bundling
- Repo-wide lint may include pre-existing warnings outside the latest feature work
- OCR depends on a valid deployed Groq secret and Supabase edge function availability
- Knowledge Base / Memory logic still exists in code, but those surfaces may be hidden from the visible UI depending on the current product direction

## Recommended GitHub README Add-ons

If you want to polish the repository even more after this README, add:

- screenshots or a GIF of the chat + OCR flow
- architecture diagram for frontend and Supabase functions
- sample `.env` walkthrough
- contribution guidelines
- issue templates
- license file

## Repository Summary

LuminAI is a production-oriented AI workspace that blends premium UI, Groq-powered chat, persistent memory, document retrieval, voice interaction, and image OCR into a single React + Supabase application. It is designed to feel like a polished AI product rather than a demo, while keeping the code modular enough to extend with new chat capabilities over time.
