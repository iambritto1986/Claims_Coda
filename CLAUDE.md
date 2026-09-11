# ClaimCoda — Project Documentation & AI Guide (CLAUDE.md)

## 1. Project Overview & Mission
**ClaimCoda** is a consumer-first health insurance denial intelligence and appeal workspace. It transforms confusing denial letters (EOBs, Adverse Benefit Determinations) into legally grounded, evidence-backed 3-part appeal packets.

### Core Principles
- **Administrative & Organizational Scope Only**: Prepares structured administrative appeal packets and Level 2 Independent External Review (IRO) dossiers. Does NOT provide medical or legal advice.
- **Zero Invented Facts Guarantee**: Strict grounding — never hallucinates clinical codes (CPT/ICD-10), dates of service, or disputed amounts. Every extracted fact has exact source-page provenance.
- **Consumer Protections Enforced**: Cites statutory deadlines under **ERISA § 503 (29 CFR § 2560.503-1)** (180 calendar days for internal appeals) and **ACA § 2719 (45 CFR § 147.136)** (Independent External Review).

---

## 2. Tech Stack & Environment
- **Framework**: React 19 + TypeScript (`~5.8.2`) + Vite 6
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Lucide React Icons
- **PDF Generation**: `jspdf` (Dynamic multi-page pagination with formal letter, exhibit index, and certified mail tracking log)
- **AI Engines**:
  - **ElevenLabs Voice Engine** (default, recommended): Natural neural text-to-speech (`eleven_turbo_v2_5`) for every Voice Advocate reply and the Floating Avatar Guide's narration. Paired with **Google Gemini 2.5 Flash** for the conversational "brain" (reasoning about the case) and native `SpeechRecognition` (browser built-in, free) for mic input. See `src/lib/elevenLabsService.ts`.
  - **Google Gemini 2.5 Flash**: Via `@google/genai` for document extraction, grounded appeal draft generation, and conversational advocate replies.
  - **Gemini Multimodal Live API** (advanced/beta, opt-in): Stateful bidirectional WebSocket stream (`wss://generativelanguage.googleapis.com/.../BidiGenerateContent`, `v1beta`) using `models/gemini-2.5-flash-native-audio-preview-12-2025` for true speech-to-speech audio streaming with sub-second latency. Off by default — this depends on a preview model that Google can retire without notice (the previous default, `gemini-2.0-flash-exp`, was deprecated, which used to make every Live connection fail silently and fall back to the robotic browser voice below).
  - **Empathetic Neural Voice Engine**: Browser `SpeechSynthesis` — last-resort fallback only, used solely when neither ElevenLabs nor a working Gemini Live connection is available. Calibrated personas (*Aoede / Elena, Charon / Marcus, Kore / Sarah, Puck, Fenrir*).
- **Backend / Storage**: Firebase Firestore (with seamless offline/demo mode fallback for instant guest access without Firebase console errors).

---

## 3. Development Commands
```bash
# Start development server (Port 3000)
npm run dev

# Run TypeScript typecheck
npm run lint

# Build production bundle
npm run build

# Preview production build
npm run preview
```
*Note on Windows PowerShell*: Run `npm.cmd run dev` or `npm.cmd run build` if PowerShell script execution policies block standard `npm`.

---

## 4. Key Architecture & File Structure

```
App_ClaimsCoda/
├── src/
│   ├── components/
│   │   ├── VoiceAdvocateModal.tsx      # Gemini Multimodal Live API & Neural Voice Modal
│   │   ├── FloatingAvatarGuide.tsx     # Step-aware interactive floating avatar co-pilot
│   │   ├── ApiKeyModal.tsx             # Secure API Key Manager (Client-side stored)
│   │   ├── ExternalReviewModal.tsx     # Level 2 Independent External Review (IRO) dossier generator
│   │   ├── DualPaneSourceViewer.tsx    # Side-by-side denial PDF inspector & fact confirmation rail
│   │   ├── EvidenceManager.tsx         # Numbered exhibit index & document upload manager
│   │   ├── AppealEditor.tsx            # Grounded appeal draft editor with live fact validator
│   │   ├── PacketExportView.tsx        # 3-part PDF compilation & download screen
│   │   ├── RulesRegistryModal.tsx      # ERISA / ACA statutory deadline database
│   │   └── AuthProvider.tsx            # Firebase Auth + instant 1-click Demo/Guest mode
│   ├── lib/
│   │   ├── elevenLabsService.ts        # ElevenLabs streaming TTS — default, natural voice engine
│   │   ├── geminiLiveClient.ts         # WebSocket client for Gemini Multimodal Live API (advanced/beta)
│   │   ├── geminiService.ts            # Gemini 2.5 Flash document parser, draft builder & prompts
│   │   ├── documentIngest.ts           # Real PDF text extraction (pdf.js) for uploaded denials/EOBs — never fabricates content
│   │   ├── voiceSynthesis.ts           # Browser SpeechSynthesis — last-resort fallback voice engine
│   │   ├── pdfExporter.ts              # Dynamic multi-page PDF generation engine
│   │   ├── denialStrategies.ts         # 8 denial categories & evidence requirements
│   │   ├── rulesRegistry.ts            # Official CMS / ERISA / ACA statutory rules
│   │   └── sampleDenials.ts            # Synthetic test cases (MRI Lumbar Spine, ER Balance Bill)
│   ├── pages/
│   │   ├── Landing.tsx                 # Public homepage with Appeal Path motion & interactive calculator
│   │   ├── Dashboard.tsx               # Active Case Manager, Payer Directory, Outcome Tracker
│   │   └── CaseView.tsx                # 5-step guided appeal workflow
│   ├── types/
│   │   └── claimcoda.ts                # TypeScript schemas for Cases, Facts, Evidence, Drafts
│   ├── App.tsx                         # Router configuration
│   └── main.tsx                        # Root entry point
├── .env.local                          # Local environment variables (VITE_GEMINI_API_KEY)
└── package.json                        # Dependencies and scripts
```

