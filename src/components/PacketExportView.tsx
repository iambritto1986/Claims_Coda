import React, { useEffect } from 'react';
import { AppealDraft, CaseRecord } from '../types/claimcoda';
import { generateAppealPacketPDF } from '../lib/pdfExporter';
import { Download, CheckCircle2, ShieldCheck, Mail, Printer, Clock, FileText, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNotification } from './NotificationProvider';

interface PacketExportViewProps {
  caseData: Partial<CaseRecord>;
  draft: AppealDraft;
  onBackToEdit: () => void;
  onDashboard: () => void;
}

export function PacketExportView({ caseData, draft, onBackToEdit, onDashboard }: PacketExportViewProps) {
  const { notify } = useNotification();

  useEffect(() => {
    // Delight confetti when landing on finished packet
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#B99845', '#F3EFE6', '#8A7233'],
      });
    } catch (e) {
      // Ignore in non-browser env
    }
  }, []);

  const handleDownloadPDF = () => {
    try {
      generateAppealPacketPDF(caseData, draft);
      notify('Appeal Packet PDF downloaded successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      notify('Failed to generate PDF packet. Please try again.', 'error');
    }
  };

  const attachedCount = caseData.evidenceItems?.filter((e) => e.attached).length || 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Hero Success Box */}
      <div className="text-center py-8 bg-brand-surface border border-brand-gold/40 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-brand-gold/15 border border-brand-gold flex items-center justify-center mx-auto mb-4 text-brand-gold">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="text-3xl font-light text-brand-text mb-2">Appeal Packet Finalized & Ready</h2>
        <p className="text-sm text-brand-text-muted max-w-lg mx-auto mb-6">
          Your complete 3-part evidence-backed appeal packet has been compiled. You can now download the PDF to sign and submit.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2.5 bg-brand-gold text-brand-bg font-medium px-8 py-3.5 rounded-xl hover:bg-brand-gold/90 transition-all shadow-[0_0_25px_rgba(185,152,69,0.25)] text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Official Appeal Packet (PDF)</span>
          </button>

          <button
            onClick={onBackToEdit}
            className="flex items-center gap-2 bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-5 py-3.5 rounded-xl text-sm transition-all"
          >
            <span>Edit Letter</span>
          </button>
        </div>
      </div>

      {/* 3-Part Packet Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-brand-surface border border-brand-border p-5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold mb-3">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-brand-text mb-1">Part 1: Formal Appeal Letter</h3>
          <p className="text-xs text-brand-text-muted leading-relaxed">
            Standard 2-page administrative appeal letter with factual history, clinical rebuttals, and statutory citations.
          </p>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-brand-text mb-1">Part 2: Evidence Index</h3>
          <p className="text-xs text-brand-text-muted leading-relaxed">
            Numbered exhibit table indexing all {attachedCount} attached medical records, LMNs, and supporting files.
          </p>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold mb-3">
            <Mail className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-brand-text mb-1">Part 3: Filing & Tracking Guide</h3>
          <p className="text-xs text-brand-text-muted leading-relaxed">
            Certified mail instructions, return receipt checklist, and certified mail barcode tracking log.
          </p>
        </div>

      </div>

      {/* Submission Instructions Box */}
      <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl">
        <h3 className="text-base font-medium text-brand-text mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-gold" />
          <span>Filing Steps & Timelines</span>
        </h3>

        <div className="space-y-3 text-xs text-brand-text-muted leading-relaxed">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-surface-light border border-brand-border">
            <span className="w-5 h-5 rounded-full bg-brand-surface border border-brand-gold text-brand-gold flex items-center justify-center shrink-0 text-[11px] font-bold">1</span>
            <div>
              <strong className="text-brand-text font-medium block mb-0.5">Print and Sign Page 2</strong>
              Sign the signature block on Page 2 in blue or black ink. If filing on behalf of a family member, attach an Authorized Representative Form.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-surface-light border border-brand-border">
            <span className="w-5 h-5 rounded-full bg-brand-surface border border-brand-gold text-brand-gold flex items-center justify-center shrink-0 text-[11px] font-bold">2</span>
            <div>
              <strong className="text-brand-text font-medium block mb-0.5">Transmit to Insurer</strong>
              Mail via USPS Certified Mail with Return Receipt to <span className="font-mono text-brand-text">{draft.payerInfo.address || 'the appeals department'}</span>, or fax to <span className="font-mono text-brand-text">{draft.payerInfo.fax || 'the payer fax'}</span>.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-surface-light border border-brand-border">
            <span className="w-5 h-5 rounded-full bg-brand-surface border border-brand-gold text-brand-gold flex items-center justify-center shrink-0 text-[11px] font-bold">3</span>
            <div>
              <strong className="text-brand-text font-medium block mb-0.5">Statutory Response Window</strong>
              Under federal ERISA / ACA rules, health plans must decide standard non-urgent appeals within 30 to 60 days. If your appeal is upheld, you are entitled to free Independent External Review.
            </div>
          </div>
        </div>
      </div>

      {/* Return to Dashboard */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={onBackToEdit}
          className="text-xs text-brand-text-muted hover:text-brand-text transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Letter Editor</span>
        </button>

        <button
          onClick={onDashboard}
          className="bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text text-xs px-5 py-2.5 rounded-xl transition-all"
        >
          <span>Return to Claims Dashboard</span>
        </button>
      </div>

    </div>
  );
}
