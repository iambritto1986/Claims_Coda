import React, { useState } from 'react';
import { X, Scale, ExternalLink, CheckCircle2, ShieldAlert, Download, Clock, ArrowRight, FileText, Check } from 'lucide-react';
import { CaseRecord } from '../types/claimcoda';
import jsPDF from 'jspdf';
import { useNotification } from './NotificationProvider';

interface ExternalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Partial<CaseRecord>;
}

export function ExternalReviewModal({ isOpen, onClose, caseData }: ExternalReviewModalProps) {
  const { notify } = useNotification();
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const insurerName = caseData.insurerName || 'Health Insurer';
  const claimNumber = caseData.claimNumber || 'CLM-ON-FILE';
  const serviceDate = caseData.serviceDate || 'Date of Service';
  const deniedAmount = caseData.deniedAmount || '$0.00';

  const handleDownloadExternalPacket = () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const margin = 50;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - margin * 2;

      // Header
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('FEDERAL HHS / STATE INDEPENDENT EXTERNAL REVIEW (LEVEL 2)', margin, 35);
      doc.text('PAGE 1 OF 2', pageWidth - margin, 35, { align: 'right' });

      doc.setDrawColor(185, 152, 69);
      doc.setLineWidth(1);
      doc.line(margin, 42, pageWidth - margin, 42);

      let y = 65;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('FORMAL REQUEST FOR INDEPENDENT EXTERNAL MEDICAL REVIEW', margin, y);
      y += 18;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Pursuant to 45 CFR § 147.136 (Affordable Care Act) and Applicable State External Review Standards', margin, y);
      y += 25;

      // Claim Details Box
      doc.setFillColor(248, 247, 244);
      doc.setDrawColor(200, 195, 180);
      doc.rect(margin, y, contentWidth, 60, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('ADVERSE DETERMINATION SUMMARY:', margin + 12, y + 16);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Insurer / Payer: ${insurerName}`, margin + 12, y + 32);
      doc.text(`Claim Number: ${claimNumber}`, margin + 250, y + 32);
      doc.text(`Date of Service: ${serviceDate}`, margin + 12, y + 46);
      doc.text(`Disputed Balance: ${deniedAmount}`, margin + 250, y + 46);

      y += 80;

      // Section 1: Demand for Independent Review
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 152, 69);
      doc.text('1. STATUTORY DEMAND FOR INDEPENDENT PHYSICIAN ADJUDICATION', margin, y);
      y += 14;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const s1 = `The claimant hereby formally exercises the statutory right to an Independent External Review conducted by an accredited Independent Review Organization (IRO). The adverse benefit determination issued by ${insurerName} involves medical necessity and clinical judgment. Under 45 CFR § 147.136, the claimant is entitled to an independent review at no cost to the member, and the IRO decision is legally binding on the plan.`;
      const splitS1 = doc.splitTextToSize(s1, contentWidth);
      doc.text(splitS1, margin, y);
      y += splitS1.length * 12 + 15;

      // Section 2: Clinical Controversy Summary
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 152, 69);
      doc.text('2. SUMMARY OF CLINICAL DISPUTE & MEDICAL NECESSITY', margin, y);
      y += 14;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const s2 = `The internal medical reviewer for ${insurerName} failed to evaluate the individualized clinical findings documented in the treating physician's Letter of Medical Necessity and encounter notes. The prescribed diagnostic and therapeutic care conformed with prevailing medical society guidelines and standard-of-care standards. We respectfully request that an independent board-certified specialist in the relevant clinical discipline examine the enclosed medical records and overturn this denial.`;
      const splitS2 = doc.splitTextToSize(s2, contentWidth);
      doc.text(splitS2, margin, y);
      y += splitS2.length * 12 + 15;

      // Section 3: Binding Authority
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 152, 69);
      doc.text('3. TIMELINES & ENCLOSURES', margin, y);
      y += 14;

      const s3 = `Standard external reviews must be decided within 45 calendar days of receipt. Expedited urgent reviews must be decided within 72 hours. Enclosed please find:\n• Complete Copy of Final Adverse Determination (Internal Appeal Denial)\n• Treating Physician Letter of Medical Necessity (LMN)\n• Clinical Chart Notes and Diagnostic Imaging Reports`;
      const splitS3 = doc.splitTextToSize(s3, contentWidth);
      doc.text(splitS3, margin, y);
      y += splitS3.length * 12 + 30;

      // Signature line
      doc.setDrawColor(150, 150, 150);
      doc.line(margin, y, margin + 200, y);
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.text('Claimant / Authorized Signatory', margin, y);

      doc.save(`ClaimCoda_Level2_External_Review_${claimNumber}.pdf`);
      notify('Level 2 Independent External Review packet downloaded.', 'success');
    } catch (e) {
      console.error(e);
      notify('Failed to generate external review packet.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-brand-surface border border-brand-gold/40 max-w-2xl w-full max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-surface-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center text-brand-gold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-light text-brand-text">Level 2 Independent External Review (IRO)</h3>
              <p className="text-xs text-brand-text-muted">Federal ACA 45 CFR § 147.136 & State Insurance Commissioner Rights</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-brand-text-muted hover:text-brand-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-brand-text leading-relaxed">
          
          {/* Key Callout Box */}
          <div className="p-5 bg-brand-bg rounded-2xl border border-brand-gold/30">
            <div className="flex items-center gap-2 text-brand-gold font-medium text-sm mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Why the Insurer Does Not Have the Final Say</span>
            </div>
            <p className="text-brand-text-muted leading-relaxed mb-3">
              If your health insurance company upholds their denial after an internal appeal, **federal law gives you the right to demand an Independent External Review**.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-3 border-t border-brand-border">
              <div className="flex items-start gap-2 text-brand-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
                <span><strong>100% Free:</strong> The insurer is required by law to pay all external review fees.</span>
              </div>
              <div className="flex items-start gap-2 text-brand-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
                <span><strong>Legally Binding:</strong> If the independent doctor overturns the denial, the insurer MUST pay.</span>
              </div>
              <div className="flex items-start gap-2 text-brand-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
                <span><strong>No Insurer Bias:</strong> Evaluated by an independent board-certified physician specialist.</span>
              </div>
              <div className="flex items-start gap-2 text-brand-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
                <span><strong>4-Month Window:</strong> You have 4 months (120 days) from the final internal denial.</span>
              </div>
            </div>
          </div>

          {/* How to File */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-brand-gold">How to Submit Your Level 2 Request</h4>
            
            <div className="space-y-2 text-brand-text-muted">
              <div className="p-3 bg-brand-surface-light rounded-xl border border-brand-border flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-surface border border-brand-gold text-brand-gold flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <div>
                  <strong className="text-brand-text font-normal block mb-0.5">Download the Pre-Compiled Dossier</strong>
                  Click below to generate the formal Level 2 Request Form with all statutory citations.
                </div>
              </div>

              <div className="p-3 bg-brand-surface-light rounded-xl border border-brand-border flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-surface border border-brand-gold text-brand-gold flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <div>
                  <strong className="text-brand-text font-normal block mb-0.5">Submit to HHS or Your State Portal</strong>
                  Upload to the <a href="https://www.cms.gov/marketplace/about/affordable-care-act/external-appeals" target="_blank" rel="noopener noreferrer" className="text-brand-gold underline inline-flex items-center gap-0.5">HHS-Administered External Review Portal <ExternalLink className="w-2.5 h-2.5" /></a> or submit via your State Insurance Commissioner's office.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-brand-border bg-brand-surface-light flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-brand-text-muted hover:text-brand-text px-4 py-2">
            Close
          </button>

          <button
            onClick={handleDownloadExternalPacket}
            disabled={downloading}
            className="flex items-center gap-2 bg-brand-gold text-brand-bg font-medium px-5 py-2.5 rounded-xl text-xs hover:bg-brand-gold/90 transition-all shadow-[0_0_15px_rgba(185,152,69,0.2)]"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Generating...' : 'Download Level 2 Request Packet (PDF)'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