---

## 5. Voice Advocate Setup

### How the Voice Advocate Works (default path):
1. User speaks → the browser's native `SpeechRecognition` transcribes it (no API key, no extra round-trip).
2. The transcript + case context go to **Gemini 2.5 Flash** (`generateConversationalAdvocateResponse` in `geminiService.ts`) for a grounded, concise reply.
3. The reply is spoken aloud via **ElevenLabs** streaming TTS (`elevenLabsService.ts`, `eleven_turbo_v2_5` model) — a real neural voice, not the robotic browser `SpeechSynthesis` API.
4. If ElevenLabs isn't configured yet, or a request fails, it falls back to the browser's built-in voice so the advocate is never silent — just lower quality until a key is added.

Six curated ElevenLabs voices ship out of the box (Settings → ElevenLabs Voice); any ElevenLabs API key can also pull the account's full custom voice library.

### Advanced: Gemini Live (Beta)
An alternate engine (Settings → Gemini Live (Beta)) connects directly to Google's **Gemini Multimodal Live API** for true low-latency speech-to-speech:
- WebSocket: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=YOUR_API_KEY`.
- **Microphone Uplink**: 16kHz 16-bit Linear PCM Little-Endian (`audio/pcm;rate=16000`).
- **Model Downlink**: 24kHz PCM (`audio/pcm;rate=24000`) played via Web Audio API `AudioContext`.
- **Model**: `models/gemini-2.5-flash-native-audio-preview-12-2025` by default (native audio — noticeably more natural than the older half-cascade preview models); `models/gemini-3.1-flash-live-preview` selectable as the newest alternative.
- **Supported Prebuilt Voices**: `Aoede` (Default, Warm), `Kore` (Firm), `Charon` (Deep), `Puck` (Upbeat), `Fenrir` (Direct).
- Preview/experimental Live models get retired by Google with little notice — if this engine ever silently stops working again, check whether the configured model ID is still listed at `ai.google.dev/gemini-api/docs/models` and update `GEMINI_LIVE_MODELS` in `geminiLiveClient.ts`. This is exactly what happened with the old default, `gemini-2.0-flash-exp`.

### Security & API Keys:
- API keys (Gemini, ElevenLabs) are stored client-side in browser `localStorage`, or via `.env.local` (`VITE_GEMINI_API_KEY`, `VITE_ELEVENLABS_API_KEY`).
- Keys are **never exposed in cleartext** in the UI (masked with password fields).
- Standard Google AI Studio API keys begin with `AIzaSy...`.

---

## 6. Document Ingestion (Real Uploads)

`src/lib/documentIngest.ts` reads real PDF text via `pdf.js` (`pdfjs-dist`) when a user uploads a denial/EOB PDF in `CaseView.tsx`. This replaced an earlier version that, for any non-`.txt` upload, silently substituted a hardcoded fake "Adverse Benefit Determination Notice" regardless of the file's actual content — meaning real uploads were never really analyzed. That has been fixed: PDFs with an embedded text layer are read for real; a scanned PDF with no text layer, or a PNG/JPG, is reported to the user as unreadable rather than fed fake content into extraction (there is no OCR pipeline yet — see gap below). Run `npm install` after pulling this change to pick up the new `pdfjs-dist` dependency.

`src/components/EvidenceManager.tsx`'s "Attach Document" control was also fixed: it used to fabricate a filename from the checklist label and mark the item "Attached" with no file ever selected. It now requires an actual file pick.

## 7. Known Gaps vs. the TRD (as of Sep 2026 review)

Tracked here so nothing gets silently re-broken or forgotten before a real (non-synthetic) pilot:

- **No OCR for scanned/image documents.** `documentIngest.ts` only reads a PDF's embedded text layer. A flat scan or a PNG/JPG denial letter is currently rejected with a clear message rather than faked — this is honest, but it means image-based denials can't be processed yet. TRD's fallback is Document AI OCR, which needs a server component (see next point).
- **No server-side orchestrator.** The TRD calls for "Node/Cloud Run + schema validators + RBAC" keeping Gemini/ElevenLabs keys server-side. This app is currently a pure static SPA (`render.yaml`/`vercel.json` both deploy it as static hosting) with API keys bundled into the client via `VITE_`-prefixed env vars or stored in `localStorage`. That's expected and fine for the AI Studio-first prototype/pilot phase the TRD itself describes, but it is a real key-exposure risk (anyone can read the key out of the deployed bundle) that must be closed — by moving Gemini/ElevenLabs calls behind a real backend — before any paid/production launch with a real committed key.
- **No `.gitignore` existed** until this pass — added one covering `node_modules/`, `dist/`, `.env*`, etc. If `.env` (which currently holds a real `VITE_GEMINI_API_KEY`) was ever committed to the GitHub repo before this fix, treat that key as compromised: rotate it in Google AI Studio and scrub it from git history — adding `.gitignore` now does not remove it retroactively.
- **No `audit_events` collection / full audit log.** `AppealDraft` does capture `promptVersion`, `modelUsed`, `generatedAt`, and `userApprovedAt`, which covers most of the TRD's P0 "Audit" requirement at the artifact level, but there's no separate log of sensitive state transitions (fact edits, exports, confirmations) as the TRD's data model lists.
- **Firestore schema doc (`firebase-blueprint.json`) is stale** — it only documents `users`, `cases`, and `documents`, not the `extractedFacts`/`evidenceItems`/`appealDraft` fields actually embedded in each case document (which `firestore.rules` does correctly allow and protect). Not a functional bug, just a documentation gap.
