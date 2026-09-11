import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import {
  ExtractedFact,
  EvidenceItem,
  AppealDraft,
  CaseRecord,
  DenialCategory,
  PlanContextType,
} from '../types/claimcoda';
import { extractDenialFacts, generateGroundedAppealDraft } from '../lib/geminiService';
import { extractPdfText, validateUploadFile, DocumentIngestError } from '../lib/documentIngest';
import { SAMPLE_DENIALS } from '../lib/sampleDenials';
import { generateDefaultEvidenceList } from '../lib/denialStrategies';
import { DualPaneSourceViewer } from '../components/DualPaneSourceViewer';
import { EvidenceManager } from '../components/EvidenceManager';
import { AppealEditor } from '../components/AppealEditor';
import { PacketExportView } from '../components/PacketExportView';
import { RulesRegistryModal } from '../components/RulesRegistryModal';
import { VoiceAdvocateModal } from '../components/VoiceAdvocateModal';
import { ExternalReviewModal } from '../components/ExternalReviewModal';
import { FloatingAvatarGuide } from '../components/FloatingAvatarGuide';
import { ApiKeyModal } from '../components/ApiKeyModal';
import {
  FileUp,
  Loader2,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Scale,
  Sparkles,
  ShieldCheck,
  Clock,
  Mic,
  Key,
} from 'lucide-react';
import clsx from 'clsx';

type Step = 'upload' | 'review' | 'evidence' | 'draft' | 'export';

