/**
 * ClaimCoda ElevenLabs Voice Engine
 *
 * Natural, expressive neural text-to-speech for the Voice Advocate. This
 * replaces the browser's built-in SpeechSynthesis engine (robotic, and
 * wildly inconsistent across Windows/macOS/Chrome/Edge) as the primary
 * spoken output whenever an ElevenLabs API key is configured, and is used
 * for every spoken line: the greeting, conversational replies, and the
 * Floating Avatar Guide's step narration.
 *
 * Falls back to the caller-supplied onError so the UI can drop back to the
 * legacy browser voice engine (voiceSynthesis.ts) when no key is set yet.
 */

export const ELEVENLABS_STORAGE_KEY = 'claimcoda_elevenlabs_api_key';
export const ELEVENLABS_VOICE_STORAGE_KEY = 'claimcoda_elevenlabs_voice_id';

export interface ElevenLabsVoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'female' | 'male';
}

// Stable, publicly-available ElevenLabs premade voices, curated for a warm,
// professional healthcare-advocate tone. These IDs are part of ElevenLabs'
// shared premade voice library and work for any account/API key.
export const ELEVEN_VOICES: ElevenLabsVoiceOption[] = [
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Elena — Reassuring & Confident',
    description: 'Warm, mature, reassuring — the default empathetic advocate voice',
    gender: 'female',
  },
  {
    id: 'hpp4J3VqNfWAUOO0d1Us',
    name: 'Grace — Bright & Professional',
    description: 'Bright, polished, professional and clear',
    gender: 'female',
  },
  {
    id: 'cjVigY5qzO86Huf0OWal',
    name: 'Marcus — Smooth & Trustworthy',
    description: 'Smooth, measured, confident advisory tone',
    gender: 'male',
  },
  {
    id: 'CwhRBWXzGAHq8TQ4Fs17',
    name: 'Roger — Laid-back & Resonant',
    description: 'Calm, easygoing, resonant conversational voice',
    gender: 'male',
  },
  {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George — Warm Storyteller',
    description: 'Deep, warm and captivating, quietly reassuring',
    gender: 'male',
  },
  {
    id: 'SAz9YHcvj6GT2YYXdXww',
    name: 'River — Relaxed & Neutral',
    description: 'Relaxed, neutral, easy to listen to for long sessions',
    gender: 'female',
  },
];

const DEFAULT_VOICE_ID = ELEVEN_VOICES[0].id;

export function getElevenLabsApiKey(): string {
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem(ELEVENLABS_STORAGE_KEY);
    if (key && key.trim()) return key.trim();
  }
  return (
    (import.meta as any).env?.VITE_ELEVENLABS_API_KEY ||
    (import.meta as any).env?.ELEVENLABS_API_KEY ||
    ''
  );
}

export function setElevenLabsApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key.trim()) {
    localStorage.setItem(ELEVENLABS_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(ELEVENLABS_STORAGE_KEY);
  }
}

export function getElevenLabsVoiceId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ELEVENLABS_VOICE_STORAGE_KEY);
    if (stored) return stored;
  }
  return DEFAULT_VOICE_ID;
}

export function setElevenLabsVoiceId(voiceId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ELEVENLABS_VOICE_STORAGE_KEY, voiceId);
}

export function isElevenLabsConfigured(): boolean {
  return getElevenLabsApiKey().length > 10;
}

/** Strip markdown/symbols so nothing gets read aloud literally. */
function sanitizeForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface SpeakOptions {
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  /** Called continuously with a 0..1 output loudness value, for waveform visualizers */
  onVolume?: (level: number) => void;
}

let activeAudio: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let volumeRAF: number | null = null;

function stopVolumeLoop() {
  if (volumeRAF !== null) {
    cancelAnimationFrame(volumeRAF);
    volumeRAF = null;
  }
}

function startVolumeLoop(onVolume: (level: number) => void) {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  const tick = () => {
    if (!analyser) return;
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    onVolume(Math.min(rms * 3.2, 1));
    volumeRAF = requestAnimationFrame(tick);
  };
  volumeRAF = requestAnimationFrame(tick);
}

/**
 * Stop any in-flight ElevenLabs request and any currently playing audio.
 */
export function stopElevenLabsSpeech() {
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {
      // ignore
    }
    activeAbortController = null;
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.src = '';
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  stopVolumeLoop();
}

/**
 * Speak text through the ElevenLabs streaming Text-to-Speech API.
 * Calls onError (instead of throwing) whenever no key is configured, the
 * request fails, or playback is rejected — callers should treat onError as
 * the cue to fall back to the legacy browser voice engine.
 */
export async function speakWithElevenLabs(text: string, options: SpeakOptions = {}): Promise<void> {
  const apiKey = getElevenLabsApiKey();
  const voiceId = options.voiceId || getElevenLabsVoiceId();
  const clean = sanitizeForSpeech(text);

  if (!apiKey) {
    options.onError?.('No ElevenLabs API key configured.');
    return;
  }
  if (!clean) {
    options.onEnd?.();
    return;
  }

  stopElevenLabsSpeech();

  const controller = new AbortController();
  activeAbortController = controller;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: clean,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.85,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '');
      throw new Error(`ElevenLabs TTS failed (${response.status}): ${detail.slice(0, 200)}`);
    }

    const blob = await new Response(response.body).blob();
    if (controller.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    activeAudio = audio;

    // Wire an analyser so the UI can visualize real playback loudness.
    // Best-effort only — playback still proceeds if this fails.
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioCtx();
      }
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      if (options.onVolume) startVolumeLoop(options.onVolume);
    } catch (e) {
      console.warn('[ElevenLabs] Visualizer unavailable:', e);
    }

    audio.onplay = () => options.onStart?.();
    audio.onended = () => {
      stopVolumeLoop();
      options.onVolume?.(0);
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      options.onEnd?.();
    };
    audio.onerror = () => {
      stopVolumeLoop();
      options.onVolume?.(0);
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      options.onError?.('Audio playback failed.');
    };

    await audio.play();
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    console.warn('[ElevenLabs] TTS notice:', err);
    options.onError?.(err?.message || 'ElevenLabs request failed.');
  }
}

/**
 * Fetch the caller's full ElevenLabs voice library (their custom + saved
 * voices), for accounts that want more than the curated default list.
 * Falls back to the curated list on any error so the UI never breaks.
 */
export async function fetchElevenLabsVoices(): Promise<ElevenLabsVoiceOption[]> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) return ELEVEN_VOICES;

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!response.ok) return ELEVEN_VOICES;
    const data = await response.json();
    const voices = (data.voices || []) as any[];
    if (!voices.length) return ELEVEN_VOICES;
    return voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
      description: v.labels?.descriptive || v.labels?.use_case || 'Custom voice',
      gender: (v.labels?.gender === 'male' ? 'male' : 'female') as 'male' | 'female',
    }));
  } catch (e) {
    console.warn('[ElevenLabs] Voice list fetch notice:', e);
    return ELEVEN_VOICES;
  }
}
