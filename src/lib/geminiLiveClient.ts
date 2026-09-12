/**
 * ClaimCoda Gemini Multimodal Live API Client
 * Connects to Google's Gemini Multimodal Live API via bidirectional WebSockets (BidiGenerateContent)
 * for native speech-to-speech streaming, high-fidelity neural voices, and low-latency audio dialogue.
 *
 * Gemini Live (Zephyr voice, gemini-3.1-flash-live-preview) is now the PRIMARY
 * voice engine — the same model/voice combination already used and verified in
 * another app in this workspace. ElevenLabs (elevenLabsService.ts) remains
 * available as a secondary option, but it depends on a paid, quota-limited
 * third-party account; this path only depends on the Gemini key already used
 * elsewhere in the app. Preview models can still be retired by Google with
 * little notice (see the GEMINI_LIVE_MODELS comment below) — if this model
 * ever 404s or the WebSocket closes with a non-1000 code citing an unknown
 * model, check https://ai.google.dev/gemini-api/docs/models for the current
 * name and update the constant below.
 */

export type GeminiLiveVoice = 'Zephyr' | 'Aoede' | 'Charon' | 'Fenrir' | 'Kore' | 'Puck';

export const GEMINI_LIVE_MODELS: Array<{ id: string; label: string }> = [
  { id: 'models/gemini-3.1-flash-live-preview', label: 'Gemini 3.1 Flash Live (recommended)' },
  { id: 'models/gemini-2.5-flash-native-audio-preview-12-2025', label: 'Gemini 2.5 Flash — Native Audio' },
];

export interface GeminiLiveConfig {
  apiKey: string;
  voiceName: GeminiLiveVoice;
  systemInstruction: string;
  model?: string;
}

export interface GeminiLiveCallbacks {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: any, message?: string) => void;
  onAudioData?: (float32Array: Float32Array) => void;
  onUserTranscript?: (text: string) => void;
  onModelTranscript?: (text: string) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onInputVolumeChange?: (volume: number) => void;
  onOutputVolumeChange?: (volume: number) => void;
  onStateChange?: (state: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening') => void;
}