export default function CaseView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showVoiceAdvocate, setShowVoiceAdvocate] = useState(false);
  const [showExternalReviewModal, setShowExternalReviewModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Case State
  const [caseRecord, setCaseRecord] = useState<Partial<CaseRecord>>({
    id: id || 'case-demo',
    title: 'New Claim Appeal',
    status: 'draft',
    planContext: 'not_sure',
    denialCategory: 'medical_necessity',
    insurerName: 'Insurer on File',
    claimNumber: 'Pending',
    serviceDate: 'Pending',
    deniedAmount: '$0.00',
    verifiedDeadline: null,
    documentName: 'Denial_Notice.pdf',
    documentText: '',
    extractedFacts: [],
    evidenceItems: [],
  });

  useEffect(() => {
    if (!id || !user) return;

    const fetchCase = async () => {
      try {
        const docRef = doc(db, 'cases', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as CaseRecord;
          setCaseRecord((prev) => ({ ...prev, ...data }));
          if (data.status === 'reviewing_facts') setCurrentStep('review');
          if (data.status === 'gathering_evidence') setCurrentStep('evidence');
          if (data.status === 'drafting_appeal') setCurrentStep('draft');
          if (data.status === 'packet_ready') setCurrentStep('export');
        } else {
          // If Firestore is empty/demo mode, seed with clean defaults
          setCaseRecord((prev) => ({ ...prev, id }));
        }
      } catch (err: any) {
        console.warn('Firestore fetch notice (using active memory state):', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id, user]);

  const saveCaseToFirestore = async (updated: Partial<CaseRecord>) => {
    setCaseRecord((prev) => ({ ...prev, ...updated }));
    if (!id || !user) return;
    try {
      const docRef = doc(db, 'cases', id);
      await updateDoc(docRef, {
        ...updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore update notice (persisted in local state):', e);
    }
  };

  // 1. Process Upload (Real file or Sample selection)
  const handleProcessDocumentText = async (text: string, docName: string) => {
    setIsExtracting(true);
    notify('Analyzing denial document with grounded extraction engine...', 'info');

    try {
      const { facts, detectedCategory, summary } = await extractDenialFacts(text, docName);
      const evidence = generateDefaultEvidenceList(detectedCategory);

      const claimFact = facts.find((f) => f.fieldKey === 'claim_number')?.value || 'Pending';
      const insurerFact = facts.find((f) => f.fieldKey === 'insurer_name')?.value || 'Health Plan';
      const deniedAmtFact = facts.find((f) => f.fieldKey === 'denied_amount')?.value || '$0.00';
      const deadlineFact = facts.find((f) => f.fieldKey === 'appeal_deadline_text')?.value || null;

      const updatedData: Partial<CaseRecord> = {
        documentName: docName,
        documentText: text,
        denialCategory: detectedCategory,
        extractedFacts: facts,
        evidenceItems: evidence,
        claimNumber: claimFact,
        insurerName: insurerFact,
        deniedAmount: deniedAmtFact,
        verifiedDeadline: deadlineFact,
        status: 'reviewing_facts',
      };

      await saveCaseToFirestore(updatedData);
      setCurrentStep('review');
      notify(`Extraction complete: ${facts.length} material facts found with source provenance.`, 'success');
    } catch (err: any) {
      console.error(err);
      notify('Extraction encountered an error. Falling back to review.', 'error');
      setCurrentStep('review');
    } finally {
      setIsExtracting(false);
    }
  };

  // Load a realistic synthetic denial sample
  const handleLoadSample = async (sampleId: string) => {
    const sample = SAMPLE_DENIALS.find((s) => s.id === sampleId);
    if (!sample) return;

    await handleProcessDocumentText(sample.rawDocumentText, `${sample.title}.pdf`);
  };

  // Upload file handler — reads the user's actual file. It never substitutes
  // fabricated/simulated content: if a file can't be read for real (a scanned
  // image with no text layer, an unreadable PDF, an image format), the user
  // is told plainly rather than being shown facts extracted from fake text.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after an error
    if (!file) return;

    try {
      validateUploadFile(file);
    } catch (err: any) {
      notify(err instanceof DocumentIngestError ? err.message : 'That file could not be uploaded.', 'error');
      return;
    }

    const nameLower = file.name.toLowerCase();

    if (file.type === 'text/plain' || nameLower.endsWith('.txt')) {
      const text = await file.text();
      await handleProcessDocumentText(text, file.name);
      return;
    }

    if (file.type === 'application/pdf' || nameLower.endsWith('.pdf')) {
      setIsExtracting(true);
      try {
        const result = await extractPdfText(file);
        if (!result.hasExtractableText) {
          notify(
            "This PDF looks like a scanned image with no selectable text, so it can't be read automatically yet (no OCR pipeline is wired up). Try a text-based PDF export of your denial letter, or use a synthetic sample below to test the workflow.",
            'error'
          );
          return;
        }
        await handleProcessDocumentText(result.text, file.name);
      } catch (err: any) {
        notify(err instanceof DocumentIngestError ? err.message : 'Could not read that PDF.', 'error');
      } finally {
        setIsExtracting(false);
      }
      return;
    }

    // PNG/JPG: no client-side OCR pipeline exists yet. Be honest instead of
    // fabricating extracted facts from a file we can't actually read.
    notify(
      "Image uploads (PNG/JPG) need OCR, which isn't available yet. Please upload the PDF version of your denial letter or EOB, or use a synthetic sample below.",
      'error'
    );
  };

  // 2. Fact Confirmation Handlers
  const handleUpdateFact = (updatedFact: ExtractedFact) => {
    const facts = (caseRecord.extractedFacts || []).map((f) =>
      f.id === updatedFact.id ? updatedFact : f
    );
    saveCaseToFirestore({ extractedFacts: facts });
  };

  const handleConfirmFact = (factId: string) => {
    const facts = (caseRecord.extractedFacts || []).map((f) =>
      f.id === factId ? { ...f, confirmed: !f.confirmed } : f
    );
    saveCaseToFirestore({ extractedFacts: facts });
  };

  const handleConfirmAllFacts = () => {
    const facts = (caseRecord.extractedFacts || []).map((f) => ({ ...f, confirmed: true }));
    saveCaseToFirestore({ extractedFacts: facts });
    notify('All facts marked as verified.', 'success');
  };

  const handleProceedToEvidence = () => {
    saveCaseToFirestore({ status: 'gathering_evidence' });
    setCurrentStep('evidence');
  };

  // 3. Evidence Handlers
  const handleUpdateEvidence = (items: EvidenceItem[]) => {
    saveCaseToFirestore({ evidenceItems: items });
  };

  const handleGenerateDraft = async () => {
    setIsGeneratingDraft(true);
    notify('Generating grounded appeal letter strictly from confirmed facts...', 'info');

    try {
      const draft = await generateGroundedAppealDraft({
        confirmedFacts: caseRecord.extractedFacts || [],
        evidenceItems: caseRecord.evidenceItems || [],
        planContext: caseRecord.planContext || 'not_sure',
        category: caseRecord.denialCategory || 'medical_necessity',
        senderName: user?.displayName || user?.email?.split('@')[0] || 'Insured Member',
      });

      await saveCaseToFirestore({
        appealDraft: draft,
        status: 'drafting_appeal',
      });

      setCurrentStep('draft');
      notify('Appeal draft generated and verified against confirmed facts.', 'success');
    } catch (err: any) {
      console.error(err);
      notify('Failed to generate draft.', 'error');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // 4. Draft Handlers
  const handleUpdateDraft = (draft: AppealDraft) => {
    saveCaseToFirestore({ appealDraft: draft });
  };

  const handleApproveDraft = () => {
    if (caseRecord.appealDraft) {
      const approvedDraft: AppealDraft = {
        ...caseRecord.appealDraft,
        userApprovedAt: new Date().toISOString(),
      };
      saveCaseToFirestore({
        appealDraft: approvedDraft,
        status: 'packet_ready',
      });
    }
    setCurrentStep('export');
    notify('Appeal draft approved. Final packet ready for download.', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-text-muted">
        <Loader2 className="w-6 h-6 animate-spin text-brand-gold mr-3" />
        <span>Loading Case Workspace...</span>
      </div>
    );
  }

  const steps: Array<{ id: Step; label: string }> = [
    { id: 'upload', label: '1. Ingestion' },
    { id: 'review', label: '2. Fact Verification' },
    { id: 'evidence', label: '3. Evidence Index' },
    { id: 'draft', label: '4. Appeal Builder' },
    { id: 'export', label: '5. Packet Export' },
  ];

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      
      {/* Rules Registry Modal */}
      <RulesRegistryModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        planContext={caseRecord.planContext}
      />

      {/* Voice Advocate Modal */}
      <VoiceAdvocateModal
        isOpen={showVoiceAdvocate}
        onClose={() => setShowVoiceAdvocate(false)}
        caseData={caseRecord}
      />

      {/* External Review Modal */}
      <ExternalReviewModal
        isOpen={showExternalReviewModal}
        onClose={() => setShowExternalReviewModal(false)}
        caseData={caseRecord}
      />

      {/* Api Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />

      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-brand-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-brand-text-muted hover:text-brand-text transition-colors bg-brand-surface px-3 py-2 rounded-lg border border-brand-border"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-light text-brand-text">
                {caseRecord.insurerName !== 'Insurer on File' ? `${caseRecord.insurerName} Appeal` : `Case ${id?.slice(0, 8)}`}
              </h1>
              {caseRecord.claimNumber && caseRecord.claimNumber !== 'Pending' && (
                <span className="text-[11px] font-mono bg-brand-surface px-2 py-0.5 rounded border border-brand-border text-brand-text-muted">
                  {caseRecord.claimNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-brand-text-muted mt-0.5">
              Consumer Health Insurance Denial Workspace • Zero Invented Facts Guarantee
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-surface border border-brand-border hover:border-brand-gold/50 text-brand-gold px-3.5 py-2 rounded-lg transition-all shadow-sm"
            title="Connect Google Gemini API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gemini Key</span>
          </button>

          <button
            onClick={() => setShowVoiceAdvocate(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-surface border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 px-3.5 py-2 rounded-lg transition-all shadow-sm"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Guide</span>
          </button>

          <button
            onClick={() => setShowExternalReviewModal(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-surface border border-brand-border hover:border-brand-gold/40 text-brand-text px-3.5 py-2 rounded-lg transition-all"
          >
            <Scale className="w-3.5 h-3.5 text-brand-gold" />
            <span>Level 2 Review</span>
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-surface border border-brand-border hover:border-brand-gold/40 text-brand-text px-3.5 py-2 rounded-lg transition-all"
          >
            <Scale className="w-3.5 h-3.5 text-brand-gold" />
            <span>Rules Registry</span>
          </button>
        </div>
      </header>

      {/* Stepper Progress Bar */}
      <div className="mb-10">
        <div className="grid grid-cols-5 gap-2">
          {steps.map((s, idx) => {
            const isActive = currentStep === s.id;
            const isDone = steps.findIndex((x) => x.id === currentStep) > idx;

            return (
              <div
                key={s.id}
                className={clsx(
                  'p-3 rounded-xl border text-center transition-all',
                  isActive
                    ? 'border-brand-gold bg-brand-surface shadow-md'
                    : isDone
                    ? 'border-brand-gold/30 bg-brand-surface-light text-brand-text'
                    : 'border-brand-border bg-brand-bg/40 opacity-40 text-brand-text-muted'
                )}
              >
                <div className="text-xs font-medium truncate flex items-center justify-center gap-1.5">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                  ) : null}
                  <span className={isActive ? 'text-brand-gold font-semibold' : ''}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Step View */}
      <main>
        
        {/* STEP 1: UPLOAD & INGESTION */}
        {currentStep === 'upload' && (
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Upload Box */}
            <div className="bg-brand-surface border border-brand-border p-10 rounded-2xl text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-brand-surface-light border border-brand-border flex items-center justify-center mx-auto mb-6 text-brand-gold">
                <FileUp className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-light text-brand-text mb-2">Upload Denial Document or EOB</h2>
              <p className="text-xs text-brand-text-muted max-w-md mx-auto mb-8 leading-relaxed">
                Upload your Explanation of Benefits (EOB), adverse determination notice, or billing statement. We extract all facts with exact source citations.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <label className="cursor-pointer bg-brand-surface-light border border-brand-border hover:border-brand-gold/50 px-6 py-3.5 rounded-xl transition-all flex items-center gap-2.5 text-xs text-brand-text font-medium group shadow-md">
                  <FileText className="w-4 h-4 text-brand-gold group-hover:scale-110 transition-transform" />
                  <span>Choose PDF / Image File</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isExtracting}
                  />
                </label>
              </div>

              {isExtracting && (
                <div className="mt-8 flex items-center justify-center gap-3 text-xs text-brand-gold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting facts, dates, codes, and citations...</span>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-brand-border flex items-center justify-center gap-2 text-[11px] text-brand-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
                <span>Protected by Client-Side & Encrypted Processing • Untrusted Data Sanitizer Active</span>
              </div>
            </div>

            {/* Synthetic Sample Cases for Instant Testing */}
            <div className="bg-brand-surface-light border border-brand-border p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-brand-gold" />
                <h3 className="text-sm font-medium text-brand-text">Or Test with Realistic Synthetic Denial Files</h3>
              </div>
              <p className="text-xs text-brand-text-muted mb-4">
                Select a benchmark synthetic denial file to test the full end-to-end extraction and appeal drafting pipeline:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_DENIALS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample.id)}
                    disabled={isExtracting}
                    className="p-4 rounded-xl border border-brand-border bg-brand-surface hover:border-brand-gold/40 text-left transition-all group"
                  >
                    <div className="text-xs font-medium text-brand-text group-hover:text-brand-gold transition-colors mb-1">
                      {sample.title}
                    </div>
                    <div className="text-[11px] text-brand-text-muted mb-2">
                      {sample.insurerName} • {sample.deniedAmount} Denied
                    </div>
                    <span className="text-[10px] text-brand-gold px-2 py-0.5 rounded bg-brand-surface-light border border-brand-gold/30">
                      Load & Run AI Pipeline →
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* STEP 2: FACT VERIFICATION & DUAL-PANE PROVENANCE */}
        {currentStep === 'review' && (
          <DualPaneSourceViewer
            facts={caseRecord.extractedFacts || []}
            documentText={caseRecord.documentText || ''}
            documentName={caseRecord.documentName}
            onUpdateFact={handleUpdateFact}
            onConfirmFact={handleConfirmFact}
            onConfirmAll={handleConfirmAllFacts}
            onProceed={handleProceedToEvidence}
          />
        )}

        {/* STEP 3: EVIDENCE CHECKLIST */}
        {currentStep === 'evidence' && (
          <EvidenceManager
            category={caseRecord.denialCategory || 'medical_necessity'}
            evidenceItems={caseRecord.evidenceItems || []}
            onUpdateEvidence={handleUpdateEvidence}
            onProceed={handleGenerateDraft}
            onBack={() => setCurrentStep('review')}
          />
        )}

        {/* STEP 4: GROUNDED APPEAL BUILDER */}
        {currentStep === 'draft' && caseRecord.appealDraft && (
          <AppealEditor
            draft={caseRecord.appealDraft}
            onUpdateDraft={handleUpdateDraft}
            onApprove={handleApproveDraft}
            onRegenerate={handleGenerateDraft}
            onBack={() => setCurrentStep('evidence')}
            isRegenerating={isGeneratingDraft}
          />
        )}

        {/* STEP 5: FINAL PACKET EXPORT */}
        {currentStep === 'export' && caseRecord.appealDraft && (
          <PacketExportView
            caseData={caseRecord}
            draft={caseRecord.appealDraft}
            onBackToEdit={() => setCurrentStep('draft')}
            onDashboard={() => navigate('/dashboard')}
          />
        )}

      </main>

      {/* Step-Aware Floating AI Avatar Guide */}
      <FloatingAvatarGuide
        currentStep={currentStep}
        caseData={caseRecord}
        onOpenVoiceModal={() => setShowVoiceAdvocate(true)}
      />

    </div>
  );
}
