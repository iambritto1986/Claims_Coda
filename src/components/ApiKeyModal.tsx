import React, { useState, useEffect } from 'react';
import { Key, Check, X, Sparkles, Shield, ExternalLink } from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey } from '../lib/geminiService';
import clsx from 'clsx';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeySaved }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(apiKey.trim());
    setIsSaved(true);
    onKeySaved?.(apiKey.trim());
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-brand-surface border border-brand-gold/40 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

        {/* Header */}
        <div className="p-5 border-b border-brand-border flex items-center justify-between bg-brand-surface-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center text-brand-gold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-medium text-brand-text">Google Gemini API Key</h3>
              <p className="text-xs text-brand-text-muted">Direct connection for Gemini Multimodal Live Speech & Reasoning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-brand-border text-brand-text-muted hover:text-brand-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="bg-brand-bg p-4 rounded-xl border border-brand-border/60 text-xs text-brand-text-muted space-y-2">
            <div className="flex items-center gap-2 text-brand-text font-medium">
              <Shield className="w-4 h-4 text-brand-gold" />
              <span>Private & Client-Side Stored</span>
            </div>
            <p>
              Your API key is stored securely in your browser's local storage and used directly to establish the WebSocket connection to Google's Gemini Multimodal Live API.
            </p>
            <div className="pt-1">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-brand-gold hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Get a free Gemini API key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-text mb-1.5">
              Enter Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold font-mono"
              autoFocus
            />
          </div>

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
              disabled={!apiKey.trim()}
              className="bg-brand-gold hover:bg-brand-gold/90 text-brand-bg font-medium px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-40"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{isSaved ? 'Connected & Saved!' : 'Save & Connect'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
