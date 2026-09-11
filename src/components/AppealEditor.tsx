import React, { useState } from 'react';
import { AppealDraft } from '../types/claimcoda';
import { CheckCircle2, ShieldCheck, AlertCircle, Edit3, Eye, ArrowRight, RefreshCw, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { useNotification } from './NotificationProvider';

interface AppealEditorProps {
  draft: AppealDraft;
  onUpdateDraft: (draft: AppealDraft) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onBack: () => void;
  isRegenerating?: boolean;
}

export function AppealEditor({
  draft,
  onUpdateDraft,
  onApprove,
  onRegenerate,
  onBack,
  isRegenerating = false,
}: AppealEditorProps) {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'structured' | 'fulltext'>('structured');
  const [copied, setCopied] = useState(false);

  const handleSectionChange = (sectionKey: keyof typeof draft.sections, newText: string) => {
    const updatedSections = {
      ...draft.sections,
      [sectionKey]: newText,
    };
    onUpdateDraft({
      ...draft,
      sections: updatedSections,
    });
  };

  const handleFullTextChange = (text: string) => {
    onUpdateDraft({
      ...draft,
      fullLetterText: text,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft.fullLetterText);
    setCopied(true);
    notify('Appeal letter copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const sectionDefs: Array<{ key: keyof typeof draft.sections; title: string; desc: string }> = [
    { key: 'statementOfAppeal', title: '1. Statement of Appeal', desc: 'Formal declaration of first-level administrative appeal' },
    { key: 'factualBackground', title: '2. Factual Background & Claim History', desc: 'Summary of clinical encounter, billing, and adverse determination' },
    { key: 'clinicalAndLegalGrounds', title: '3. Clinical & Legal Grounds', desc: 'Medical necessity argumentation and standard-of-care justification' },
    { key: 'evidenceSummary', title: '4. Summary of Attached Evidence', desc: 'Exhibit index and clinical rebuttal descriptions' },
    { key: 'regulatoryCitations', title: '5. Regulatory & Statutory Protections', desc: 'ERISA 29 CFR § 2560.503-1 / ACA 45 CFR § 147.136 protections' },
    { key: 'formalRemediesAndDemand', title: '6. Demand for Remedy', desc: 'Explicit request for claim reprocessing and full reimbursement' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Reconciliation Bar */}
      <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-gold/15 border border-brand-gold/40 text-brand-gold font-medium">
                Grounded Draft v{draft.version}
              </span>
              <span className="text-xs text-brand-text-muted">Model: {draft.modelUsed}</span>
            </div>
            <h2 className="text-xl font-light text-brand-text">Review & Customize Appeal Letter</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 text-xs bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-3.5 py-2 rounded-lg transition-all disabled:opacity-40"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 text-brand-gold', isRegenerating && 'animate-spin')} />
              <span>Regenerate Draft</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-3.5 py-2 rounded-lg transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-brand-gold" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
        </div>

        {/* Fact Reconciliation Guard Status */}
        <div className="bg-brand-bg/80 p-4 rounded-xl border border-brand-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-brand-text">
              <ShieldCheck className="w-4 h-4 text-brand-gold" />
              <span>Grounded Fact Reconciliation Status</span>
            </div>
            <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded border', draft.reconciliation.passed ? 'bg-green-950/40 text-green-300 border-green-800/40' : 'bg-amber-950/40 text-amber-300 border-amber-800/40')}>
              {draft.reconciliation.passed ? '100% Facts Verified' : 'Reconciliation Warnings'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {draft.reconciliation.checks.map((chk, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-brand-surface p-2 rounded-lg border border-brand-border">
                <CheckCircle2 className={clsx('w-3.5 h-3.5 shrink-0', chk.foundInDraft ? 'text-brand-gold' : 'text-amber-400')} />
                <span className="text-brand-text-muted truncate">
                  {chk.field}: <strong className="text-brand-text font-normal">{chk.expected}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-brand-border pb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('structured')}
            className={clsx('text-xs font-medium pb-2 border-b-2 transition-all flex items-center gap-1.5', activeTab === 'structured' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-brand-text')}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Section-by-Section Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('fulltext')}
            className={clsx('text-xs font-medium pb-2 border-b-2 transition-all flex items-center gap-1.5', activeTab === 'fulltext' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-brand-text')}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Full Letter Preview</span>
          </button>
        </div>
      </div>

      {/* Section Editor or Full Text View */}
      {activeTab === 'structured' ? (
        <div className="space-y-4">
          {sectionDefs.map((sec) => (
            <div key={sec.key} className="bg-brand-surface border border-brand-border p-5 rounded-xl">
              <div className="mb-2">
                <h3 className="text-sm font-medium text-brand-gold">{sec.title}</h3>
                <p className="text-[11px] text-brand-text-muted">{sec.desc}</p>
              </div>

              <textarea
                value={draft.sections[sec.key]}
                onChange={(e) => handleSectionChange(sec.key, e.target.value)}
                rows={4}
                className="w-full bg-brand-bg border border-brand-border focus:border-brand-gold/60 rounded-lg p-3 text-sm text-brand-text leading-relaxed resize-y focus:outline-none transition-colors"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border p-6 rounded-xl">
          <textarea
            value={draft.fullLetterText}
            onChange={(e) => handleFullTextChange(e.target.value)}
            rows={22}
            className="w-full bg-brand-bg font-mono text-xs text-brand-text/90 p-4 rounded-lg border border-brand-border focus:border-brand-gold/60 leading-relaxed resize-y focus:outline-none"
          />
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-brand-border">
        <button
          onClick={onBack}
          className="text-xs text-brand-text-muted hover:text-brand-text px-4 py-2 transition-colors"
        >
          ← Back to Evidence Checklist
        </button>

        <button
          onClick={onApprove}
          className="flex items-center gap-2 text-xs font-medium bg-brand-gold text-brand-bg px-6 py-2.5 rounded-xl hover:bg-brand-gold/90 transition-all shadow-[0_0_20px_rgba(185,152,69,0.15)]"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Approve & Finalize Appeal Packet</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
