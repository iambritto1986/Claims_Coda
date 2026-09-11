import React, { useState, useEffect } from 'react';
import { Key, Check, X, Sparkles, Shield, ExternalLink, Volume2, Bot } from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey } from '../lib/geminiService';
import { getElevenLabsApiKey, setElevenLabsApiKey, isElevenLabsConfigured } from '../lib/elevenLabsService';
import clsx from 'clsx';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeySaved }: ApiKeyModalProps) {
  const [activeTab, setActiveTab] = useState<'elevenlabs' | 'gemini'>('elevenlabs');
  const [geminiKey, setGeminiKey] = useState(getGeminiApiKey());
  const [elevenKey, setElevenKey] = useState(getElevenLabsApiKey());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(getGeminiApiKey());
      setElevenKey(getElevenLabsApiKey());
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'elevenlabs') {
      setElevenLabsApiKey(elevenKey.trim());
    } else {
      setGeminiApiKey(geminiKey.trim());
    }
    setIsSaved(true);
    onKeySaved?.();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-brand-surface border border-brand-gold/40 max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

        {/* Header */}
        <div className="p-5 border-b border-brand-border flex items-center justify-between bg-brand-surface-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center text-brand-gold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-medium text-brand-text">AI Keys & Voice Configuration</h3>
              <p className="text-xs text-brand-text-muted">Manage your ElevenLabs Studio Voice & Google AI Brain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-brand-border text-brand-text-muted hover:text-brand-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-brand-border bg-brand-bg px-6 pt-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('elevenlabs')}
            className={clsx(
              'pb-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-all',
              activeTab === 'elevenlabs'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            )}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>ElevenLabs Voice Engine</span>
            {isElevenLabsConfigured() && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={clsx(
              'pb-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-all',
              activeTab === 'gemini'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Google Gemini (Brain)</span>
            {getGeminiApiKey() && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {activeTab === 'elevenlabs' ? (
            <>
              <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border/60 text-xs text-brand-text-muted space-y-2">
                <div className="flex items-center gap-2 text-brand-text font-medium">
                  <Shield className="w-4 h-4 text-brand-gold" />
                  <span>100% Studio Neural Voice</span>
                </div>
                <p>
                  Your ElevenLabs API key powers human-like, warm, empathetic speech across the Voice Advocate and Floating Avatar (*Elena, Marcus, Grace, Roger, George*).
                </p>
                <div className="pt-1">
                  <a
                    href="https://elevenlabs.io/app/settings/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-gold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Get an API key from ElevenLabs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-text mb-1.5">
                  ElevenLabs API Key
                </label>
                <input
                  type="password"
                  placeholder="sk_..."
                  value={elevenKey}
                  onChange={(e) => setElevenKey(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold font-mono"
                  autoFocus
                />
              </div>
            </>
          ) : (
            <>
              <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border/60 text-xs text-brand-text-muted space-y-2">
                <div className="flex items-center gap-2 text-brand-text font-medium">
                  <Shield className="w-4 h-4 text-brand-gold" />
                  <span>Document Analysis & Appeal Drafting</span>
                </div>
                <p>
                  Google Gemini 2.5 Flash extracts CPT codes, dates, and denial reasons from your uploaded EOB PDFs and writes grounded appeal letters.
                </p>
                <div className="pt-1">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-gold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Get a free key from Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-text mb-1.5">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold font-mono"
                  autoFocus
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-brand-gold hover:bg-brand-gold/90 text-brand-bg font-medium px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{isSaved ? 'Saved!' : 'Save Key'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
