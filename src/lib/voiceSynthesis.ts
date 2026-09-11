/**
 * ClaimCoda Empathetic Voice Synthesis Engine
 * Provides natural, warm, conversational speech using high-definition neural voice selection,
 * cadence modulation, and contextual conversational phrasing.
 */

export interface VoicePersona {
  id: string;
  name: string;
  description: string;
  pitch: number;
  rate: number;
  gender: 'female' | 'male';
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'elena-warm',
    name: 'Elena (Empathetic & Warm)',
    description: 'Calm, supportive, patient advocate tone',
    pitch: 1.02,
    rate: 0.94,
    gender: 'female',
  },
  {
    id: 'marcus-reassuring',
    name: 'Marcus (Calm & Reassuring)',
    description: 'Measured, confident, clear advisory voice',
    pitch: 0.98,
    rate: 0.93,
    gender: 'male',
  },
  {
    id: 'sarah-clarity',
    name: 'Sarah (Clear & Direct)',
    description: 'Professional, focused healthcare navigator',
    pitch: 1.05,
    rate: 0.98,
    gender: 'female',
  },
];

class EmpatheticVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedPersona: VoicePersona = VOICE_PERSONAS[0];
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      // Pre-load voices
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.getBestAvailableVoice();
      }
    }
  }

  public setPersona(personaId: string) {
    const found = VOICE_PERSONAS.find((p) => p.id === personaId);
    if (found) this.selectedPersona = found;
  }

  public getPersona(): VoicePersona {
    return this.selectedPersona;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.stop();
  }

  public isVoiceMuted(): boolean {
    return this.isMuted;
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Find the highest-quality natural / neural voice in the user's browser
   */
  public getBestAvailableVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    const isFemale = this.selectedPersona.gender === 'female';

    // Prioritized search for modern natural neural voices
    const neuralPreferred = voices.find((v) => {
      const name = v.name.toLowerCase();
      const isEnglish = v.lang.startsWith('en');
      if (!isEnglish) return false;

      if (isFemale) {
        return (
          name.includes('natural') ||
          name.includes('online (natural)') ||
          name.includes('jenny') ||
          name.includes('aria') ||
          name.includes('samantha') ||
          name.includes('google us english') ||
          name.includes('zira')
        );
      } else {
        return (
          name.includes('natural') ||
          name.includes('online (natural)') ||
          name.includes('guy') ||
          name.includes('david') ||
          name.includes('george') ||
          name.includes('google uk english male')
        );
      }
    });

    if (neuralPreferred) return neuralPreferred;

    // Fallback to any English voice
    const fallbackEnglish = voices.find((v) => v.lang.startsWith('en'));
    return fallbackEnglish || voices[0] || null;
  }

  /**
   * Convert clinical jargon and clean up text into conversational, natural spoken English
   */
  private preprocessTextForSpeech(rawText: string): string {
    return rawText
      .replace(/CPT\s*([0-9]+)/gi, 'C P T code $1')
      .replace(/ICD-10/gi, 'I C D 10')
      .replace(/EOB/gi, 'Explanation of Benefits')
      .replace(/LMN/gi, 'Letter of Medical Necessity')
      .replace(/IRO/gi, 'Independent Review Organization')
      .replace(/CPB\s*#?([0-9]+)/gi, 'Clinical Policy Bulletin number $1')
      .replace(/\$(\d+)(?:\.\d{2})?/g, '$1 dollars')
      .replace(/\bCO-50\b/gi, 'Denial Code C O 50')
      .replace(/\bPR-2\b/gi, 'Remark Code P R 2')
      .replace(/\b45 CFR § 147\.136\b/gi, 'Federal Regulation 45 C F R section 147 point 136');
  }

  /**
   * Speak text with conversational pacing, pitch adjustments, and event callbacks
   */
  public speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: () => void;
    }
  ) {
    if (this.isMuted || !this.synth) {
      options?.onEnd?.();
      return;
    }

    this.stop();

    const spokenText = this.preprocessTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(spokenText);

    const voice = this.getBestAvailableVoice();
    if (voice) utterance.voice = voice;

    utterance.pitch = this.selectedPersona.pitch;
    utterance.rate = this.selectedPersona.rate;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      options?.onEnd?.();
    };

    utterance.onerror = () => {
      options?.onError?.();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }
}

export const voiceEngine = new EmpatheticVoiceEngine();
