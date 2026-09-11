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
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import { CaseRecord } from '../types/claimcoda';
import { generateConversationalAdvocateResponse } from '../lib/geminiService';
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

export function VoiceAdvocateModal({ isOpen, onClose, caseData }: VoiceAdvocateProps) {
  // ElevenLabs Voice Selection & Configuration
  const [elevenVoiceId, setElevenVoiceId] = useState<string>(getElevenLabsVoiceId());
  const [elevenKeyInput, setElevenKeyInput] = useState(getElevenLabsApiKey());
  const [elevenKeySaved, setElevenKeySaved] = useState(false);
  const [showSettings, setShowSettings] = useState(!isElevenLabsConfigured());

  // Speech Recognition & Playback
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

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const insurerName =
    caseData?.insurerName && caseData.insurerName !== 'Insurer on File'
      ? caseData.insurerName
      : 'your health insurer';

  const currentVoice: ElevenLabsVoiceOption =
    ELEVEN_VOICES.find((v) => v.id === elevenVoiceId) || ELEVEN_VOICES[0];

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const pauseRecognitionForPlayback = () => {
    if (recognitionRef.current && recognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const resumeRecognitionIfNeeded = () => {
    if (shouldKeepListeningRef.current && recognitionRef.current && !recognitionActiveRef.current) {
      try {
        recognitionRef.current.start();
        recognitionActiveRef.current = true;
      } catch {
        // ignore
      }
    }
  };

  // Speak with ElevenLabs Studio Neural Voice
  const speakText = useCallback(
    (text: string) => {
      if (!voiceEnabled) return;

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
            setLastError(`ElevenLabs notice: ${msg}. Using backup voice.`);
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

  // Speech Recognition (Mic Input)
  const initRecognition = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setLastError('Browser speech input not supported. You can type your questions below.');
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
      setLastError(`Mic notice: ${event.error}. Click mic to retry.`);
      recognitionActiveRef.current = false;
    };

    recognition.onend = () => {
      recognitionActiveRef.current = false;
      if (shouldKeepListeningRef.current && !isSpeakingRef.current) {
        try {
          recognition.start();
          recognitionActiveRef.current = true;
        } catch {
          // ignore
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      const rec = initRecognition();
      if (!rec) return;
      recognitionRef.current = rec;
    }

    if (isListening) {
      shouldKeepListeningRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionActiveRef.current = false;
      setIsListening(false);
    } else {
      shouldKeepListeningRef.current = true;
      try {
        recognitionRef.current.start();
        recognitionActiveRef.current = true;
        setIsListening(true);
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  // Handle User Message Turn
  const handleUserMessage = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setLastError(null);

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
    } catch (e: any) {
      console.error(e);
      setLastError(e?.message || 'Failed to generate response.');
    } finally {
      setIsThinking(false);
    }
  };

  // Initial Open Greeting
  useEffect(() => {
    if (!isOpen) {
      stopElevenLabsSpeech();
      voiceEngine.stop();
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      return;
    }

    const personaDisplayName = currentVoice.name.split('—')[0].trim();
    const greetingText = `Hi there! I'm ${personaDisplayName}, your ClaimCoda appeal co-pilot. I'm right here with you to navigate your claim with ${insurerName}. How can I help you today? You can ask me why it was denied, what documents you need, or check your deadline.`;

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

    return () => {
      stopElevenLabsSpeech();
      voiceEngine.stop();
    };
  }, [isOpen, elevenVoiceId, voiceEnabled]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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
    setTimeout(() => {
      setElevenKeySaved(false);
      setShowSettings(false);
    }, 1200);
  };

  const handleVoiceChange = (voiceId: string) => {
    setElevenVoiceId(voiceId);
    setElevenLabsVoiceId(voiceId);
    stopElevenLabsSpeech();
  };

  const quickPrompts = [
    'Why did they deny my claim?',
    'What documents should I ask my doctor for?',
    'How long do I have to appeal?',
    'What is an Independent External Review?',
  ];

  if (!isOpen) return null;

  const isElevenActive = isElevenLabsConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-brand-surface border border-brand-gold/40 max-w-2xl w-full h-[660px] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

        {/* Header */}
        <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-surface-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center text-brand-gold shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-brand-text">ClaimCoda Voice Advocate</h3>
                
                {isElevenActive ? (
                  <span className="text-[10px] bg-emerald-950/70 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-700/50 flex items-center gap-1 font-medium shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ElevenLabs Studio HD</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-950/70 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-800/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-brand-gold" />
                    <span>Neural Voice Mode</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-text-muted">100% ElevenLabs Studio Neural Voice Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ElevenLabs Voice Persona Selector */}
            <select
              value={elevenVoiceId}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="text-xs bg-brand-surface border border-brand-border hover:border-brand-gold/50 text-brand-gold px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none transition-colors max-w-[170px] truncate"
              title="Select ElevenLabs Voice Persona"
            >
              {ELEVEN_VOICES.map((v) => (
                <option key={v.id} value={v.id} className="bg-brand-surface text-brand-text">
                  {v.name}
                </option>
              ))}
            </select>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={clsx(
                'p-2 rounded-xl border transition-colors',
                showSettings
                  ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                  : 'border-brand-border bg-brand-surface text-brand-text-muted hover:text-brand-text'
              )}
              title="ElevenLabs Voice Settings"
            >
              <Settings className="w-4 h-4 text-brand-gold" />
            </button>

            {/* Mute Button */}
            <button
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (!next) {
                  stopElevenLabsSpeech();
                  voiceEngine.stop();
                }
              }}
              className="p-2 rounded-xl border border-brand-border bg-brand-surface text-brand-text-muted hover:text-brand-text transition-colors"
              title={voiceEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-brand-gold" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                stopElevenLabsSpeech();
                voiceEngine.stop();
                onClose();
              }}
              className="p-2 rounded-xl border border-brand-border bg-brand-surface text-brand-text-muted hover:text-brand-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ElevenLabs API Key Settings Drawer */}
        {showSettings && (
          <div className="p-4 bg-brand-surface-light border-b border-brand-border text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-brand-gold flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>ElevenLabs Neural Voice Configuration</span>
              </span>
              <button onClick={() => setShowSettings(false)} className="text-brand-text-muted hover:text-brand-text">
                ✕
              </button>
            </div>
            <p className="text-brand-text-muted mb-3 text-[11px] leading-relaxed">
              Enter your ElevenLabs API key for high-definition, emotional, studio-quality speech. Stored securely in your browser.
            </p>
            <form onSubmit={handleSaveElevenKey} className="flex gap-2 mb-3">
              <input
                type="password"
                placeholder="Enter ElevenLabs API Key (sk_...)"
                value={elevenKeyInput}
                onChange={(e) => setElevenKeyInput(e.target.value)}
                className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold font-mono"
              />
              <button
                type="submit"
                className="bg-brand-gold text-brand-bg font-medium px-4 py-1.5 rounded-lg text-xs hover:bg-brand-gold/90 transition-all flex items-center gap-1"
              >
                {elevenKeySaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{elevenKeySaved ? 'Saved!' : 'Save Key'}</span>
              </button>
            </form>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-brand-border/40">
              {ELEVEN_VOICES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVoiceChange(v.id)}
                  className={clsx(
                    'p-2 rounded-xl text-left border transition-all text-[11px]',
                    elevenVoiceId === v.id
                      ? 'border-brand-gold bg-brand-gold/15 text-brand-gold shadow-sm'
                      : 'border-brand-border bg-brand-surface text-brand-text-muted hover:border-brand-gold/30'
                  )}
                >
                  <div className="font-medium truncate">{v.name.split('—')[0]}</div>
                  <div className="text-[9px] opacity-75 capitalize">{v.gender}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status & Animated Audio Waveform Bar */}
        <div className="bg-brand-bg px-6 py-2.5 border-b border-brand-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {/* Dynamic Waveform Bars */}
            <div className="flex items-center gap-1 h-5">
              {[0.3, 0.7, 0.4, 0.9, 0.5, 0.8, 0.6, 1.0, 0.4, 0.7].map((heightRatio, i) => {
                const activityLevel = outputVolume > 0.05 ? outputVolume : isSpeaking ? 0.6 : isListening ? 0.4 : 0.05;
                const dynamicHeight = Math.max(4, Math.min(20, heightRatio * 20 * (activityLevel * 2.5 + 0.15)));
                return (
                  <span
                    key={i}
                    className={clsx(
                      'w-1 rounded-full transition-all duration-75',
                      isSpeaking
                        ? 'bg-brand-gold shadow-[0_0_8px_rgba(185,152,69,0.5)]'
                        : isListening
                        ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                        : 'bg-brand-border'
                    )}
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>

            <span className="text-brand-text-muted text-[11px] flex items-center gap-1.5">
              {isSpeaking ? (
                <span className="text-brand-gold font-medium">✨ {currentVoice.name.split('—')[0]} is speaking...</span>
              ) : isListening ? (
                <span className="text-green-400 font-medium">🎙️ Microphone active (speak freely)...</span>
              ) : isThinking ? (
                <span>Formulating personalized answer...</span>
              ) : (
                <span>Speak with microphone or type below</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full border border-brand-gold/30">
              Voice: <strong>{currentVoice.name.split('—')[0]}</strong>
            </span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-brand-bg/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={clsx(
                'flex gap-3 max-w-[85%]',
                m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-sm',
                  m.sender === 'user'
                    ? 'bg-brand-gold text-brand-bg font-semibold'
                    : 'bg-brand-surface-light border border-brand-gold/30 text-brand-gold'
                )}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={clsx(
                  'p-4 rounded-2xl text-xs leading-relaxed border group relative',
                  m.sender === 'user'
                    ? 'bg-brand-gold text-brand-bg font-medium border-brand-gold rounded-tr-none'
                    : 'bg-brand-surface text-brand-text border-brand-border rounded-tl-none'
                )}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div
                    className={clsx(
                      'text-[10px]',
                      m.sender === 'user' ? 'text-brand-bg/70' : 'text-brand-text-muted'
                    )}
                  >
                    {m.timestamp}
                  </div>
                  {m.sender === 'advocate' && (
                    <button
                      onClick={() => speakText(m.text)}
                      className="text-[10px] text-brand-gold hover:underline flex items-center gap-1 opacity-80 hover:opacity-100"
                      title="Replay Spoken Audio"
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

        {/* Error notice if any */}
        {lastError && (
          <div className="px-6 py-2 bg-amber-950/40 border-t border-amber-800/40 text-[11px] text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lastError}</span>
          </div>
        )}

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
            onClick={toggleListening}
            className={clsx(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-md shrink-0',
              isListening
                ? 'bg-green-500 text-white animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                : 'bg-brand-gold text-brand-bg hover:bg-brand-gold/90 shadow-[0_0_15px_rgba(185,152,69,0.2)]'
            )}
            title={isListening ? 'Microphone listening (click to stop)' : 'Click to start voice microphone'}
          >
            {isListening ? <Radio className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
          </button>

          <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder={isListening ? 'Listening (speak now)...' : 'Type or speak your question...'}
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
