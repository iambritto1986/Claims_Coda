import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Clock,
  ChevronRight,
  ShieldAlert,
  Trash2,
  Sparkles,
  Scale,
  LogOut,
  FolderOpen,
  Building2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Search,
  ExternalLink,
  Phone,
  Send,
  HelpCircle,
  Key,
} from 'lucide-react';
import { useNotification } from '../components/NotificationProvider';
import { PlanContextType, DenialCategory, CaseRecord, CaseStatus } from '../types/claimcoda';
import { RulesRegistryModal } from '../components/RulesRegistryModal';
import { ConsentOnboardingModal } from '../components/ConsentOnboardingModal';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { SAMPLE_DENIALS } from '../lib/sampleDenials';
import clsx from 'clsx';

// Major Payer Contact Directory
const PAYER_DIRECTORY = [
  {
    name: 'Aetna Health Care Management',
    appealsDept: 'Appeals and Grievance Department',
    address: 'PO Box 14079, Lexington, KY 40512',
    fax: '(860) 907-3100',
    phone: '1-800-872-3862',
    portal: 'https://www.aetna.com',
  },
  {
    name: 'UnitedHealthcare Commercial',
    appealsDept: 'Appeals Unit',
    address: 'PO Box 30432, Salt Lake City, UT 84130',
    fax: '(844) 236-4100',
    phone: '1-866-414-1959',
    portal: 'https://www.myuhc.com',
  },
  {
    name: 'Cigna Healthcare',
    appealsDept: 'National Appeals Organization',
    address: 'PO Box 188011, Chattanooga, TN 37422',
    fax: '(877) 815-4827',
    phone: '1-800-244-6224',
    portal: 'https://my.cigna.com',
  },
  {
    name: 'Blue Cross Blue Shield (Standard)',
    appealsDept: 'Grievance and Appeals Division',
    address: 'PO Box 105568, Atlanta, GA 30348',
    fax: '(888) 859-3046',
    phone: '1-800-262-2583',
    portal: 'https://www.bcbs.com',
  },
  {
    name: 'Kaiser Permanente',
    appealsDept: 'Member Appeals and Grievances',
    address: 'PO Box 12983, Oakland, CA 94604',
    fax: '(888) 988-2626',
    phone: '1-800-464-4000',
    portal: 'https://healthy.kaiserpermanente.org',
  },
];

