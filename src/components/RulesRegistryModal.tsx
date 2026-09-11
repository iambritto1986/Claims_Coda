import React from 'react';
import { X, BookOpen, ExternalLink, Scale, Clock, ShieldAlert } from 'lucide-react';
import { RULES_REGISTRY } from '../lib/rulesRegistry';
import { PlanContextType } from '../types/claimcoda';

interface RulesRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planContext?: PlanContextType;
}

export function RulesRegistryModal({ isOpen, onClose, planContext }: RulesRegistryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-brand-surface border border-brand-border max-w-3xl w-full max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-surface-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-gold/30 flex items-center justify-center text-brand-gold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-light text-brand-text">Official Appeals & Regulatory Rules Registry</h2>
              <p className="text-xs text-brand-text-muted">Reviewed statutory deadlines and governing standards (CMS, ACA, ERISA, DOL).</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-text-muted hover:text-brand-text rounded-lg hover:bg-brand-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="p-4 bg-brand-bg/80 border border-brand-border rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
            <p className="text-xs text-brand-text-muted leading-relaxed">
              <strong className="text-brand-text font-medium">Zero Hallucinated Deadlines Guarantee:</strong> ClaimCoda displays official statutory timeframes directly from reviewed federal and state regulations. If your specific denial notice specifies an earlier deadline, that document-based date is prioritized.
            </p>
          </div>

          <div className="space-y-4">
            {RULES_REGISTRY.map((rule) => (
              <div
                key={rule.id}
                className="bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 p-5 rounded-xl transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-brand-surface border border-brand-gold/30 text-brand-gold font-medium">
                    {rule.jurisdiction}
                  </span>
                  <a
                    href={rule.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-gold hover:underline"
                  >
                    <span>Official Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <h3 className="text-base font-medium text-brand-text mb-1">{rule.ruleTitle}</h3>
                <p className="text-xs text-brand-text-muted mb-4">{rule.governingBody} • <span className="font-mono text-brand-text">{rule.legalCitation}</span></p>

                <p className="text-sm text-brand-text/90 leading-relaxed mb-4">
                  {rule.description}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-brand-border text-xs">
                  <div className="bg-brand-surface p-2.5 rounded-lg border border-brand-border">
                    <div className="text-brand-text-muted mb-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-gold" />
                      Internal Appeal
                    </div>
                    <div className="text-sm font-semibold text-brand-text">{rule.statutoryDaysInternalAppeal} Days</div>
                  </div>

                  <div className="bg-brand-surface p-2.5 rounded-lg border border-brand-border">
                    <div className="text-brand-text-muted mb-0.5 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-brand-gold" />
                      External Review
                    </div>
                    <div className="text-sm font-semibold text-brand-text">{rule.statutoryDaysExternalReview} Days (4 Mo.)</div>
                  </div>

                  <div className="bg-brand-surface p-2.5 rounded-lg border border-brand-border">
                    <div className="text-brand-text-muted mb-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-red-400" />
                      Expedited Urgent
                    </div>
                    <div className="text-sm font-semibold text-red-300">{rule.expeditedUrgentHours} Hours</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-border bg-brand-surface-light flex justify-end">
          <button
            onClick={onClose}
            className="bg-brand-gold text-brand-bg font-medium px-5 py-2 rounded-xl text-sm hover:bg-brand-gold/90 transition-colors"
          >
            Close Registry
          </button>
        </div>

      </div>
    </div>
  );
}
