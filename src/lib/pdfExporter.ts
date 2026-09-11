import jsPDF from 'jspdf';
import { AppealDraft, CaseRecord, EvidenceItem } from '../types/claimcoda';

/**
 * Generate a complete, professional 3-part Appeal Packet PDF:
 * 1. Part 1: Formal Appeal Letter (dynamically paginated)
 * 2. Part 2: Evidence Index & Exhibit Table
 * 3. Part 3: Step-by-Step Submission Checklist & Certified Mail Tracking
 */
export function generateAppealPacketPDF(caseData: Partial<CaseRecord>, draft: AppealDraft): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const darkGold = [185, 152, 69]; // #B99845
  const charcoal = [30, 30, 30];
  const mutedGray = [100, 100, 100];
  const lightBg = [248, 247, 244];

  let currentPage = 1;

  // Helper for headers
  const addHeader = (sectionTitle: string) => {
    doc.setFontSize(8);
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`CLAIMCODA APPEAL WORKSPACE — ${sectionTitle}`, margin, 35);
    doc.text(`PAGE ${currentPage}`, pageWidth - margin, 35, { align: 'right' });

    doc.setDrawColor(220, 215, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, 42, pageWidth - margin, 42);
  };

  // Helper for footer
  const addFooter = (disclaimer: string = 'Administrative preparation workspace. Not formal legal representation.') => {
    doc.setDrawColor(220, 215, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);

    doc.setFontSize(7.5);
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    doc.setFont('helvetica', 'italic');
    doc.text(disclaimer, margin, pageHeight - 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 28, { align: 'right' });
  };

  // ==========================================
  // PART 1: FORMAL APPEAL LETTER
  // ==========================================
  addHeader('PART 1: FORMAL APPEAL LETTER');

  let y = 65;

  // Date & Transmission Type
  doc.setFontSize(9.5);
  doc.setTextColor(darkGold[0], darkGold[1], darkGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('VIA CERTIFIED MAIL / SECURE FAX / PAYER ONLINE PORTAL', margin, y);
  y += 16;

  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y);
  y += 20;

  // Insurer Block & Sender Block
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TO (INSURER / APPEALS DEPT):', margin, y);
  doc.text('FROM (CLAIMANT):', margin + 260, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  const payerLines = [
    draft.payerInfo.payerName || 'Health Insurance Appeals Dept',
    draft.payerInfo.address || 'Appeals & Grievance Division',
    `Fax: ${draft.payerInfo.fax || 'Referenced on Notice'}`,
  ];
  payerLines.forEach((line, i) => doc.text(line, margin, y + i * 12));

  const senderLines = [
    draft.senderInfo.fullName || 'Claimant / Insured Member',
    `Member ID: ${draft.senderInfo.memberId || 'On File'}`,
    `Group #: ${draft.senderInfo.groupNumber || 'On File'}`,
  ];
  senderLines.forEach((line, i) => doc.text(line, margin + 260, y + i * 12));

  y += 45;

  // Reference Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(darkGold[0], darkGold[1], darkGold[2]);
  doc.setLineWidth(1);
  doc.rect(margin, y, contentWidth, 54, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text('RE: FORMAL ADMINISTRATIVE APPEAL — ADVERSE BENEFIT DETERMINATION', margin + 12, y + 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Claim #: ${draft.claimSummary.claimNumber || 'On File'}`, margin + 12, y + 32);
  doc.text(`Date of Service: ${draft.claimSummary.serviceDate || 'On File'}`, margin + 180, y + 32);
  doc.text(`Total Billed: ${draft.claimSummary.billedAmount || '$0.00'}`, margin + 350, y + 32);

  doc.text(`Procedure: ${draft.claimSummary.procedureCodes || 'On File'}`, margin + 12, y + 45);
  doc.text(`Denied Balance: ${draft.claimSummary.deniedAmount || '$0.00'}`, margin + 350, y + 45);

  y += 72;

  // Dynamic Section Renderer with Automatic Page Breaks
  const renderSection = (num: string, title: string, text: string) => {
    if (!text) return;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGold[0], darkGold[1], darkGold[2]);

    const splitText = doc.splitTextToSize(text, contentWidth);
    const requiredHeight = splitText.length * 11 + 25;

    if (y + requiredHeight > pageHeight - 60) {
      addFooter();
      doc.addPage();
      currentPage++;
      addHeader('PART 1: FORMAL APPEAL LETTER (CONT.)');
      y = 65;
    }

    doc.text(`${num}. ${title.toUpperCase()}`, margin, y);
    y += 13;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text(splitText, margin, y);
    y += splitText.length * 11 + 12;
  };

  renderSection('1', 'Statement of Appeal', draft.sections.statementOfAppeal);
  renderSection('2', 'Factual Background & Encounter History', draft.sections.factualBackground);
  renderSection('3', 'Clinical & Legal Grounds for Reversal', draft.sections.clinicalAndLegalGrounds);
  renderSection('4', 'Summary of Attached Evidence', draft.sections.evidenceSummary);
  renderSection('5', 'Applicable Statutory & Regulatory Protections', draft.sections.regulatoryCitations);
  renderSection('6', 'Formal Demand for Remedy', draft.sections.formalRemediesAndDemand);

  // Check signature block fit
  if (y + 70 > pageHeight - 60) {
    addFooter();
    doc.addPage();
    currentPage++;
    addHeader('PART 1: FORMAL APPEAL LETTER (SIGNATURE)');
    y = 65;
  }

  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text('Respectfully submitted,', margin, y);
  y += 35;

  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 200, y);
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text(`${draft.senderInfo.fullName || 'Claimant / Authorized Signatory'}`, margin, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Signature of Insured / Authorized Representative', margin, y);

  addFooter();

  // ==========================================
  // PART 2: EVIDENCE INDEX & EXHIBIT TABLE
  // ==========================================
  doc.addPage();
  currentPage++;
  addHeader('PART 2: EVIDENCE EXHIBIT INDEX');
  y = 65;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGold[0], darkGold[1], darkGold[2]);
  doc.text('EXHIBIT INDEX & CLINICAL EVIDENCE TABLE', margin, y);
  y += 20;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text('The following documents are attached in direct substantiation of the clinical necessity and coverage criteria:', margin, y);
  y += 18;

  const evidenceItems = caseData.evidenceItems || [];
  const attachedItems = evidenceItems.filter((e) => e.attached);

  if (attachedItems.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.text('Exhibit 1: Complete Explanation of Benefits (EOB) / Denial Letter', margin + 10, y);
    y += 14;
    doc.text('Exhibit 2: Treating Physician Letter of Medical Necessity & Chart Records', margin + 10, y);
    y += 20;
  } else {
    attachedItems.forEach((item, index) => {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkGold[0], darkGold[1], darkGold[2]);
      doc.text(`Exhibit ${index + 1}: ${item.label}`, margin + 10, y);
      y += 11;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.text(`File: ${item.fileName || 'Enclosed'} | ${item.description}`, margin + 20, y);
      y += 16;
    });
  }

  addFooter();

  // ==========================================
  // PART 3: SUBMISSION CHECKLIST & TRACKING LOG
  // ==========================================
  doc.addPage();
  currentPage++;
  addHeader('PART 3: SUBMISSION CHECKLIST & TRACKING');
  y = 65;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGold[0], darkGold[1], darkGold[2]);
  doc.text('SUBMISSION INSTRUCTIONS & CERTIFIED MAIL LOG', margin, y);
  y += 20;

  const checklist = [
    'Sign and date the Formal Appeal Letter (Part 1) in blue or black ink.',
    'Collate all physical exhibit documents in sequential order behind the letter (Exhibit 1, Exhibit 2, etc.).',
    'Retain one complete photocopy or digital backup of the entire signed packet for your records.',
    `Transmit via USPS Certified Mail with Return Receipt Requested to: ${draft.payerInfo.address || 'the payer appeals department'}, or fax to ${draft.payerInfo.fax || 'the payer fax line'}.`,
    'Record the USPS tracking number or fax transmission confirmation receipt in the tracking box below.',
    'Standard statutory response window: 30 to 60 calendar days (72 hours for certified urgent care).',
  ];

  checklist.forEach((chk) => {
    doc.setDrawColor(darkGold[0], darkGold[1], darkGold[2]);
    doc.rect(margin + 10, y - 7, 8, 8);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    const split = doc.splitTextToSize(chk, contentWidth - 30);
    doc.text(split, margin + 24, y);
    y += split.length * 11 + 8;
  });

  y += 20;

  // Certified Mail Log Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(200, 195, 180);
  doc.rect(margin, y, contentWidth, 60, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGold[0], darkGold[1], darkGold[2]);
  doc.text('CERTIFIED MAIL & TRANSMISSION TRACKING RECORD:', margin + 12, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text('Date Sent: ___________________    Method: [  ] USPS Certified Mail   [  ] Payer Portal   [  ] Secure Fax', margin + 12, y + 32);
  doc.text('USPS Barcode / Fax Confirmation #: __________________________________________________', margin + 12, y + 46);

  addFooter();

  // Save the PDF
  const filename = `ClaimCoda_Appeal_Packet_${draft.claimSummary.claimNumber || 'Case'}.pdf`;
  doc.save(filename);
}
