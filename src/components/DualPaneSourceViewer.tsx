import React, { useState } from 'react';
import { ExtractedFact } from '../types/claimcoda';
import { CheckCircle2, Edit2, AlertCircle, FileSearch, Sparkles, Check, X, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface DualPaneProps {
  facts: ExtractedFact[];
  documentText: string;
  documentName?: string;
  onUpdateFact: (updated: ExtractedFact) => void;
  onConfirmFact: (id: string) => void;
  onConfirmAll: () => void;
  onProceed: () => void;
}

export function DualPaneSourceViewer({
  facts,
  documentText,
  documentName = 'Denial_Notice.pdf',
  onUpdateFact,
  onConfirmFact,
  onConfirmAll,
  onProceed,
}: DualPaneProps) {
  const [activeFactId, setActiveFactId] = useState<string | null>(facts[0]?.id || null);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const activeFact = facts.find((f) => f.id === activeFactId);
  const allConfirmed = facts.length > 0 && facts.every((f) => f.confirmed);

  const startEdit = (fact: ExtractedFact) => {
    setEditingFactId(fact.id);
    setEditValue(fact.value);
  };

  const saveEdit = (fact: ExtractedFact) => {
    onUpdateFact({
      ...fact,
      value: editValue,
      userEdited: true,
      originalValue: fact.originalValue || fact.value,
      confirmed: true, // Editing automatically confirms
    });
    setEditingFactId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top action / progress banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-surface p-4 rounded-xl border border-brand-border">
        <div>
          <h2 className="text-xl font-light text-brand-text">Verify Extracted Denial Facts</h2>
          <p className="text-xs text-brand-text-muted mt-0.5">
            Every material fact must be reviewed and confirmed against the document before drafting your appeal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onConfirmAll}
            className="flex items-center gap-1.5 text-xs bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-3.5 py-2 rounded-lg transition-all"
          >
            <Check className="w-3.5 h-3.5 text-brand-gold" />
            <span>Confirm All Verified</span>
          </button>

          <button
            onClick={onProceed}
            disabled={!allConfirmed}
            className="flex items-center gap-2 text-xs font-medium bg-brand-gold text-brand-bg px-5 py-2 rounded-lg hover:bg-brand-gold/90 disabled:opacity-40 transition-all shadow-[0_0_15px_rgba(185,152,69,0.15)]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Proceed to Evidence ({facts.filter((f) => f.confirmed).length}/{facts.length} Confirmed)</span>
          </button>
        </div>
      </div>

      {/* Dual Pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANE: Document Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-brand-surface border border-brand-border rounded-xl p-5 flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-brand-border">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-brand-gold" />
              <span className="text-xs font-medium text-brand-text truncate max-w-[200px]">{documentName}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-brand-gold px-2 py-0.5 rounded bg-brand-surface-light border border-brand-gold/20">
              Source Text
            </span>
          </div>

          {/* Active Highlight Context */}
          {activeFact && (
            <div className="mb-3 p-3 rounded-lg bg-brand-surface-light border border-brand-gold/30 text-xs">
              <div className="text-[11px] text-brand-gold font-medium mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Targeting: {activeFact.label}
              </div>
              <p className="font-mono text-brand-text/90 italic bg-brand-bg p-2 rounded border border-brand-border/60">
                "{activeFact.sourceSpan}"
              </p>
              <div className="mt-1.5 flex justify-between text-[10px] text-brand-text-muted">
                <span>Location: Page {activeFact.sourcePage}</span>
                <span>Confidence: {Math.round(activeFact.confidence * 100)}%</span>
              </div>
            </div>
          )}

          {/* Document Content Scroll */}
          <div className="flex-1 overflow-y-auto font-mono text-xs text-brand-text-muted leading-relaxed bg-brand-bg/70 p-4 rounded-lg border border-brand-border whitespace-pre-wrap selection:bg-brand-gold selection:text-brand-bg">
            {documentText || 'No source document text loaded.'}
          </div>
        </div>

        {/* RIGHT PANE: Structured Extracted Facts (7 cols) */}
        <div className="lg:col-span-7 bg-brand-surface border border-brand-border rounded-xl p-5 flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-brand-border">
            <span className="text-xs font-medium text-brand-text">Extracted Case Facts ({facts.length})</span>
            <span className="text-xs text-brand-text-muted">Click row to locate in source</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {facts.map((fact) => {
              const isActive = fact.id === activeFactId;
              const isEditing = fact.id === editingFactId;

              return (
                <div
                  key={fact.id}
                  onClick={() => setActiveFactId(fact.id)}
                  className={clsx(
                    'p-4 rounded-xl border transition-all cursor-pointer text-left',
                    isActive ? 'border-brand-gold bg-brand-surface-light shadow-md' : 'border-brand-border bg-brand-bg/40 hover:border-brand-border/80',
                    fact.confirmed && !isActive && 'border-green-900/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-brand-text-muted">{fact.label}</span>
                        {fact.userEdited && (
                          <span className="text-[10px] text-brand-gold px-1.5 py-0.2 rounded bg-brand-surface border border-brand-gold/30">
                            User Edited
                          </span>
                        )}
                        <span className="text-[10px] text-brand-text-muted bg-brand-surface px-1.5 py-0.5 rounded border border-brand-border">
                          {Math.round(fact.confidence * 100)}% Match
                        </span>
                      </div>

                      {/* Fact Value or Edit Input */}
                      {isEditing ? (
                        <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 bg-brand-bg border border-brand-gold rounded-lg px-3 py-1.5 text-sm text-brand-text focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(fact)}
                            className="p-1.5 bg-brand-gold text-brand-bg rounded-lg hover:bg-brand-gold/90"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingFactId(null)}
                            className="p-1.5 bg-brand-surface border border-brand-border text-brand-text-muted rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-normal text-brand-text break-words mb-2">
                          {fact.value}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-brand-text-muted">
                        <span className="truncate max-w-[280px]">Source: {fact.sourceSpan}</span>
                        <span>• Page {fact.sourcePage}</span>
                      </div>

                    </div>

                    {/* Actions: Edit & Confirm */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(fact)}
                          title="Edit fact value"
                          className="p-2 rounded-lg border border-brand-border bg-brand-surface text-brand-text-muted hover:text-brand-text hover:border-brand-gold/40 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onConfirmFact(fact.id)}
                        title={fact.confirmed ? 'Fact confirmed' : 'Click to confirm'}
                        className={clsx(
                          'p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs',
                          fact.confirmed
                            ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-medium'
                            : 'bg-brand-surface border-brand-border text-brand-text-muted hover:border-brand-gold/40'
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{fact.confirmed ? 'Verified' : 'Confirm'}</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
