import React, { useState } from 'react';
import { voiceEngine, VOICE_PERSONAS } from '../lib/voiceSynthesis';
import {
  ELEVEN_VOICES,
  getElevenLabsVoiceId,
  setElevenLabsVoiceId,
  isElevenLabsConfigured,
  speakWithElevenLabs,
  stopElevenLabsSpeech,
} from '../lib/elevenLabsService';
import { Bot, Volume2, VolumeX, ChevronDown, ChevronUp, Mic, Check } from 'lucide-react';
import clsx from 'clsx';
import { CaseRecord } from '../types/claimcoda';

interface FloatingAvatarGuideProps {
  currentStep: 'upload' | 'review' | 'evidence' | 'draft' | 'export';
  caseData?: Partial<CaseRecord>;
  onOpenVoiceModal: () => void;
}

export function FloatingAvatarGuide({ currentStep, caseData, onOpenVoiceModal }: FloatingAvatarGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Minimized by default
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Quiet by default (no unprompted auto-speech)
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const usingPremiumVoice = isElevenLabsConfigured();
  const [selectedPersonaId, setSelectedPersonaId] = useState(
    usingPremiumVoice ? getElevenLabsVoiceId() : voiceEngine.getPersona().id
  );

  const insurer = caseData?.insurerName && caseData.insurerName !== 'Insurer on File' ? caseData.insurerName : 'your health plan';

  const stepGuidance: Record<string, { title: string; speech: string; actionTip: string }> = {
    upload: {
      title: 'Step 1: Document Ingestion',
      speech: `Welcome! I'm Elena, your ClaimCoda co-pilot. Don't worry about confusing insurance jargon—all you need to do is drop in your denial letter, or click one of our realistic test cases below. I'll read through every line and pull out the exact codes and dates for you.`,
      actionTip: 'Select a PDF/image or click a synthetic sample below to start.',
    },
    review: {
      title: 'Step 2: Fact Verification',
      speech: `Great job! I've extracted the material facts with exact page citations on the left. Take a quick look to confirm everything matches your document, then click 'Confirm All Verified' to proceed.`,
      actionTip: 'Verify the extracted facts against the source text on the left.',
    },
    evidence: {
      title: 'Step 3: Evidence Strategy',
      speech: `Here is where we build our strongest case. Your denial from ${insurer} requires specific clinical evidence. I've prepared a checklist of recommended exhibits. Click 'Attach Document' next to each item when you're ready.`,
      actionTip: 'Attach your Letter of Medical Necessity or clinical chart notes.',
    },
    draft: {
      title: 'Step 4: Grounded Appeal Builder',
      speech: `Your appeal letter is drafted strictly from your confirmed facts with zero hallucinations. Review the text, customize any section if you like, and click 'Approve & Finalize'.`,
      actionTip: 'Check the live green reconciliation badges and customize sections.',
    },
    export: {
      title: 'Step 5: Packet Export & Filing',
      speech: `Congratulations! Your complete 3-part evidence-backed appeal packet is ready. Download the PDF, sign Page 2, and use the certified mail checklist on Page 3 to submit it.`,
      actionTip: 'Click Download Official Appeal Packet (PDF) to finalize.',
    },
  };

  const currentInfo = stepGuidance[currentStep] || stepGuidance.upload;

  const speak = (text: string, onStart: () => void, onEnd: () => void) => {
    if (usingPremiumVoice) {
      speakWithElevenLabs(text, {
        onStart,
        onEnd,
        onError: () => {
          // Quietly fall back to the browser voice rather than going silent.
          voiceEngine.speak(text, { onStart, onEnd, onError: onEnd });
        },
      });
    } else {
      voiceEngine.speak(text, { onStart, onEnd, onError: onEnd });
    }
  };

  const handlePlaySpeech = () => {
    setIsMuted(false);
    voiceEngine.setMuted(false);
    speak(
      currentInfo.speech,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleStopSpeech = () => {
    voiceEngine.stop();
    stopElevenLabsSpeech();
    setIsSpeaking(false);
    setIsMuted(true);
    voiceEngine.setMuted(true);
  };

  const handleSelectPersona = (id: string) => {
    setSelectedPersonaId(id);
    let name = id;
    if (usingPremiumVoice) {
      setElevenLabsVoiceId(id);
      name = ELEVEN_VOICES.find((v) => v.id === id)?.name.split(' —')[0] || 'your new voice';
    } else {
      voiceEngine.setPersona(id);
      name = voiceEngine.getPersona().name.split(' ')[0];
    }
    setShowPersonaMenu(false);
    speak(
      `Hi, I'm ${name}.`,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const currentPersonaLabel = usingPremiumVoice
    ? ELEVEN_VOICES.find((v) => v.id === selectedPersonaId)?.name.split(' —')[0] || 'Elena'
    : voiceEngine.getPersona().name.split(' ')[0];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end max-w-sm w-full pointer-events-none">

      {/* Expanded Guidance Bubble (only when clicked) */}
      {isExpanded && (
        <div className="pointer-events-auto mb-3 w-full bg-brand-surface border border-brand-gold/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 relative overflow-hidden">

          {/* Top Gold Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

          {/* Bubble Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-brand-border/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-gold" />
              <span className="font-medium text-brand-gold text-[11px]">{currentInfo.title}</span>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded text-brand-text-muted hover:text-brand-text transition-colors"
              title="Minimize guide"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Guidance */}
          <p className="text-xs text-brand-text leading-relaxed mb-3">
            {currentInfo.speech}
          </p>

          {/* Action Tip */}
          <div className="cc-inset p-2.5 rounded-xl text-[11px] text-brand-text-muted flex items-center justify-between mb-3">
            <span>💡 <strong>Tip:</strong> {currentInfo.actionTip}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={isSpeaking ? handleStopSpeech : handlePlaySpeech}
              className="text-[11px] bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-brand-gold" />}
              <span>{isSpeaking ? 'Stop Voice' : 'Listen to Guide'}</span>
            </button>

            <button
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 text-xs bg-brand-gold text-brand-bg font-medium px-3.5 py-1.5 rounded-lg hover:bg-brand-gold/90 transition-all"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Talk to Advocate</span>
            </button>
          </div>

          {/* Voice Persona Selector */}
          <div className="mt-2 pt-2 border-t border-brand-border/40 flex items-center justify-between text-[10px] text-brand-text-muted">
            <span>
              Voice: <strong className="text-brand-text">{currentPersonaLabel}</strong>
              {!usingPremiumVoice && <span className="ml-1 opacity-70">(backup — add ElevenLabs key for premium)</span>}
            </span>
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="text-brand-gold hover:underline shrink-0"
            >
              Change Voice
            </button>
          </div>

          {showPersonaMenu && (
            <div className="mt-2 p-2 bg-brand-bg rounded-xl border border-brand-border space-y-1 text-[11px] max-h-40 overflow-y-auto">
              {(usingPremiumVoice ? ELEVEN_VOICES : VOICE_PERSONAS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPersona(p.id)}
                  className={clsx(
                    'w-full text-left p-1.5 rounded-lg flex items-center justify-between transition-colors',
                    selectedPersonaId === p.id ? 'bg-brand-gold/15 text-brand-gold font-medium' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
                  )}
                >
                  <span>{p.name}</span>
                  {selectedPersonaId === p.id && <Check className="w-3 h-3 text-brand-gold" />}
                </button>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Floating Avatar Trigger Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => {
            const next = !isExpanded;
            setIsExpanded(next);
          }}
          className={clsx(
            'cc-orb px-4 py-2.5 flex items-center gap-3 hover:scale-105 transition-all text-xs group',
            isSpeaking ? 'cc-orb-active' : ''
          )}
        >
          {/* Animated Avatar Glow Orb */}
          <div className="relative w-7 h-7 rounded-xl bg-brand-gold/20 border border-brand-gold flex items-center justify-center text-brand-gold">
            {isSpeaking ? (
              <span className="w-2.5 h-2.5 rounded-full bg-brand-gold animate-ping" />
            ) : (
              <Bot className="w-4 h-4 text-brand-gold group-hover:scale-110 transition-transform" />
            )}
          </div>

          <div className="text-left">
            <div className="text-[11px] font-medium text-brand-text flex items-center gap-1.5">
              <span>{currentPersonaLabel} (AI Co-Pilot)</span>
              {isSpeaking && <span className="text-[9px] text-brand-gold animate-pulse">Speaking...</span>}
            </div>
            <div className="text-[9px] text-brand-text-muted truncate max-w-[120px]">
              {isExpanded ? 'Click to collapse' : 'Click for step guidance'}
            </div>
          </div>

          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-brand-text-muted" /> : <ChevronUp className="w-3.5 h-3.5 text-brand-gold" />}
        </button>
      </div>

    </div>
  );
}