export default function Dashboard() {
  const { user, isGuest, logout } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'reviewing' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showPayerDirectory, setShowPayerDirectory] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // New Case Form
  const [newPlanContext, setNewPlanContext] = useState<PlanContextType>('not_sure');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newInsurer, setNewInsurer] = useState('');

  // Outcome Logging Modal
  const [outcomeModalCase, setOutcomeModalCase] = useState<CaseRecord | null>(null);

  const LOCAL_CASES_KEY = `claimcoda_cases_${user?.uid || 'guest'}`;

  const fetchCases = async () => {
    if (!user) return;
    try {
      // If guest or offline, check local storage
      const localData = localStorage.getItem(LOCAL_CASES_KEY);
      if (localData) {
        setCases(JSON.parse(localData));
      }

      if (!isGuest) {
        const q = query(collection(db, 'cases'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CaseRecord[];
        if (list.length > 0) {
          setCases(list);
          localStorage.setItem(LOCAL_CASES_KEY, JSON.stringify(list));
        }
      }
    } catch (err: any) {
      console.warn('Firestore fetch notice (using local storage):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user]);

  const persistCases = (updatedList: CaseRecord[]) => {
    setCases(updatedList);
    localStorage.setItem(LOCAL_CASES_KEY, JSON.stringify(updatedList));
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const title = newCaseTitle.trim() || (newInsurer ? `${newInsurer} Claim Appeal` : 'New Denial Case');
    const newCaseData: CaseRecord = {
      id: `case-${Date.now()}`,
      ownerId: user.uid,
      title,
      status: 'draft',
      planContext: newPlanContext,
      denialCategory: 'medical_necessity' as DenialCategory,
      insurerName: newInsurer.trim() || 'Health Insurer',
      claimNumber: 'Pending Ingestion',
      serviceDate: 'Pending Ingestion',
      deniedAmount: '$0.00',
      verifiedDeadline: null,
      extractedFacts: [],
      evidenceItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (!isGuest) {
        const docRef = await addDoc(collection(db, 'cases'), newCaseData);
        newCaseData.id = docRef.id;
      }
    } catch (e) {
      // Local fallback
    }

    persistCases([newCaseData, ...cases]);
    notify('New case file created.', 'success');
    setShowCreateModal(false);
    navigate(`/case/${newCaseData.id}`);
  };

  const handleCreateFromSample = async (sampleId: string) => {
    if (!user) return;
    const sample = SAMPLE_DENIALS.find((s) => s.id === sampleId);
    if (!sample) return;

    const newCaseData: CaseRecord = {
      id: `case-sample-${Date.now()}`,
      ownerId: user.uid,
      title: sample.title,
      status: 'draft',
      planContext: 'employer_erisa' as PlanContextType,
      denialCategory: sample.category,
      insurerName: sample.insurerName,
      claimNumber: sample.claimNumber,
      serviceDate: sample.serviceDate,
      deniedAmount: sample.deniedAmount,
      verifiedDeadline: sample.deadlineText,
      extractedFacts: [],
      evidenceItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (!isGuest) {
        const docRef = await addDoc(collection(db, 'cases'), newCaseData);
        newCaseData.id = docRef.id;
      }
    } catch (e) {
      // local fallback
    }

    persistCases([newCaseData, ...cases]);
    notify(`Initialized test case: ${sample.title}`, 'success');
    navigate(`/case/${newCaseData.id}`);
  };

  const handleDeleteCase = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this case and all associated files?')) {
      return;
    }

    try {
      if (!isGuest) {
        await deleteDoc(doc(db, 'cases', caseId));
      }
    } catch (e) {
      // local
    }

    const updated = cases.filter((c) => c.id !== caseId);
    persistCases(updated);
    notify('Case permanently deleted from records.', 'info');
  };

  const handleUpdateOutcome = async (caseId: string, newStatus: CaseStatus) => {
    const updated = cases.map((c) => (c.id === caseId ? { ...c, status: newStatus } : c));
    persistCases(updated);
    setOutcomeModalCase(null);

    if (newStatus === 'reversed') {
      notify('🎉 Congratulations! Claim marked as Reversed / Won.', 'success');
    } else if (newStatus === 'upheld') {
      notify('Denial upheld. You are now eligible to file Level 2 External Independent Review.', 'info');
    } else {
      notify('Case status updated.', 'success');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      notify('Logged out successfully.', 'info');
      navigate('/');
    } catch (err) {
      notify('Failed to log out.', 'error');
    }
  };

  // Metrics computation
  const totalCases = cases.length;
  const activeCases = cases.filter((c) => c.status !== 'reversed' && c.status !== 'archived').length;
  const wonCases = cases.filter((c) => c.status === 'reversed' || c.status === 'partially_reversed').length;

  const filteredCases = cases.filter((c) => {
    if (activeTab === 'draft') return c.status === 'draft';
    if (activeTab === 'reviewing') return c.status === 'reviewing_facts' || c.status === 'gathering_evidence' || c.status === 'drafting_appeal' || c.status === 'packet_ready';
    if (activeTab === 'resolved') return c.status === 'reversed' || c.status === 'upheld' || c.status === 'partially_reversed';
    return true;
  }).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.insurerName.toLowerCase().includes(q) || c.claimNumber.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      
      {/* Consent Modal if needed */}
      <ConsentOnboardingModal
        isOpen={showConsentModal}
        onConsentComplete={() => setShowConsentModal(false)}
      />

      {/* Rules Registry Modal */}
      <RulesRegistryModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Api Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-gold/40 flex items-center justify-center text-brand-gold font-light text-base shadow-md">
            CC
          </div>
          <div>
            <h1 className="text-xl font-light text-brand-gold tracking-wide">ClaimCoda Workspace</h1>
            <p className="text-xs text-brand-text-muted">Active Claims & Denial Intelligence Center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isGuest && (
            <span className="text-[11px] bg-brand-gold/15 border border-brand-gold/40 text-brand-gold px-3 py-1 rounded-full font-medium">
              Demo Workspace Mode
            </span>
          )}

          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-surface border border-brand-border hover:border-brand-gold/50 text-brand-gold px-3.5 py-2 rounded-xl transition-all shadow-sm"
            title="Configure Google Gemini API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gemini Key</span>
          </button>

          <button
            onClick={() => setShowPayerDirectory(!showPayerDirectory)}
            className="flex items-center gap-1.5 text-xs bg-brand-surface border border-brand-border hover:border-brand-gold/40 text-brand-text px-3.5 py-2 rounded-xl transition-all"
          >
            <Building2 className="w-3.5 h-3.5 text-brand-gold" />
            <span>Payer Directory</span>
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-surface border border-brand-border hover:border-brand-gold/40 text-brand-text px-3.5 py-2 rounded-xl transition-all"
          >
            <Scale className="w-3.5 h-3.5 text-brand-gold" />
            <span>Rules Registry</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-brand-text-muted hover:text-brand-text transition-colors bg-brand-surface px-3 py-2 rounded-xl border border-brand-border"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Payer Directory Dropdown Panel */}
      {showPayerDirectory && (
        <div className="mb-8 p-6 bg-brand-surface border border-brand-gold/30 rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-brand-gold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Official Health Insurer Appeals Contacts & Fax Directory</span>
            </h3>
            <button
              onClick={() => setShowPayerDirectory(false)}
              className="text-xs text-brand-text-muted hover:text-brand-text"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {PAYER_DIRECTORY.map((p, idx) => (
              <div key={idx} className="p-4 bg-brand-bg rounded-xl border border-brand-border">
                <div className="font-medium text-brand-text mb-1">{p.name}</div>
                <div className="text-brand-text-muted text-[11px] mb-2">{p.appealsDept}</div>
                <div className="space-y-1 text-brand-text-muted">
                  <div>Mail: <span className="text-brand-text">{p.address}</span></div>
                  <div>Fax: <span className="text-brand-gold font-mono">{p.fax}</span></div>
                  <div>Phone: <span className="text-brand-text font-mono">{p.phone}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        
        <div className="bg-brand-surface border border-brand-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-brand-text-muted">Total Appeals</div>
            <div className="text-2xl font-light text-brand-text">{totalCases}</div>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-surface-light border border-amber-800/40 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-brand-text-muted">Active In Progress</div>
            <div className="text-2xl font-light text-amber-300">{activeCases}</div>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-surface-light border border-green-800/40 flex items-center justify-center text-green-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-brand-text-muted">Overturned / Won</div>
            <div className="text-2xl font-light text-green-300">{wonCases}</div>
          </div>
        </div>

      </div>

      {/* Main Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        
        {/* Tabs */}
        <div className="flex items-center gap-2 bg-brand-surface p-1 rounded-xl border border-brand-border">
          <button
            onClick={() => setActiveTab('all')}
            className={clsx('text-xs px-3.5 py-1.5 rounded-lg transition-all', activeTab === 'all' ? 'bg-brand-gold text-brand-bg font-medium' : 'text-brand-text-muted hover:text-brand-text')}
          >
            All Appeals ({cases.length})
          </button>
          <button
            onClick={() => setActiveTab('reviewing')}
            className={clsx('text-xs px-3.5 py-1.5 rounded-lg transition-all', activeTab === 'reviewing' ? 'bg-brand-gold text-brand-bg font-medium' : 'text-brand-text-muted hover:text-brand-text')}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={clsx('text-xs px-3.5 py-1.5 rounded-lg transition-all', activeTab === 'resolved' ? 'bg-brand-gold text-brand-bg font-medium' : 'text-brand-text-muted hover:text-brand-text')}
          >
            Resolved
          </button>
        </div>

        {/* Search & New Case */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by insurer, claim #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-brand-surface border border-brand-border rounded-xl pl-9 pr-4 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-gold w-56"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-brand-gold text-brand-bg font-medium px-4 py-2 rounded-xl hover:bg-brand-gold/90 transition-all text-xs shadow-[0_0_15px_rgba(185,152,69,0.2)]"
          >
            <Plus className="w-4 h-4" />
            <span>New Case</span>
          </button>
        </div>

      </div>

      {/* Cases List */}
      {loading ? (
        <div className="text-center py-20 text-xs text-brand-text-muted">Loading cases...</div>
      ) : filteredCases.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-12 text-center max-w-2xl mx-auto">
          <FolderOpen className="w-12 h-12 text-brand-gold-muted mx-auto mb-4" />
          <h3 className="text-lg font-light text-brand-text mb-2">No cases found in this view</h3>
          <p className="text-xs text-brand-text-muted mb-6">Start a new appeal or explore with a pre-loaded synthetic denial document.</p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-brand-gold text-brand-bg text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-brand-gold/90 transition-all"
            >
              Start New Appeal
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-brand-border">
            <div className="text-xs text-brand-text-muted mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              <span>Or explore with a synthetic test case:</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SAMPLE_DENIALS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleCreateFromSample(s.id)}
                  className="text-[11px] bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-3 py-1.5 rounded-lg transition-all"
                >
                  {s.title} ({s.deniedAmount}) →
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/case/${c.id}`)}
              className="bg-brand-surface border border-brand-border hover:border-brand-gold/40 p-6 rounded-2xl cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-surface-light border border-brand-border flex items-center justify-center text-brand-gold shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-brand-text group-hover:text-brand-gold transition-colors">
                      {c.title || `Case ${c.id.slice(0, 8)}`}
                    </h3>
                    <span className={clsx('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-medium', c.status === 'reversed' ? 'bg-green-950/50 text-green-300 border-green-800/40' : c.status === 'upheld' ? 'bg-red-950/50 text-red-300 border-red-800/40' : 'bg-brand-surface-light border-brand-border text-brand-text-muted')}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-brand-text-muted">
                    <span>Insurer: <strong className="text-brand-text font-normal">{c.insurerName || 'On File'}</strong></span>
                    <span>Claim #: <strong className="text-brand-text font-mono font-normal">{c.claimNumber || 'Pending'}</strong></span>
                    <span>Denied: <strong className="text-brand-gold font-normal">{c.deniedAmount || '$0.00'}</strong></span>
                  </div>

                  {c.verifiedDeadline && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Deadline: {c.verifiedDeadline}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                
                {/* Log Outcome Button */}
                <button
                  onClick={() => setOutcomeModalCase(c)}
                  className="text-xs bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-3 py-1.5 rounded-lg transition-all"
                  title="Log insurer decision"
                >
                  Log Outcome
                </button>

                {/* Delete Case */}
                <button
                  onClick={(e) => handleDeleteCase(c.id, e)}
                  className="p-2 rounded-lg border border-transparent text-brand-text-muted hover:text-red-400 hover:border-red-900/50 hover:bg-brand-bg transition-all"
                  title="Purge case record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <ChevronRight className="w-5 h-5 text-brand-border group-hover:text-brand-gold transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Case */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-brand-surface border border-brand-border max-w-lg w-full rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-light text-brand-text mb-1">Create New Denial Case</h3>
            <p className="text-xs text-brand-text-muted mb-6">
              Enter known plan information or select "Not Sure" to detect from documents.
            </p>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs text-brand-text-muted mb-1">Case Title / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Lumbar Spine MRI Denial"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-xs text-brand-text-muted mb-1">Health Insurer / Payer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Aetna, UnitedHealthcare, Blue Cross"
                  value={newInsurer}
                  onChange={(e) => setNewInsurer(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-xs text-brand-text-muted mb-1">Plan Type</label>
                <select
                  value={newPlanContext}
                  onChange={(e) => setNewPlanContext(e.target.value as PlanContextType)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold"
                >
                  <option value="not_sure">Not sure (Detect from document)</option>
                  <option value="employer_erisa">Employer-Sponsored Plan (ERISA — 180 Days)</option>
                  <option value="marketplace_aca">Marketplace / ACA Individual Plan (180 Days)</option>
                  <option value="medicare_advantage">Medicare Advantage Plan (60 Days)</option>
                  <option value="medicaid">Medicaid Managed Care</option>
                  <option value="individual_commercial">Commercial / Individual</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs text-brand-text-muted hover:text-brand-text px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-gold text-brand-bg font-medium px-5 py-2.5 rounded-xl text-xs hover:bg-brand-gold/90 transition-all"
                >
                  Create & Open Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Outcome Tracker */}
      {outcomeModalCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-brand-surface border border-brand-border max-w-md w-full rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-light text-brand-text mb-1">Log Insurer Decision</h3>
            <p className="text-xs text-brand-text-muted mb-6">
              Track the response for <strong className="text-brand-text">{outcomeModalCase.title}</strong>
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleUpdateOutcome(outcomeModalCase.id, 'reversed')}
                className="w-full p-4 rounded-xl border border-green-900/50 bg-green-950/20 hover:bg-green-950/40 text-left transition-all"
              >
                <div className="text-sm font-medium text-green-300 mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Reversed / Claim Paid in Full</span>
                </div>
                <p className="text-xs text-brand-text-muted">The insurer overturned the denial and issued payment.</p>
              </button>

              <button
                onClick={() => handleUpdateOutcome(outcomeModalCase.id, 'partially_reversed')}
                className="w-full p-4 rounded-xl border border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/40 text-left transition-all"
              >
                <div className="text-sm font-medium text-amber-300 mb-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Partially Reversed / Negotiated</span>
                </div>
                <p className="text-xs text-brand-text-muted">Portion of the claim was approved or re-coded.</p>
              </button>

              <button
                onClick={() => handleUpdateOutcome(outcomeModalCase.id, 'upheld')}
                className="w-full p-4 rounded-xl border border-red-900/50 bg-red-950/20 hover:bg-red-950/40 text-left transition-all"
              >
                <div className="text-sm font-medium text-red-300 mb-1 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  <span>Denial Upheld (Unlock Level 2 External Review)</span>
                </div>
                <p className="text-xs text-brand-text-muted">The plan upheld the denial. Proceed to Independent Medical Review (IRO).</p>
              </button>
            </div>

            <div className="flex justify-end pt-4 mt-6 border-t border-brand-border">
              <button
                onClick={() => setOutcomeModalCase(null)}
                className="text-xs text-brand-text-muted hover:text-brand-text px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
