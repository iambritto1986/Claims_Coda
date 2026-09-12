import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Send,
  Bot,
  User,
  Key,
  Check,
  Radio,
  Loader2,
  Settings,
  AlertTriangle,
  Waves,
} from 'lucide-react';
import clsx from 'clsx';
import { CaseRecord } from '../types/claimcoda';
import {
  GeminiLiveClient,
  GeminiLiveVoice,
  LIVE_VOICES,
  GEMINI_LIVE_MODELS,
} from '../lib/geminiLiveClient';
import {
  generateConversationalAdvocateResponse,
  generateGeminiLiveSystemInstruction,
  getGeminiApiKey,
  setGeminiApiKey,
} from '../lib/geminiService';
import { voiceEngine } from '../lib/voiceSynthesis';
import {
  ELEVEN_VOICES,
  ElevenLabsVoiceOption,
  getElevenLabsApiKey,
  setElevenLabsApiKey,
  getElevenLabsVoiceId,
  setElevenLabsVoiceId,
  isElevenLabsConfigured,
  speakWithElevenLabs,
  stopElevenLabsSpeech,
} from '../lib/elevenLabsService';

interface VoiceAdvocateProps {
  isOpen: boolean;
  onClose: () => void;
  caseData?: Partial<CaseRecord>;
  onApplyNarrative?: (narrative: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'advocate' | 'user';
  text: string;
  timestamp: string;
}

type VoiceEngine = 'elevenlabs' | 'gemini-live';

export function VoiceAdvocateModal({ isOpen, onClose, caseData }: VoiceAdvocateProps) {
  // Which conversational engine drives the voice. Gemini Live (Zephyr) is now
  // the default — true real-time speech-to-speech, the same model/voice combo
  // already verified working elsewhere, and it only depends on the Gemini key
  // already used for the rest of this app (no separate paid quota to run out
  // of, unlike ElevenLabs). ElevenLabs remains available as a secondary option.
  const [engine, setEngine] = useState<VoiceEngine>('gemini-live');

  // ElevenLabs voice profile
  const [elevenVoiceId, setElevenVoiceId] = useState<string>(getElevenLabsVoiceId());
  const [elevenKeyInput, setElevenKeyInput] = useState(getElevenLabsApiKey());
  const [elevenKeySaved, setElevenKeySaved] = useState(false);

  // Gemini Live Session & Voice Profile
  const [selectedVoice, setSelectedVoice] = useState<GeminiLiveVoice>('Zephyr');
  const [selectedModel, setSelectedModel] = useState<string>(GEMINI_LIVE_MODELS[0].id);
  const [liveState, setLiveState] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'>('disconnected');

  // Speech recognition (mic input for the ElevenLabs engine)
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionActiveRef = useRef(false);
  const shouldKeepListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);

  // Audio Visualizer Volume
  const [inputVolume, setInputVolume] = useState<number>(0);
  const [outputVolume, setOutputVolume] = useState<number>(0);

