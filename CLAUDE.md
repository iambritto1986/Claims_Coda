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
  - **Gemini Multimodal Live API** (default voice engine as of 2026-09-12): Stateful bidirectional WebSocket stream (`wss://generativelanguage.googleapis.com/.../BidiGenerateContent`, `v1beta`) using `models/gemini-3.1-flash-live-preview` with the **Zephyr** prebuilt voice for true speech-to-speech audio streaming — mic in, model voice out, no separate STT/TTS round-trip. Switched to primary because it only depends on the Gemini key already used everywhere else in the app, unlike ElevenLabs, which is a separate paid/quota-limited account (see below). See `src/lib/geminiLiveClient.ts`.
  - **ElevenLabs Voice Engine** (secondary/alternate): Natural neural text-to-speech (`eleven_turbo_v2_5`) for every Voice Advocate reply and the Floating Avatar Guide's narration, paired with Gemini text + browser `SpeechRecognition` for mic input. Requires its own ElevenLabs API key and consumes that account's character quota — a 401 `quota_exceeded` response means the ElevenLabs plan's credits ran out (not a bug); it needs a paid plan or to wait for the quota to reset. See `src/lib/elevenLabsService.ts`.
  - **Gemini text model** (`GEMINI_TEXT_MODEL` in `src/lib/geminiService.ts`, currently `gemini-3.6-flash`): Via `@google/genai` for document extraction, grounded appeal draft generation, and the ElevenLabs-path conversational advocate replies. **`gemini-2.5-flash` was retired by Google and returned HTTP 404 on every call** — every `catch` around these calls only does `console.warn`, so this failed 100% silently: extraction fell back to a regex/deterministic parser, drafting fell back to a static template, and the Voice Advocate fell back to a keyword-matched canned-response function (`runIntelligentConversationalFallback`), which is why replies looked scripted/"non-intelligent" instead of actually reasoning about what was said. Fixed 2026-09-11 by switching to `gemini-3.6-flash` (verified live against the API). If this ever recurs, check the browser console for `Gemini ... call notice:` warnings first — that's the tell — then verify the model ID against `https://ai.google.dev/gemini-api/docs/models`.
  - **Empathetic Neural Voice Engine**: Browser `SpeechSynthesis` — last-resort fallback only, used solely on the ElevenLabs path when neither ElevenLabs nor its API key is available. Calibrated personas (*Aoede / Elena, Charon / Marcus, Kore / Sarah, Puck, Fenrir*).
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
│   │   ├── VoiceAdvocateModal.tsx      # Voice Advocate modal — Gemini Live (Zephyr, default) + ElevenLabs (secondary)
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
│   │   ├── elevenLabsService.ts        # ElevenLabs streaming TTS — secondary voice engine (needs its own paid quota)
│   │   ├── geminiLiveClient.ts         # WebSocket client for Gemini Multimodal Live API — default voice engine (Zephyr)
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

### How the Voice Advocate Works (default path — Gemini Live, "Zephyr"):
Changed 2026-09-12: Gemini Live (Zephyr voice) is now the default engine in `VoiceAdvocateModal.tsx` (`engine` state defaults to `'gemini-live'`, `selectedVoice` defaults to `'Zephyr'`), matching the model/voice combination already used and verified in another app in this workspace. ElevenLabs became a secondary/optional engine after its account ran out of API credits mid-session (a 401 `quota_exceeded` response — a real ElevenLabs billing limit, not a code defect) and because it depends on a separate paid account rather than the Gemini key already used everywhere else in ClaimCoda.
1. Opening "Talk to Advocate" connects directly to Google's **Gemini Multimodal Live API** over WebSocket for true low-latency speech-to-speech — mic in, Zephyr's voice out, no separate STT/TTS round-trip.
2. `geminiLiveClient.ts` sends a hidden kickoff turn right after connecting so Zephyr greets first (`sendTextMessage(..., announceAsUser: false)`) — it's sent as a real turn (Gemini requires one to generate a response) but suppressed from the on-screen transcript so it doesn't look like the user typed it. The visible transcript then fills in from the model's own spoken reply via `onModelTranscript`.
3. WebSocket: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=YOUR_API_KEY`.
4. **Microphone Uplink**: 16kHz 16-bit Linear PCM Little-Endian (`audio/pcm;rate=16000`).
5. **Model Downlink**: 24kHz PCM (`audio/pcm;rate=24000`) played via Web Audio API `AudioContext`.
6. **Model**: `models/gemini-3.1-flash-live-preview` by default (matches the other app's verified setup); `models/gemini-2.5-flash-native-audio-preview-12-2025` selectable as an alternative.
7. **Supported Prebuilt Voices**: `Zephyr` (Default, Reassuring & Confident), `Aoede` (Warm), `Kore` (Firm), `Charon` (Deep), `Puck` (Upbeat), `Fenrir` (Direct).
8. Preview/experimental Live models get retired by Google with little notice — if this engine ever silently stops working again, check whether the configured model ID is still listed at `ai.google.dev/gemini-api/docs/models` and update `GEMINI_LIVE_MODELS` in `geminiLiveClient.ts`. This is exactly what happened with an earlier default, `gemini-2.0-flash-exp`.
9. If no Gemini key is configured, the modal shows a nudge to add one in Settings rather than silently doing nothing.

### Secondary engine: ElevenLabs + Gemini text
Settings → ElevenLabs Voice switches to the older pipeline:
1. User speaks → the browser's native `SpeechRecognition` transcribes it (no extra API key, no extra round-trip).
2. The transcript + case context go to **Gemini** (`generateConversationalAdvocateResponse` in `geminiService.ts`) for a grounded, concise reply.
3. The reply is spoken aloud via **ElevenLabs** streaming TTS (`elevenLabsService.ts`, `eleven_turbo_v2_5` model).
4. If ElevenLabs isn't configured, or a request fails (including quota exhaustion), it falls back to the robotic browser voice so the advocate is never silent — this is graceful degradation working as intended, not a bug, though it does mean a quota-exhausted key makes every subsequent reply on this path sound robotic until the quota resets or the plan is upgraded.

Six curated ElevenLabs voices ship out of the box; any ElevenLabs API key can also pull the account's full custom voice library.

### Security & API Keys:
- API keys (Gemini, ElevenLabs) are stored client-side in browser `localStorage`, or via `.env.local` (`VITE_GEMINI_API_KEY`, `VITE_ELEVENLABS_API_KEY`).
- Keys are **never exposed in cleartext** in the UI (masked with password fields).
- Standard Google AI Studio API keys begin with `AIzaSy...`.
- The Live API path opens its WebSocket directly from the browser with the Gemini key in the URL, same trust model as the existing client-side Gemini `generateContent` calls elsewhere in this app — not a new exposure, but still bound by the same pre-production key-exposure gap tracked in Section 7.

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
