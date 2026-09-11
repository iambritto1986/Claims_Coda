import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { useNotification } from './NotificationProvider';

interface ConsentModalProps {
  isOpen: boolean;
  onConsentComplete: () => void;
}

export function ConsentOnboardingModal({ isOpen, onConsentComplete }: ConsentModalProps) {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [agreedAdmin, setAgreedAdmin] = useState(false);
  const [agreedVerification, setAgreedVerification] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const canProceed = agreedAdmin && agreedVerification && agreedPrivacy;

  const handleAccept = async () => {
    if (!canProceed || !user) return;
    setSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        consentVersion: 'v1.0-2026-09',
        consentAcceptedAt: new Date().toISOString(),
      });
      notify('Privacy & administrative boundaries confirmed.', 'success');
      onConsentComplete();
    } catch (err: any) {
      console.error('Error saving consent:', err);
      // Even if Firestore update fails on demo, let them proceed
      onConsentComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-brand-surface border border-brand-gold/40 max-w-2xl w-full rounded-2xl p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Gold Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-brand-text">Plain-Language Consent & Boundaries</h2>
            <p className="text-xs text-brand-text-muted">Please confirm your understanding of ClaimCoda’s operational boundaries.</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          
          {/* Card 1: Administrative Scope */}
          <label 
            onClick={() => setAgreedAdmin(!agreedAdmin)}
            className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              agreedAdmin ? 'bg-brand-surface-light border-brand-gold/60 text-brand-text' : 'bg-brand-bg/50 border-brand-border text-brand-text-muted hover:border-brand-border/80'
            }`}
          >
            <div className={`mt-1 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
              agreedAdmin ? 'bg-brand-gold border-brand-gold text-brand-bg' : 'border-brand-border'
            }`}>
              {agreedAdmin && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className="text-sm leading-relaxed">
              <strong className="text-brand-text font-medium block mb-0.5">Administrative Workspace (Not Legal or Medical Advice)</strong>
              ClaimCoda is an administrative and document preparation tool. It does not provide legal representation, medical diagnosis, clinical urgency assessments, or guaranteed outcomes.
            </div>
          </label>

          {/* Card 2: Grounded Fact Confirmation */}
          <label 
            onClick={() => setAgreedVerification(!agreedVerification)}
            className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              agreedVerification ? 'bg-brand-surface-light border-brand-gold/60 text-brand-text' : 'bg-brand-bg/50 border-brand-border text-brand-text-muted hover:border-brand-border/80'
            }`}
          >
            <div className={`mt-1 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
              agreedVerification ? 'bg-brand-gold border-brand-gold text-brand-bg' : 'border-brand-border'
            }`}>
              {agreedVerification && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className="text-sm leading-relaxed">
              <strong className="text-brand-text font-medium block mb-0.5">Human Verification Required</strong>
              I understand that AI-extracted information from denial documents must be reviewed and verified by me before any appeal draft is generated or finalized.
            </div>
          </label>

          {/* Card 3: Privacy & Data Security */}
          <label 
            onClick={() => setAgreedPrivacy(!agreedPrivacy)}
            className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              agreedPrivacy ? 'bg-brand-surface-light border-brand-gold/60 text-brand-text' : 'bg-brand-bg/50 border-brand-border text-brand-text-muted hover:border-brand-border/80'
            }`}
          >
            <div className={`mt-1 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
              agreedPrivacy ? 'bg-brand-gold border-brand-gold text-brand-bg' : 'border-brand-border'
            }`}>
              {agreedPrivacy && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className="text-sm leading-relaxed">
              <strong className="text-brand-text font-medium block mb-0.5">Privacy & Control</strong>
              Your uploaded documents and case history remain under your strict control. You can permanently purge your documents and case record at any time from your dashboard.
            </div>
          </label>

        </div>

        <div className="flex items-center justify-between pt-4 border-t border-brand-border">
          <div className="flex items-center gap-2 text-xs text-brand-text-muted">
            <AlertTriangle className="w-4 h-4 text-brand-gold" />
            <span>Consent Version 1.0 (Fair & Square Build Pack)</span>
          </div>

          <button
            onClick={handleAccept}
            disabled={!canProceed || submitting}
            className="flex items-center gap-2 bg-brand-gold text-brand-bg font-medium px-6 py-2.5 rounded-xl hover:bg-brand-gold/90 disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(185,152,69,0.15)]"
          >
            <span>{submitting ? 'Saving...' : 'Accept & Open Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