  // General State
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);

  // Settings Drawer — opens automatically until a Gemini key is configured,
  // since Gemini Live is now the primary voice engine and needs that key to
  // connect at all.
  const [showSettings, setShowSettings] = useState(!getGeminiApiKey());
  const [geminiKeyInput, setGeminiKeyInput] = useState(getGeminiApiKey());
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);

  // Refs
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const insurerName = caseData?.insurerName && caseData.insurerName !== 'Insurer on File' ? caseData.insurerName : 'your health insurer';

  const currentElevenVoice: ElevenLabsVoiceOption =
    ELEVEN_VOICES.find((v) => v.id === elevenVoiceId) || ELEVEN_VOICES[0];

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  function pauseRecognitionForPlayback() {
    if (recognitionRef.current && recognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }

  function resumeRecognitionIfNeeded() {
    if (shouldKeepListeningRef.current && recognitionRef.current && !recognitionActiveRef.current) {
      try {
        recognitionRef.current.start();
        recognitionActiveRef.current = true;
      } catch {
        // ignore — already starting
      }
    }
  }

  // ---------------------------------------------------------------------
  // ElevenLabs speech output (used for the greeting + every advocate reply
  // when engine === 'elevenlabs', and always used for the greeting itself
  // regardless of engine since Gemini Live has no clean way to "say" an
  // arbitrary local string without treating it as a conversational turn).
  // ---------------------------------------------------------------------
  const speakText = useCallback(
    (text: string) => {
      if (!voiceEnabled) return;

      // ElevenLabs and the browser's SpeechSynthesis engine don't know about
      // each other, and the FloatingAvatarGuide widget on the page behind
      // this modal can independently be speaking through either one too.
      // Silence both before starting a new utterance so opening this modal
      // (or replaying a line) never overlaps with whatever was already
      // playing — that overlap is what "two voices at once" was.
      stopElevenLabsSpeech();
      voiceEngine.stop();

      if (isElevenLabsConfigured()) {
        pauseRecognitionForPlayback();
        speakWithElevenLabs(text, {
          voiceId: elevenVoiceId,
          onStart: () => setIsSpeaking(true),
          onVolume: (v) => setOutputVolume(v),
          onEnd: () => {
            setIsSpeaking(false);
            setOutputVolume(0);
            resumeRecognitionIfNeeded();
          },
          onError: (msg) => {
            console.warn('[Voice Advocate] ElevenLabs notice:', msg);
            setLastError(`Premium voice unavailable (${msg}). Using backup voice.`);
            setIsSpeaking(false);
            setOutputVolume(0);
            voiceEngine.speak(text, {
              onStart: () => setIsSpeaking(true),
              onEnd: () => {
                setIsSpeaking(false);
                resumeRecognitionIfNeeded();
              },
            });
          },
        });
      } else {
        voiceEngine.speak(text, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
    },
    [voiceEnabled, elevenVoiceId]
  );

  // ---------------------------------------------------------------------
  // Speech-to-text: the browser's native SpeechRecognition drives mic input
  // for the ElevenLabs engine (no extra API key or round-trip needed). It is
  // deliberately paused while the advocate is speaking, otherwise the mic
  // picks up ClaimCoda's own voice through the speakers and misreads it as
  // the next thing the user said.
  // ---------------------------------------------------------------------
  const initRecognition = useCallback(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setLastError('This browser does not support voice input. Try Chrome or Edge, or type your question below.');
      return null;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      recognitionActiveRef.current = true;
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          setInputText(result[0].transcript);
        }
      }
      if (finalTranscript.trim()) {
        setInputText('');
        handleUserMessage(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setLastError(`Microphone notice: ${event.error}. Click the mic to try again.`);
      recognitionActiveRef.current = false;
    };

    recognition.onend = () => {
      recognitionActiveRef.current = false;
      // Keep an open-mic feel: auto-restart unless the user muted, we're
      // mid-playback, or the modal is closing.
      if (shouldKeepListeningRef.current && !isSpeakingRef.current) {
        try {
          recognition.start();
          recognitionActiveRef.current = true;
        } catch {
          // already starting — ignore
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListening = () => {
    if (engine !== 'elevenlabs') return;

    if (isListening) {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      return;
    }

    const recognition = recognitionRef.current || initRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;
    setIsListening(true);
    setLastError(null);
    try {
      recognition.start();
      recognitionActiveRef.current = true;
    } catch {
      // A quick toggle can call start() while already starting — safe to ignore.
    }
  };

  // ---------------------------------------------------------------------
  // Gemini Live (advanced / beta) WebSocket session
  // ---------------------------------------------------------------------
  const initGeminiLive = async () => {
    const apiKey = getGeminiApiKey();

    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }

    if (!apiKey) {
      setLiveState('disconnected');
      setLastError('Add your Gemini API key in Settings to use the Gemini Live (beta) engine.');
      return;
    }

    const systemInstruction = generateGeminiLiveSystemInstruction(caseData, selectedVoice);

    const client = new GeminiLiveClient(
      { apiKey, voiceName: selectedVoice, systemInstruction, model: selectedModel },
      {
        onOpen: () => setLiveState('connected'),
        onClose: () => setLiveState('disconnected'),
        onError: (_err, message) => {
          console.warn('[Gemini Live Notice]:', message || _err);
          setLiveState('disconnected');
          setLastError(message || 'Gemini Live connection failed. The ElevenLabs engine is available as a reliable alternative.');
        },
        onInputVolumeChange: (vol) => setInputVolume(vol),
        onOutputVolumeChange: (vol) => setOutputVolume(vol),
        onStateChange: (st) => setLiveState(st),
        onUserTranscript: (text) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.sender === 'user' && last.id.startsWith('live-usr')) {
              return [...prev.slice(0, -1), { ...last, text }];
            }
            return [
              ...prev,
              { id: `live-usr-${Date.now()}`, sender: 'user', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            ];
          });
        },
        onModelTranscript: (text) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.sender === 'advocate') {
              return [...prev.slice(0, -1), { ...last, text }];
            }
            return [
              ...prev,
              { id: `adv-${Date.now()}`, sender: 'advocate', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            ];
          });
        },
        onInterrupted: () => console.log('[Gemini Live] Interruption handled (Barge-in).'),
      }
    );

    liveClientRef.current = client;

    try {
      await client.connect();
    } catch (e: any) {
      console.warn('Could not establish direct Live WebSocket:', e);
      setLiveState('disconnected');
      setLastError(e?.message || 'Could not establish the Gemini Live WebSocket connection.');
    }
  };

  // ---------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      voiceEngine.stop();
      stopElevenLabsSpeech();
      return;
    }

    setLastError(null);

    if (engine === 'gemini-live') {
      if (getGeminiApiKey()) {
        // Don't pre-populate a canned greeting here — Zephyr speaks its own
        // greeting once the live session connects (see the kickoff message
        // in geminiLiveClient.ts's connect()), and onModelTranscript below
        // fills in that first advocate bubble as it's transcribed. Showing a
        // separate hardcoded greeting first would mean two different
        // greetings (and two different voices) back to back.
        setMessages([]);
        initGeminiLive();
      } else {
        setMessages([
          {
            id: 'msg-init',
            sender: 'advocate',
            text: 'Add your Gemini API key in Settings to start our live conversation — it uses the same key as the rest of ClaimCoda.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } else {
      const greetingText = `Hi there! I'm ${currentElevenVoice.name.split(' ')[0]}, your ClaimCoda appeal co-pilot. I'm ready to navigate your claim with ${insurerName}. How can I help you today? You can ask me why it was denied, what documents you need, or check your deadline.`;

      setMessages([
        {
          id: 'msg-init',
          sender: 'advocate',
          text: greetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      if (voiceEnabled) {
        speakText(greetingText);
      }
    }

    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      voiceEngine.stop();
      stopElevenLabsSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, engine, selectedVoice, selectedModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // ---------------------------------------------------------------------
  // Message handling
  // ---------------------------------------------------------------------
  const handleUserMessage = async (userText: string) => {
    if (!userText.trim()) return;

    if (engine === 'gemini-live' && liveClientRef.current && liveClientRef.current.getIsConnected()) {
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: userText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      liveClientRef.current.sendTextMessage(userText.trim());
      return;
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const advocateResponse = await generateConversationalAdvocateResponse({
        userQuery: userText.trim(),
        conversationHistory: messages.map((m) => ({ sender: m.sender, text: m.text })),
        caseData,
      });

      const advocateMsg: ChatMessage = {
        id: `adv-${Date.now()}`,
        sender: 'advocate',
        text: advocateResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, advocateMsg]);
      speakText(advocateResponse);
    } catch (e) {
      console.error(e);
      setLastError('Something went wrong generating a response. Please try again.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleUserMessage(inputText);
    setInputText('');
  };

  const handleSaveElevenKey = (e: React.FormEvent) => {
    e.preventDefault();
    setElevenLabsApiKey(elevenKeyInput);
    setElevenKeySaved(true);
    setLastError(null);
    setTimeout(() => setElevenKeySaved(false), 1200);
  };

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(geminiKeyInput);
    setGeminiKeySaved(true);
    setTimeout(() => {
      setGeminiKeySaved(false);
      if (engine === 'gemini-live') initGeminiLive();
    }, 1200);
  };

  const handleElevenVoiceChange = (voiceId: string) => {
    setElevenVoiceId(voiceId);
    setElevenLabsVoiceId(voiceId);
  };

  const handleGeminiVoiceChange = (voiceId: GeminiLiveVoice) => {
    setSelectedVoice(voiceId);
    if (engine === 'gemini-live') {
      setTimeout(() => initGeminiLive(), 200);
    }
  };

  const quickPrompts = [
    'Why did they deny my claim?',
    'What documents should I ask my doctor for?',
    'How long do I have to appeal?',
    'What is an Independent External Review?',
  ];

  if (!isOpen) return null;

  const isLiveConnected = liveState === 'connected' || liveState === 'speaking' || liveState === 'listening';
  const activityLevel = outputVolume > 0.04 ? outputVolume : inputVolume > 0.04 ? inputVolume : 0.05;
  const barHeights = [0.3, 0.7, 0.4, 0.9, 0.5, 0.8, 0.6, 1.0, 0.4, 0.7];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-brand-surface border border-brand-gold/40 max-w-2xl w-full h-[680px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

        {/* Header */}
        <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-surface-light">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'cc-orb w-11 h-11 flex items-center justify-center text-brand-gold shrink-0',
                isSpeaking || isLiveConnected ? 'cc-orb-active' : ''
              )}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-medium text-brand-text">ClaimCoda Voice Advocate</h3>

                {engine === 'elevenlabs' ? (
                  isElevenLabsConfigured() ? (
                    <span className="text-[10px] bg-green-950/70 text-green-400 px-2.5 py-0.5 rounded-full border border-green-700/50 flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span>ElevenLabs Voice (Active)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] bg-brand-bg text-brand-text-muted px-2 py-0.5 rounded-full border border-brand-border flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-brand-gold" />
                      <span>Backup Voice — add API key for premium quality</span>
                    </span>
                  )
                ) : isLiveConnected ? (
                  <span className="text-[10px] bg-green-950/70 text-green-400 px-2.5 py-0.5 rounded-full border border-green-700/50 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                    <span>Gemini Live BiDi (Active)</span>
                  </span>
                ) : liveState === 'connecting' ? (
                  <span className="text-[10px] bg-amber-950/70 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800/40 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>Connecting Live WebSocket...</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-brand-bg text-brand-text-muted px-2 py-0.5 rounded-full border border-brand-border flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-brand-gold" />
                    <span>Disconnected</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-text-muted">
                {engine === 'elevenlabs' ? 'Natural neural voice, powered by ElevenLabs + Gemini reasoning' : 'Direct speech-to-speech intelligence via Google Gemini Live API'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={clsx(
                'p-2 rounded-xl border transition-colors',
                showSettings ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-brand-border bg-brand-surface text-brand-text-muted hover:text-brand-text'
              )}
              title="Voice Engine & API Key Settings"
            >
              <Settings className="w-4 h-4 text-brand-gold" />
            </button>

            <button
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (liveClientRef.current) liveClientRef.current.setMuted(!next);
                voiceEngine.setMuted(!next);
                if (!next) {
                  voiceEngine.stop();
                  stopElevenLabsSpeech();
                }
              }}
              className="p-2 rounded-xl border border-brand-border bg-brand-surface text-brand-text-muted hover:text-brand-text transition-colors"
              title={voiceEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-brand-gold" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if (liveClientRef.current) liveClientRef.current.disconnect();
                voiceEngine.stop();
                stopElevenLabsSpeech();
                onClose();
              }}
              className="p-2 rounded-xl border border-brand-border bg-brand-surface text-brand-text-muted hover:text-brand-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Drawer */}
        {showSettings && (
          <div className="p-4 bg-brand-surface-light border-b border-brand-border text-xs animate-in fade-in duration-150 max-h-[300px] overflow-y-auto">
            {/* Engine Toggle */}
            <div className="flex items-center gap-2 mb-3">
              {(['gemini-live', 'elevenlabs'] as VoiceEngine[]).map((eng) => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => setEngine(eng)}
                  className={clsx(
                    'flex-1 text-left p-2.5 rounded-xl border transition-all',
                    engine === eng ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-brand-border bg-brand-surface text-brand-text-muted hover:border-brand-gold/30'
                  )}
                >
                  <div className="font-medium text-[11px] flex items-center gap-1.5">
                    {eng === 'gemini-live' ? <Radio className="w-3.5 h-3.5" /> : <Waves className="w-3.5 h-3.5" />}
                    <span>{eng === 'gemini-live' ? 'Gemini Live (Zephyr)' : 'ElevenLabs Voice'}</span>
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5">
                    {eng === 'gemini-live' ? 'Real-time speech-to-speech — recommended' : 'Requires a paid ElevenLabs plan/credits'}
                  </div>
                </button>
              ))}
            </div>

            {engine === 'elevenlabs' ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-brand-gold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>ElevenLabs API Key</span>
                  </span>
                  <a
                    href="https://elevenlabs.io/app/settings/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-brand-gold hover:underline"
                  >
                    Get a key
                  </a>
                </div>
                <form onSubmit={handleSaveElevenKey} className="flex gap-2 mb-3">
                  <input
                    type="password"
                    placeholder="Enter your ElevenLabs API key"
                    value={elevenKeyInput}
                    onChange={(e) => setElevenKeyInput(e.target.value)}
                    className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold"
                  />
                  <button type="submit" className="bg-brand-gold text-brand-bg font-medium px-4 py-1.5 rounded-lg text-xs hover:bg-brand-gold/90 transition-all flex items-center gap-1">
                    {elevenKeySaved ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{elevenKeySaved ? 'Saved!' : 'Save'}</span>
                  </button>
                </form>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-border/40">
                  {ELEVEN_VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleElevenVoiceChange(v.id)}
                      className={clsx(
                        'p-2 rounded-xl text-left border transition-all text-[11px]',
                        elevenVoiceId === v.id ? 'border-brand-gold bg-brand-gold/15 text-brand-gold' : 'border-brand-border bg-brand-surface text-brand-text-muted hover:border-brand-gold/30'
                      )}
                    >
                      <div className="font-medium truncate">{v.name}</div>
                      <div className="text-[9px] opacity-75 truncate">{v.description}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-brand-gold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>Google Gemini Live API Key</span>
                  </span>
                </div>
                <form onSubmit={handleSaveGeminiKey} className="flex gap-2 mb-3">
                  <input
                    type="password"
                    placeholder="Enter AIzaSy... API Key"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold"
                  />
                  <button type="submit" className="bg-brand-gold text-brand-bg font-medium px-4 py-1.5 rounded-lg text-xs hover:bg-brand-gold/90 transition-all flex items-center gap-1">
                    {geminiKeySaved ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{geminiKeySaved ? 'Connected!' : 'Save & Connect'}</span>
                  </button>
                </form>

                <div className="mb-2">
                  <span className="text-[10px] text-brand-text-muted uppercase tracking-wider">Model</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full mt-1 bg-brand-bg border border-brand-border rounded-lg px-2.5 py-1.5 text-[11px] text-brand-text focus:outline-none focus:border-brand-gold"
                  >
                    {GEMINI_LIVE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-brand-border/40">
                  {LIVE_VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleGeminiVoiceChange(v.id)}
                      className={clsx(
                        'p-2 rounded-xl text-left border transition-all text-[11px]',
                        selectedVoice === v.id ? 'border-brand-gold bg-brand-gold/15 text-brand-gold' : 'border-brand-border bg-brand-surface text-brand-text-muted hover:border-brand-gold/30'
                      )}
                    >
                      <div className="font-medium truncate">{v.id}</div>
                      <div className="text-[9px] opacity-75 capitalize">{v.gender}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Gemini Live key nudge */}
        {engine === 'gemini-live' && !getGeminiApiKey() && !showSettings && (
          <div className="mx-4 mt-3 p-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 text-brand-text">
              <Radio className="w-4 h-4 text-brand-gold shrink-0" />
              <span>
                <strong className="text-brand-gold">Live conversation is disconnected</strong> — add your Gemini API key to connect Zephyr's live voice. It's the same key used for extraction and drafting elsewhere in ClaimCoda.
              </span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-brand-gold text-brand-bg font-medium px-3 py-1.5 rounded-lg shrink-0 hover:bg-brand-gold/90 transition-all"
            >
              Add Key
            </button>
          </div>
        )}

        {/* Premium Voice Setup Nudge — impossible to miss, unlike a small header badge */}
        {engine === 'elevenlabs' && !isElevenLabsConfigured() && !showSettings && (
          <div className="mx-4 mt-3 p-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 text-brand-text">
              <Waves className="w-4 h-4 text-brand-gold shrink-0" />
              <span>
                <strong className="text-brand-gold">You're hearing the backup voice right now</strong> — it's the plain browser voice, not ElevenLabs. Add your ElevenLabs API key to switch to the natural voice.
              </span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-brand-gold text-brand-bg font-medium px-3 py-1.5 rounded-lg shrink-0 hover:bg-brand-gold/90 transition-all"
            >
              Add Key
            </button>
          </div>
        )}

        {/* Error Banner */}
        {lastError && (
          <div className="px-4 py-2 bg-red-950/40 border-b border-red-800/40 text-[11px] text-red-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{lastError}</span>
            </div>
            <button onClick={() => setLastError(null)} className="text-red-300/70 hover:text-red-200 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Audio Visualizer & Waveform Bar */}
        <div className="cc-inset mx-4 mt-3 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 h-5">
              {barHeights.map((heightRatio, i) => {
                const dynamicHeight = Math.max(4, Math.min(20, heightRatio * 20 * (activityLevel * 2.5 + 0.15)));
                return (
                  <span
                    key={i}
                    className={clsx(
                      'cc-bar w-1',
                      outputVolume > 0.04 ? 'bg-brand-gold shadow-[0_0_8px_rgba(185,152,69,0.5)]' : inputVolume > 0.04 ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-brand-border'
                    )}
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>

            <span className="text-brand-text-muted text-[11px] flex items-center gap-1.5">
              {isSpeaking || outputVolume > 0.04 ? (
                <span className="text-brand-gold font-medium">✨ Advocate is speaking...</span>
              ) : isListening || inputVolume > 0.04 ? (
                <span className="text-green-400 font-medium">🎙️ Listening...</span>
              ) : isThinking ? (
                <span>Formulating personalized answer...</span>
              ) : (
                <span>Type or tap the mic to speak</span>
              )}
            </span>
          </div>

          {engine === 'elevenlabs' ? (
            <span className="text-[10px] text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full border border-brand-gold/30 hidden sm:inline-block">
              Voice: <strong>{currentElevenVoice.name.split(' —')[0]}</strong>
            </span>
          ) : (
            <span className="text-[10px] text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full border border-brand-gold/30 hidden sm:inline-block">
              Voice: <strong>{(LIVE_VOICES.find((v) => v.id === selectedVoice)?.name.split(' (')[0]) || selectedVoice}</strong>
            </span>
          )}
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-brand-bg/50">
          {messages.map((m) => (
            <div key={m.id} className={clsx('flex gap-3 max-w-[85%]', m.sender === 'user' ? 'ml-auto flex-row-reverse' : '')}>
              <div
                className={clsx(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs',
                  m.sender === 'user' ? 'bg-brand-gold text-brand-bg font-semibold' : 'bg-brand-surface-light border border-brand-gold/30 text-brand-gold'
                )}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={clsx(
                  'p-4 rounded-2xl text-xs leading-relaxed border group relative',
                  m.sender === 'user' ? 'bg-brand-gold text-brand-bg font-medium border-brand-gold rounded-tr-none' : 'bg-brand-surface text-brand-text border-brand-border rounded-tl-none'
                )}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className={clsx('text-[10px]', m.sender === 'user' ? 'text-brand-bg/70' : 'text-brand-text-muted')}>{m.timestamp}</div>
                  {m.sender === 'advocate' && (
                    <button
                      onClick={() => speakText(m.text)}
                      className="text-[10px] text-brand-gold hover:underline flex items-center gap-1 opacity-80 hover:opacity-100"
                      title="Replay Voice Audio"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Replay</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-xl bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border rounded-tl-none flex items-center gap-2 text-xs text-brand-text-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-gold" />
                <span>Formulating personalized answer...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-brand-surface/70 border-t border-brand-border/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-brand-text-muted shrink-0 uppercase tracking-wider">Quick Ask:</span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleUserMessage(p)}
              className="text-[11px] bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-3 py-1 rounded-full whitespace-nowrap transition-all shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-brand-surface-light border-t border-brand-border flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (engine === 'elevenlabs') {
                toggleListening();
              } else if (isLiveConnected) {
                liveClientRef.current?.disconnect();
              } else {
                initGeminiLive();
              }
            }}
            className={clsx(
              'cc-orb w-11 h-11 flex items-center justify-center shrink-0 text-brand-gold',
              (isListening || isLiveConnected) ? 'cc-orb-active cc-pulse-ring text-green-400' : ''
            )}
            title={engine === 'elevenlabs' ? (isListening ? 'Stop listening' : 'Start listening') : isLiveConnected ? 'Live Open Mic Connected (click to disconnect)' : 'Click to connect Gemini Live API'}
          >
            {(isListening || isLiveConnected) ? <Radio className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
          </button>

          <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder={isListening ? 'Listening — speak now, or type anytime...' : 'Type or speak your question...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-gold/40 text-brand-gold disabled:opacity-30 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