export const LIVE_VOICES: Array<{ id: GeminiLiveVoice; name: string; description: string; gender: 'female' | 'male' }> = [
  {
    id: 'Zephyr',
    name: 'Zephyr (Reassuring & Confident)',
    description: 'The default ClaimCoda advocate voice — bright, warm, and confident',
    gender: 'female',
  },
  {
    id: 'Aoede',
    name: 'Aoede (Empathetic & Warm)',
    description: 'Breezy, compassionate advocate tone — ideal for patient healthcare support',
    gender: 'female',
  },
  {
    id: 'Kore',
    name: 'Kore (Calm & Grounded)',
    description: 'Firm, soothing, steady voice for clear procedural guidance',
    gender: 'female',
  },
  {
    id: 'Charon',
    name: 'Charon (Deep & Reassuring)',
    description: 'Authoritative, calm, measured healthcare advisor',
    gender: 'male',
  },
  {
    id: 'Puck',
    name: 'Puck (Upbeat & Clear)',
    description: 'Engaging, friendly, lively navigator',
    gender: 'male',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (Steady & Direct)',
    description: 'Resolute, focused, direct problem-solver',
    gender: 'male',
  },
];

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private config: GeminiLiveConfig;
  private callbacks: GeminiLiveCallbacks;

  private isConnected: boolean = false;
  private isMuted: boolean = false;
  private nextPlayTime: number = 0;
  private activeAudioSources: AudioBufferSourceNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private currentTurnModelText: string = '';

  constructor(config: GeminiLiveConfig, callbacks: GeminiLiveCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  public updateConfig(newConfig: Partial<GeminiLiveConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Connect to the Gemini Multimodal Live API WebSocket
   */
  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.callbacks.onStateChange?.('connecting');

    const apiKey = this.config.apiKey.trim();
    if (!apiKey) {
      throw new Error('Gemini API key is required to connect to the Multimodal Live API.');
    }

    // v1beta is the current, documented endpoint for BidiGenerateContent.
    // (The old v1alpha path plus the retired gemini-2.0-flash-exp model is
    // the combination that used to make every Live connection fail silently.)
    const host = 'generativelanguage.googleapis.com';
    const path = '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
    const url = `wss://${host}${path}?key=${encodeURIComponent(apiKey)}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = async () => {
        this.isConnected = true;
        this.callbacks.onOpen?.();
        this.callbacks.onStateChange?.('connected');

        // 1. Send Setup payload
        this.sendSetupPayload();

        // 2. Initialize microphone stream
        await this.startAudioCapture();

        // 3. Kick off the conversation. Gemini Live only speaks in response to
        // a turn, so without this the session connects into silence until the
        // user says something first — which read as "did it even connect?"
        // Sent as a real user-turn (Gemini requires one to generate a
        // response) but suppressed from the on-screen transcript
        // (announceAsUser: false) so it doesn't show up as if the user typed
        // it. The model already has full claim context from systemInstruction.
        this.sendTextMessage(
          '(Session start — greet the patient warmly in one or two sentences, briefly introducing yourself, then ask how you can help with their claim.)',
          false
        );
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          let responseData: any;
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            responseData = JSON.parse(text);
          } else if (typeof event.data === 'string') {
            responseData = JSON.parse(event.data);
          }

          if (responseData) {
            this.handleServerMessage(responseData);
          }
        } catch (err) {
          console.warn('[Gemini Live] Message parse error:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Gemini Live] WebSocket error:', error);
        this.callbacks.onError?.(error, 'Could not reach the Gemini Live API. Check your network connection.');
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.cleanupAudio();
        // A close code other than 1000 (normal) almost always means the
        // server rejected the session — most commonly an invalid/expired
        // API key, a model name the account doesn't have access to, or the
        // account's tier not being enabled for the Live API. Surface that
        // instead of failing silently into the fallback voice.
        if (event.code !== 1000 && event.code !== 1005) {
          const reason = event.reason || `WebSocket closed with code ${event.code}`;
          this.callbacks.onError?.(event, `Gemini Live session closed unexpectedly: ${reason}`);
        }
        this.callbacks.onClose?.(event);
        this.callbacks.onStateChange?.('disconnected');
      };
    } catch (err) {
      this.callbacks.onStateChange?.('disconnected');
      throw err;
    }
  }

  /**
   * Disconnect and clean up
   */
  public disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.cleanupAudio();
    this.callbacks.onStateChange?.('disconnected');
  }

  /**
   * Send the initial session configuration
   */
  private sendSetupPayload() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const modelName = this.config.model || GEMINI_LIVE_MODELS[0].id;

    const setupMessage = {
      setup: {
        model: modelName,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName || 'Aoede',
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: this.config.systemInstruction,
            },
          ],
        },
        // Without these, the server only ever returns raw audio parts (no
        // `text` on modelTurn.parts), so the on-screen transcript silently
        // stayed empty for every live conversation turn.
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Start capturing audio from user's microphone at 16kHz PCM
   */
  private async startAudioCapture() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Standard Web Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioContext = new AudioCtx({ sampleRate: 16000 });

      const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      
      // Buffer size of 2048 at 16kHz is ~128ms chunks
      this.scriptProcessor = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

      this.scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (this.isMuted || !this.isConnected) return;

        const inputBuffer = event.inputBuffer;
        const channelData = inputBuffer.getChannelData(0);

        // Compute input volume for visualizer
        let sumSquares = 0;
        for (let i = 0; i < channelData.length; i++) {
          sumSquares += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sumSquares / channelData.length);
        this.callbacks.onInputVolumeChange?.(Math.min(rms * 4, 1));

        // Resample / Convert Float32 [-1, 1] to Int16 PCM Little-Endian
        const pcm16 = this.floatTo16BitPCM(channelData);
        const base64Data = this.arrayBufferToBase64(pcm16.buffer);

        this.sendRealtimeAudioChunk(base64Data);
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioContext.destination);
    } catch (err) {
      console.error('[Gemini Live] Mic capture error:', err);
      this.callbacks.onError?.(err);
    }
  }

  /**
   * Stream a real-time audio chunk to Gemini
   */
  private sendRealtimeAudioChunk(base64PCM: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64PCM,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send a text message turn to Gemini Live.
   * @param announceAsUser When false, the text is sent to the model but NOT
   *   reported via onUserTranscript — used for the internal greeting kickoff,
   *   which shouldn't appear as though the user typed it.
   */
  public sendTextMessage(text: string, announceAsUser: boolean = true) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: text }],
          },
        ],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(message));
    if (announceAsUser) {
      this.callbacks.onUserTranscript?.(text);
    }
  }

  /**
   * Handle incoming messages from the server
   */
  private handleServerMessage(data: any) {
    // 0. Setup errors (bad model name, unsupported voice, unauthorized key)
    // arrive as a top-level error rather than a close event on some accounts.
    if (data.error) {
      const message = data.error.message || JSON.stringify(data.error);
      console.warn('[Gemini Live] Server error:', message);
      this.callbacks.onError?.(data.error, message);
      return;
    }

    // 1. Interruption handling (Barge-in)
    if (data.serverContent?.interrupted) {
      this.stopPlayback();
      this.callbacks.onInterrupted?.();
      return;
    }

    // 2. Model Turn Data (Audio / Text)
    if (data.serverContent?.modelTurn?.parts) {
      const parts = data.serverContent.modelTurn.parts;
      for (const part of parts) {
        // Audio stream
        if (part.mimeType && part.mimeType.startsWith('audio/pcm') && part.data) {
          this.playAudioChunk(part.data);
          this.callbacks.onStateChange?.('speaking');
        }

        // Text transcript part if available
        if (part.text) {
          this.currentTurnModelText += part.text;
          this.callbacks.onModelTranscript?.(this.currentTurnModelText);
        }
      }
    }

    // 2b. Explicit transcription channels (requires inputAudioTranscription /
    // outputAudioTranscription in the setup payload — otherwise these are
    // always empty, which is why the on-screen transcript used to never
    // populate for spoken turns).
    if (data.serverContent?.outputTranscription?.text) {
      this.currentTurnModelText += data.serverContent.outputTranscription.text;
      this.callbacks.onModelTranscript?.(this.currentTurnModelText);
    }
    if (data.serverContent?.inputTranscription?.text) {
      this.callbacks.onUserTranscript?.(data.serverContent.inputTranscription.text);
    }

    // 3. Turn complete
    if (data.serverContent?.turnComplete) {
      if (this.currentTurnModelText) {
        this.currentTurnModelText = '';
      }
      this.callbacks.onTurnComplete?.();
      this.callbacks.onStateChange?.('listening');
    }
  }

  /**
   * Decode base64 24kHz PCM audio from Gemini and queue it for playback
   */
  private playAudioChunk(base64Audio: string) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
        this.outputAudioContext = new AudioCtx({ sampleRate: 24000 });
      }

      if (this.outputAudioContext.state === 'suspended') {
        this.outputAudioContext.resume();
      }

      const pcm16Data = this.base64ToArrayBuffer(base64Audio);
      const int16Array = new Int16Array(pcm16Data);

      // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
      const float32Array = new Float32Array(int16Array.length);
      let sumSquares = 0;
      for (let i = 0; i < int16Array.length; i++) {
        const sample = int16Array[i] / 32768.0;
        float32Array[i] = sample;
        sumSquares += sample * sample;
      }

      // Output volume callback for visualizer
      const rms = Math.sqrt(sumSquares / int16Array.length);
      this.callbacks.onOutputVolumeChange?.(Math.min(rms * 4, 1));
      this.callbacks.onAudioData?.(float32Array);

      // Create AudioBuffer at 24kHz
      const audioBuffer = this.outputAudioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      // Queue AudioBufferSourceNode through a per-chunk GainNode. Chunks that
      // play back-to-back are phase-continuous PCM and need no fade, but any
      // time network jitter causes a gap, resuming at full volume produces an
      // audible "click" that reads as robotic/glitchy — a ~4ms fade-in on
      // resume smooths that over without adding perceptible latency.
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = this.outputAudioContext.createGain();
      source.connect(gainNode);
      gainNode.connect(this.outputAudioContext.destination);

      const currentTime = this.outputAudioContext.currentTime;
      const hadUnderrun = this.nextPlayTime < currentTime;
      if (hadUnderrun) {
        this.nextPlayTime = currentTime;
      }

      if (hadUnderrun) {
        const fadeMs = 0.004;
        gainNode.gain.setValueAtTime(0, this.nextPlayTime);
        gainNode.gain.linearRampToValueAtTime(1, this.nextPlayTime + fadeMs);
      } else {
        gainNode.gain.setValueAtTime(1, this.nextPlayTime);
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;

      this.activeAudioSources.push(source);
      this.activeGainNodes.push(gainNode);
      source.onended = () => {
        const idx = this.activeAudioSources.indexOf(source);
        if (idx !== -1) {
          this.activeAudioSources.splice(idx, 1);
          this.activeGainNodes.splice(idx, 1);
        }
        if (this.activeAudioSources.length === 0) {
          this.callbacks.onOutputVolumeChange?.(0);
        }
      };
    } catch (err) {
      console.warn('[Gemini Live] Playback chunk error:', err);
    }
  }

  /**
   * Stop all active playback nodes immediately (for interruption / stop)
   */
  public stopPlayback() {
    const ctx = this.outputAudioContext;
    const now = ctx?.currentTime ?? 0;
    const fadeOutMs = 0.015;

    this.activeAudioSources.forEach((source, i) => {
      const gainNode = this.activeGainNodes[i];
      try {
        if (ctx && gainNode) {
          // Fade instead of a hard stop() so an interruption/barge-in
          // doesn't produce an audible click.
          const current = gainNode.gain.value;
          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.setValueAtTime(current, now);
          gainNode.gain.linearRampToValueAtTime(0, now + fadeOutMs);
          source.stop(now + fadeOutMs);
        } else {
          source.stop();
        }
      } catch (e) {
        // ignore
      }
    });
    this.activeAudioSources = [];
    this.activeGainNodes = [];
    if (ctx) {
      this.nextPlayTime = ctx.currentTime;
    }
    this.callbacks.onOutputVolumeChange?.(0);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.callbacks.onInputVolumeChange?.(0);
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  private cleanupAudio() {
    this.stopPlayback();

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      try {
        this.inputAudioContext.close();
      } catch (e) {
        // ignore
      }
      this.inputAudioContext = null;
    }

    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      try {
        this.outputAudioContext.close();
      } catch (e) {
        // ignore
      }
      this.outputAudioContext = null;
    }

    this.callbacks.onInputVolumeChange?.(0);
    this.callbacks.onOutputVolumeChange?.(0);
  }

  // --- Utility Audio Conversions ---

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
