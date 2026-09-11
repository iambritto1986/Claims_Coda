import React, { useState } from 'react';
import { EvidenceItem, DenialCategory } from '../types/claimcoda';
import { getStrategyForCategory } from '../lib/denialStrategies';
import { FileUp, CheckCircle2, Paperclip, Plus, Trash2, ArrowRight, ShieldCheck, FileCheck, Info } from 'lucide-react';
import clsx from 'clsx';
import { useNotification } from './NotificationProvider';

interface EvidenceManagerProps {
  category: DenialCategory;
  evidenceItems: EvidenceItem[];
  onUpdateEvidence: (items: EvidenceItem[]) => void;
  onProceed: () => void;
  onBack: () => void;
}

export function EvidenceManager({
  category,
  evidenceItems,
  onUpdateEvidence,
  onProceed,
  onBack,
}: EvidenceManagerProps) {
  const { notify } = useNotification();
  const strategy = getStrategyForCategory(category);
  const [newLabel, setNewLabel] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const handleSimulateAttach = (id: string) => {
    const updated = evidenceItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          attached: true,
          fileName: item.fileName || `${item.label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.pdf`,
          uploadedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    onUpdateEvidence(updated);
    notify('Evidence document attached to case packet.', 'success');
  };

  const handleDetach = (id: string) => {
    const updated = evidenceItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          attached: false,
          fileName: undefined,
          uploadedAt: undefined,
        };
      }
      return item;
    });
    onUpdateEvidence(updated);
    notify('Evidence document removed.', 'info');
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newItem: EvidenceItem = {
      id: `ev-custom-${Date.now()}`,
      label: newLabel.trim(),
      description: 'Custom supporting evidence item added by claimant.',
      category,
      required: false,
      attached: true,
      fileName: `${newLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.pdf`,
      uploadedAt: new Date().toISOString(),
    };

    onUpdateEvidence([...evidenceItems, newItem]);
    setNewLabel('');
    setShowAddCustom(false);
    notify('Custom evidence item attached.', 'success');
  };

  const attachedCount = evidenceItems.filter((e) => e.attached).length;
  const requiredAttached = evidenceItems.filter((e) => e.required && e.attached).length;
  const totalRequired = evidenceItems.filter((e) => e.required).length;

  return (
    <div className="space-y-6">
      
      {/* Strategy header card */}
      <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-surface-light border border-brand-gold/40 text-brand-gold font-medium">
                {strategy.badgeLabel}
              </span>
              <span className="text-xs text-brand-text-muted">Evidence Strategy</span>
            </div>
            <h2 className="text-xl font-light text-brand-text">{strategy.title}</h2>
          </div>

          <div className="text-right">
            <div className="text-xs text-brand-text-muted mb-1">Attached Exhibits</div>
            <div className="text-lg font-light text-brand-gold">
              {attachedCount} of {evidenceItems.length} items
            </div>
          </div>
        </div>

        <p className="text-sm text-brand-text-muted leading-relaxed mb-4">
          {strategy.summary}
        </p>

        <div className="bg-brand-bg/70 p-3.5 rounded-xl border border-brand-border/80 flex items-start gap-2.5 text-xs text-brand-text-muted">
          <Info className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
          <span>
            <strong className="text-brand-text font-medium">Why Evidence Matters:</strong> Appeals with a signed treating physician Letter of Medical Necessity or specific clinical notes have a significantly higher reversal rate on both internal and external review.
          </span>
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-brand-text">Recommended Evidence Checklist</span>
          <button
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="text-xs text-brand-gold hover:text-brand-text flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Document</span>
          </button>
        </div>

        {showAddCustom && (
          <form onSubmit={handleAddCustom} className="p-4 bg-brand-surface border border-brand-gold/40 rounded-xl flex items-center gap-3 animate-in fade-in duration-150">
            <input
              type="text"
              placeholder="e.g. Lab Pathology Report (Oct 10, 2025)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold"
              autoFocus
            />
            <button
              type="submit"
              className="bg-brand-gold text-brand-bg text-xs font-medium px-4 py-2 rounded-lg hover:bg-brand-gold/90"
            >
              Attach
            </button>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="text-xs text-brand-text-muted hover:text-brand-text px-2"
            >
              Cancel
            </button>
          </form>
        )}

        {evidenceItems.map((item) => (
          <div
            key={item.id}
            className={clsx(
              'p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4',
              item.attached
                ? 'bg-brand-surface-light border-brand-gold/50 shadow-sm'
                : 'bg-brand-surface border-brand-border opacity-90 hover:border-brand-border/80'
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-brand-text">{item.label}</span>
                {item.required ? (
                  <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                    High Impact / Required
                  </span>
                ) : (
                  <span className="text-[10px] text-brand-text-muted bg-brand-bg px-2 py-0.5 rounded border border-brand-border">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed mb-2">
                {item.description}
              </p>

              {item.attached && (
                <div className="flex items-center gap-2 text-xs text-brand-gold font-mono">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{item.fileName}</span>
                  <span className="text-brand-text-muted text-[10px]">• Ready for exhibit index</span>
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {item.attached ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-brand-gold font-medium bg-brand-gold/10 px-3 py-1.5 rounded-lg border border-brand-gold/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attached</span>
                  </span>
                  <button
                    onClick={() => handleDetach(item.id)}
                    className="p-1.5 rounded-lg border border-brand-border bg-brand-bg text-brand-text-muted hover:text-red-400 hover:border-red-900/50 transition-colors"
                    title="Remove exhibit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleSimulateAttach(item.id)}
                  className="flex items-center gap-2 text-xs bg-brand-surface-light border border-brand-border hover:border-brand-gold/50 text-brand-text px-4 py-2 rounded-lg transition-all"
                >
                  <Paperclip className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Attach Document</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-brand-border">
        <button
          onClick={onBack}
          className="text-xs text-brand-text-muted hover:text-brand-text px-4 py-2 transition-colors"
        >
          ← Back to Verified Facts
        </button>

        <button
          onClick={onProceed}
          className="flex items-center gap-2 text-xs font-medium bg-brand-gold text-brand-bg px-6 py-2.5 rounded-xl hover:bg-brand-gold/90 transition-all shadow-[0_0_20px_rgba(185,152,69,0.15)]"
        >
          <span>Generate Grounded Appeal Draft</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
