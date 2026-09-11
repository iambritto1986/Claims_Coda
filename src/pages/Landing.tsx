import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { Navigate, useNavigate } from 'react-router-dom';
import { useNotification } from '../components/NotificationProvider';
import { AppealPathMotion } from '../components/AppealPathMotion';
import { RulesRegistryModal } from '../components/RulesRegistryModal';
import { SAMPLE_DENIALS } from '../lib/sampleDenials';
import { DENIAL_STRATEGIES } from '../lib/denialStrategies';
import { DenialCategory, PlanContextType } from '../types/claimcoda';
import {
  FileText,
  ShieldCheck,
  Scale,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Clock,
  Download,
  FileCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ExternalLink,
  Zap,
  HelpCircle,
  Calculator,
  UserCheck,
  FileQuestion,
  X,
} from 'lucide-react';
import clsx from 'clsx';

export default function Landing() {
  const { user, login, loginWithEmail, signUpWithEmail, loginAsGuest } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  // Navigation & Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [firebaseDomainError, setFirebaseDomainError] = useState(false);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Interactive Denial Category Explorer State
  const [selectedCategory, setSelectedCategory] = useState<DenialCategory>('medical_necessity');

  // Interactive Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(3850);
  const [calcPlan, setCalcPlan] = useState<PlanContextType>('employer_erisa');
  const [calcDaysAgo, setCalcDaysAgo] = useState<number>(14);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notify('Please enter both email and password.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'signup') {
        await signUpWithEmail(email, password);
        notify('Account created successfully. Welcome to ClaimCoda!', 'success');
      } else {
        await loginWithEmail(email, password);
        notify('Logged in successfully.', 'success');
      }
      setShowAuthModal(false);
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/unauthorized-domain' ||
        err.message?.includes('unauthorized-domain') ||
        err.code === 'auth/operation-not-allowed'
      ) {
        setFirebaseDomainError(true);
        notify('Firebase domain not authorized on this host. You can proceed instantly in Guest Demo Mode!', 'error');
      } else {
        notify(err.message || 'Authentication failed.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await login();
      notify('Logged in with Google successfully.', 'success');
      setShowAuthModal(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setFirebaseDomainError(true);
        notify('Firebase domain is not authorized on localhost. Click "Continue as Guest" below!', 'error');
      } else {
        notify(err.message || 'Google authentication failed.', 'error');
      }
    }
  };

  const handleStartInstantDemo = (sampleId: string = 'sample-mri-medical-necessity') => {
    loginAsGuest('demo.member@claimcoda.app', 'Eleanor Vance');
    notify('Instant Demo Workspace initialized. Ready to explore!', 'success');
    navigate('/dashboard');
  };

  // Calculator computations
  const statutoryLimitDays = calcPlan === 'medicare_advantage' ? 60 : 180;
  const daysRemaining = Math.max(0, statutoryLimitDays - calcDaysAgo);
  const urgencyLevel = daysRemaining < 30 ? 'critical' : daysRemaining < 60 ? 'urgent' : 'safe';

  const faqs = [
    {
      q: 'Why do health insurance companies deny so many claims?',
      a: 'Data from the Kaiser Family Foundation shows ACA plans deny approximately 17% to 20% of all in-network claims. Insurers rely on automated algorithms and internal clinical criteria (like Milliman Care Guidelines). When claims lack specific prerequisite keywords, prior auth, or conservative therapy records, they are automatically rejected. Over 50% of appealed claims are overturned.',
    },
    {
      q: 'How does ClaimCoda prevent AI hallucinations in appeal letters?',
      a: 'ClaimCoda implements a strict source-provenance architecture. Every extracted claim number, date of service, CPT code, and dollar amount is linked directly to an exact page number and text snippet from your uploaded EOB. Material facts must be verified by you before generating a draft, and an automated reconciliation engine validates every detail against confirmed records.',
    },
    {
      q: 'What is the difference between an Internal Appeal and an External Review?',
      a: 'An Internal Appeal (Level 1) is submitted directly to your insurance company (statutory filing deadline is typically 180 days under ERISA / ACA rules). If the insurer upholds their denial, federal law grants you the right to an Independent External Review (Level 2) conducted by an independent physician who has no relationship with your insurance company. The external review decision is legally binding on the insurer.',
    },
    {
      q: 'Can I use ClaimCoda to appeal a denial for a family member or dependent?',
      a: 'Yes. You can file as an authorized representative for a spouse, elderly parent, or dependent child. ClaimCoda includes standard Authorized Representative enclosure instructions and signature designations in the final appeal packet.',
    },
    {
      q: 'Is ClaimCoda a law firm or medical provider?',
      a: 'No. ClaimCoda is an administrative document preparation and organization workspace. It does not provide legal representation, medical advice, or clinical diagnosis. It organizes your existing records and helps you assemble professional, evidence-backed appeal packets based on publicly reviewed regulatory standards.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-brand-bg text-brand-text selection:bg-brand-gold selection:text-brand-bg">
      
      {/* Full-Page Background Motion Animation */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <AppealPathMotion />
      </div>

      {/* Rules Registry Modal */}
      <RulesRegistryModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* ========================================================= */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-brand-bg/85 border-b border-brand-border/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-gold/40 flex items-center justify-center text-brand-gold font-light text-base shadow-md">
              CC
            </div>
            <div>
              <span className="text-lg font-light tracking-wide text-brand-gold block leading-none">ClaimCoda</span>
              <span className="text-[10px] text-brand-text-muted tracking-wider uppercase">Denial Intelligence</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-brand-text-muted">
            <a href="#how-it-works" className="hover:text-brand-text transition-colors">How It Works</a>
            <a href="#denial-types" className="hover:text-brand-text transition-colors">Denial Strategies</a>
            <a href="#calculator" className="hover:text-brand-text transition-colors">Deadline Calculator</a>
            <a href="#pricing" className="hover:text-brand-text transition-colors">Pricing</a>
            <button
              onClick={() => setShowRulesModal(true)}
              className="hover:text-brand-gold transition-colors flex items-center gap-1 text-xs"
            >
              <Scale className="w-3.5 h-3.5 text-brand-gold" />
              <span>Rules Registry</span>
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStartInstantDemo()}
              className="hidden sm:flex items-center gap-1.5 text-xs bg-brand-surface border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Try Instant Demo</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('signin');
                setShowAuthModal(true);
              }}
              className="bg-brand-gold text-brand-bg text-xs font-medium px-5 py-2 rounded-xl hover:bg-brand-gold/90 transition-all shadow-[0_0_15px_rgba(185,152,69,0.2)]"
            >
              Sign In
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================= */}
      <section className="relative z-10 pt-16 pb-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          
          <div className="inline-flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full bg-brand-surface/90 border border-brand-gold/40 text-brand-gold mb-6 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-brand-gold animate-ping" />
            <span>Fair & Square Consumer Denial Intelligence Workspace</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-brand-text leading-[1.12] mb-6">
            Turn a confusing health-insurance denial into a{' '}
            <span className="text-brand-gold font-normal">clear, evidence-backed next step.</span>
          </h1>

          <p className="text-brand-text-muted text-base sm:text-xl leading-relaxed max-w-2xl mx-auto mb-8 font-light">
            Insurers deny 1 in 5 claims, but over 50% of formal appeals are overturned. ClaimCoda extracts denial reasons, matches missing clinical evidence, and compiles your complete formal appeal packet.
          </p>

          {/* Hero Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => {
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="flex items-center gap-2 bg-brand-gold text-brand-bg font-medium px-8 py-4 rounded-xl text-sm hover:bg-brand-gold/90 transition-all shadow-[0_0_30px_rgba(185,152,69,0.25)]"
            >
              <span>Scan Your Denial Notice</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleStartInstantDemo('sample-mri-medical-necessity')}
              className="flex items-center gap-2 bg-brand-surface border border-brand-border hover:border-brand-gold/50 text-brand-text px-6 py-4 rounded-xl text-sm transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4 text-brand-gold" />
              <span>Explore Live Demo as Eleanor Vance</span>
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-brand-text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-gold" /> Zero Invented Dates or Codes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-gold" /> Source-Linked Provenance
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-gold" /> 3-Part PDF Packet Export
            </span>
          </div>
        </div>

        {/* Hero Interactive Preview Card */}
        <div className="max-w-4xl mx-auto bg-brand-surface/95 border border-brand-gold/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs font-mono text-brand-text-muted ml-2">Live Denial Intelligence Preview</span>
            </div>
            <span className="text-xs text-brand-gold bg-brand-surface-light border border-brand-gold/30 px-3 py-1 rounded-full">
              Simulated Ingestion Stream
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-brand-bg/80 border border-brand-border p-4 rounded-xl">
              <div className="text-[11px] text-brand-text-muted mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-brand-gold" />
                <span>Extracted Stated Reason</span>
              </div>
              <div className="text-sm font-medium text-brand-text mb-2">CO-50: Not Medically Necessary</div>
              <p className="text-xs text-brand-text-muted leading-relaxed font-mono">
                Source: Page 1, Para 3: "Prerequisite 6 weeks of conservative physical therapy not established."
              </p>
            </div>

            <div className="bg-brand-bg/80 border border-brand-border p-4 rounded-xl">
              <div className="text-[11px] text-brand-text-muted mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Statutory Appeal Deadline</span>
              </div>
              <div className="text-sm font-medium text-amber-300 mb-2">166 Days Remaining</div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                ERISA § 503 (29 CFR § 2560.503-1) mandates 180 days for full and fair review.
              </p>
            </div>

            <div className="bg-brand-bg/80 border border-brand-border p-4 rounded-xl">
              <div className="text-[11px] text-brand-text-muted mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span>Recommended Evidence</span>
              </div>
              <div className="text-sm font-medium text-green-300 mb-2">2 Exhibits Required</div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Letter of Medical Necessity (LMN) + PT Encounter notes to overturn denial.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. HOW IT WORKS (4-STEP GUIDED FLOW) */}
      {/* ========================================================= */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 border-t border-brand-border/60 bg-brand-surface/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase tracking-widest text-brand-gold font-medium mb-3">Workflow Blueprint</h2>
            <h3 className="text-3xl sm:text-4xl font-light text-brand-text mb-4">
              From confusing denial notice to fully assembled appeal packet in 4 steps.
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-muted leading-relaxed">
              No guesswork, no hallucinated dates, and no complex legal terminology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold font-bold text-sm mb-4">
                1
              </div>
              <h4 className="text-base font-medium text-brand-text mb-2">Secure Ingestion & Scan</h4>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Upload your EOB or denial letter (PDF/Image). Our grounded pipeline extracts dates, codes, claim numbers, and stated reasons.
              </p>
            </div>

            <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold font-bold text-sm mb-4">
                2
              </div>
              <h4 className="text-base font-medium text-brand-text mb-2">Dual-Pane Verification</h4>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Review extracted facts side-by-side with source page references. Confirm or edit facts before drafting begins.
              </p>
            </div>

            <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold font-bold text-sm mb-4">
                3
              </div>
              <h4 className="text-base font-medium text-brand-text mb-2">Evidence Strategy Matching</h4>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                ClaimCoda matches your specific denial reason to recommended evidence (LMNs, clinical records, compendia guidelines).
              </p>
            </div>

            <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-brand-surface-light border border-brand-gold/30 flex items-center justify-center text-brand-gold font-bold text-sm mb-4">
                4
              </div>
              <h4 className="text-base font-medium text-brand-text mb-2">3-Part Packet Export</h4>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Download a polished PDF packet with Formal Appeal Letter, Exhibit Table, and Step-by-Step Filing & Tracking checklist.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. DENIAL STRATEGIES EXPLORER */}
      {/* ========================================================= */}
      <section id="denial-types" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-widest text-brand-gold font-medium mb-3">Denial Playbooks</h2>
          <h3 className="text-3xl sm:text-4xl font-light text-brand-text mb-4">
            Tailored strategies for every major denial reason.
          </h3>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Health insurers use standard denial patterns. Here is how ClaimCoda systematically counters each one.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {(Object.keys(DENIAL_STRATEGIES) as DenialCategory[]).slice(0, 5).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={clsx(
                'text-xs px-4 py-2.5 rounded-xl border transition-all',
                selectedCategory === cat
                  ? 'bg-brand-gold text-brand-bg font-medium border-brand-gold shadow-md'
                  : 'bg-brand-surface border-brand-border text-brand-text-muted hover:text-brand-text hover:border-brand-gold/40'
              )}
            >
              {DENIAL_STRATEGIES[cat].badgeLabel}
            </button>
          ))}
        </div>

        {/* Selected Strategy Deep-Dive Box */}
        {DENIAL_STRATEGIES[selectedCategory] && (
          <div className="bg-brand-surface border border-brand-gold/30 rounded-2xl p-8 max-w-4xl mx-auto shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h4 className="text-2xl font-light text-brand-text">
                {DENIAL_STRATEGIES[selectedCategory].title}
              </h4>
              <span className="text-xs px-3 py-1 rounded-full bg-brand-surface-light border border-brand-gold/30 text-brand-gold font-medium">
                Standard Reversal Strategy
              </span>
            </div>

            <p className="text-sm text-brand-text-muted leading-relaxed mb-6">
              {DENIAL_STRATEGIES[selectedCategory].summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-brand-border">
              
              <div>
                <h5 className="text-xs font-medium text-brand-gold uppercase tracking-wider mb-3">Core Legal & Regulatory Basis</h5>
                <p className="text-xs text-brand-text-muted leading-relaxed bg-brand-bg p-3.5 rounded-xl border border-brand-border">
                  {DENIAL_STRATEGIES[selectedCategory].coreLegalBasis}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-medium text-brand-gold uppercase tracking-wider mb-3">Recommended Evidence Exhibits</h5>
                <ul className="space-y-2">
                  {DENIAL_STRATEGIES[selectedCategory].recommendedEvidence.map((ev, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-brand-text">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
                      <span><strong>{ev.label}:</strong> {ev.description}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 5. INTERACTIVE STATUTORY DEADLINE CALCULATOR */}
      {/* ========================================================= */}
      <section id="calculator" className="relative z-10 py-24 px-6 border-t border-brand-border/60 bg-brand-surface/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 text-xs text-brand-gold mb-2">
              <Calculator className="w-4 h-4" />
              <span>Interactive Decision Tool</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-light text-brand-text mb-4">
              Denial Value & Statutory Deadline Calculator
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-muted">
              Estimate your remaining appeal window under federal ERISA / ACA regulations and calculate potential out-of-pocket recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-brand-surface border border-brand-border p-8 rounded-2xl shadow-2xl">
            
            {/* Calculator Inputs (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              <h4 className="text-sm font-medium text-brand-gold">Claim Details</h4>

              <div>
                <label className="block text-xs text-brand-text-muted mb-1.5">
                  Denied Claim Amount ($)
                </label>
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold"
                  min={50}
                  step={50}
                />
              </div>

              <div>
                <label className="block text-xs text-brand-text-muted mb-1.5">
                  Health Plan Type
                </label>
                <select
                  value={calcPlan}
                  onChange={(e) => setCalcPlan(e.target.value as PlanContextType)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold"
                >
                  <option value="employer_erisa">Employer-Sponsored Plan (ERISA — 180 Days)</option>
                  <option value="marketplace_aca">Marketplace / ACA Individual Plan (180 Days)</option>
                  <option value="medicare_advantage">Medicare Advantage (60 Days)</option>
                  <option value="individual_commercial">Commercial Fully-Insured (180 Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-brand-text-muted mb-1.5">
                  Days Since EOB Notice Received: <strong className="text-brand-text">{calcDaysAgo} days</strong>
                </label>
                <input
                  type="range"
                  min={0}
                  max={statutoryLimitDays}
                  value={calcDaysAgo}
                  onChange={(e) => setCalcDaysAgo(Number(e.target.value))}
                  className="w-full accent-brand-gold cursor-pointer"
                />
              </div>
            </div>

            {/* Results Output Box (6 cols) */}
            <div className="lg:col-span-6 bg-brand-bg p-6 rounded-xl border border-brand-border flex flex-col justify-between">
              <div>
                <div className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Statutory Analysis</div>
                
                <div className="flex items-baseline gap-2 mb-4">
                  <span className={clsx('text-4xl font-light', urgencyLevel === 'critical' ? 'text-red-400' : urgencyLevel === 'urgent' ? 'text-amber-400' : 'text-brand-gold')}>
                    {daysRemaining}
                  </span>
                  <span className="text-sm text-brand-text-muted">days remaining to file Level 1 appeal</span>
                </div>

                <div className="space-y-2.5 text-xs text-brand-text-muted mb-6">
                  <div className="flex justify-between py-1 border-b border-brand-border/60">
                    <span>Statutory Timeframe:</span>
                    <strong className="text-brand-text">{statutoryLimitDays} Calendar Days</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-brand-border/60">
                    <span>Potential Recovery:</span>
                    <strong className="text-brand-gold font-mono">${calcAmount.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-brand-border/60">
                    <span>Level 2 External Review Window:</span>
                    <strong className="text-brand-text">4 Months (120 Days)</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartInstantDemo()}
                className="w-full flex items-center justify-center gap-2 bg-brand-gold text-brand-bg font-medium py-3 rounded-xl text-xs hover:bg-brand-gold/90 transition-all shadow-[0_0_15px_rgba(185,152,69,0.2)]"
              >
                <span>Draft Appeal for this ${calcAmount.toLocaleString()} Claim</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. TRANSPARENT PRICING SECTION */}
      {/* ========================================================= */}
      <section id="pricing" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-widest text-brand-gold font-medium mb-3">Clear & Fair Pricing</h2>
          <h3 className="text-3xl sm:text-4xl font-light text-brand-text mb-4">
            Flat, transparent pricing. No contingency fees.
          </h3>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Unlike medical bill negotiators that take 20-30% of your savings, ClaimCoda gives you complete control for a transparent flat fee.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          {/* Free Scan */}
          <div className="bg-brand-surface border border-brand-border p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h4 className="text-lg font-medium text-brand-text mb-1">Free Denial Scan</h4>
              <p className="text-xs text-brand-text-muted mb-6">Understand what happened and what evidence is missing.</p>
              
              <div className="text-3xl font-light text-brand-text mb-6">$0</div>

              <ul className="space-y-3 text-xs text-brand-text-muted mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Full document OCR & text extraction</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Plain-language denial reason breakdown</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Statutory deadline calculation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Missing evidence checklist</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="w-full bg-brand-surface-light border border-brand-border hover:border-brand-gold/50 text-brand-text py-2.5 rounded-xl text-xs transition-all"
            >
              Start Free Scan
            </button>
          </div>

          {/* Appeal Pack (Featured) */}
          <div className="bg-brand-surface border-2 border-brand-gold p-8 rounded-2xl flex flex-col justify-between relative shadow-[0_0_30px_rgba(185,152,69,0.15)]">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-wider bg-brand-gold text-brand-bg px-3 py-0.5 rounded-full">
              Most Popular
            </span>

            <div>
              <h4 className="text-lg font-medium text-brand-text mb-1">Appeal Pack</h4>
              <p className="text-xs text-brand-text-muted mb-6">Complete evidence-backed appeal packet for your claim.</p>
              
              <div className="text-3xl font-light text-brand-gold mb-6">$39 <span className="text-xs text-brand-text-muted font-normal">/ single case</span></div>

              <ul className="space-y-3 text-xs text-brand-text mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Everything in Free Scan</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Grounded Appeal Letter Builder</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Automated fact reconciliation post-check</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Complete 3-Part PDF packet export</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Certified mail & fax tracking guide</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="w-full bg-brand-gold text-brand-bg font-medium py-3 rounded-xl text-xs hover:bg-brand-gold/90 transition-all shadow-md"
            >
              Get Appeal Pack
            </button>
          </div>

          {/* Guided Case */}
          <div className="bg-brand-surface border border-brand-border p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h4 className="text-lg font-medium text-brand-text mb-1">Guided Case</h4>
              <p className="text-xs text-brand-text-muted mb-6">Level 1 internal appeal + Level 2 External Review package.</p>
              
              <div className="text-3xl font-light text-brand-text mb-6">$99 <span className="text-xs text-brand-text-muted font-normal">/ case</span></div>

              <ul className="space-y-3 text-xs text-brand-text-muted mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Everything in Appeal Pack</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Level 2 Independent External Review packet</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> Unlimited letter revisions & custom grounds</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" /> State DOI complaint filing templates</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="w-full bg-brand-surface-light border border-brand-border hover:border-brand-gold/50 text-brand-text py-2.5 rounded-xl text-xs transition-all"
            >
              Start Guided Case
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
      {/* ========================================================= */}
      <section className="relative z-10 py-24 px-6 border-t border-brand-border/60 bg-brand-surface/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase tracking-widest text-brand-gold font-medium mb-3">Consumer Knowledge Base</h2>
            <h3 className="text-3xl sm:text-4xl font-light text-brand-text mb-4">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:text-brand-gold transition-colors"
                  >
                    <span className="text-sm font-medium text-brand-text">{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-brand-gold shrink-0" /> : <ChevronDown className="w-4 h-4 text-brand-text-muted shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-brand-text-muted leading-relaxed border-t border-brand-border/40 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FOOTER & REGULATORY CITATIONS */}
      {/* ========================================================= */}
      <footer className="relative z-10 py-12 px-6 border-t border-brand-border bg-brand-bg text-xs text-brand-text-muted">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-gold/40 flex items-center justify-center text-brand-gold text-xs font-light">
              CC
            </div>
            <span>ClaimCoda • Consumer Denial Intelligence Workspace</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setShowRulesModal(true)} className="hover:text-brand-text transition-colors">
              Rules Registry
            </button>
            <a href="https://www.cms.gov/marketplace/about/affordable-care-act/external-appeals" target="_blank" rel="noopener noreferrer" className="hover:text-brand-text transition-colors">
              CMS External Review
            </a>
            <a href="https://www.dol.gov/agencies/ebsa" target="_blank" rel="noopener noreferrer" className="hover:text-brand-text transition-colors">
              ERISA / DOL Standard
            </a>
          </div>

          <div>
            © {new Date().getFullYear()} ClaimCoda. Not legal, medical, or regulatory advice.
          </div>

        </div>
      </footer>

      {/* ========================================================= */}
      {/* 9. AUTHENTICATION MODAL */}
      {/* ========================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-brand-surface border border-brand-gold/40 max-w-md w-full rounded-2xl p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-light transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-light text-brand-text mb-1">
                {authMode === 'signup' ? 'Create Your Account' : 'Sign In to ClaimCoda'}
              </h3>
              <p className="text-xs text-brand-text-muted">
                {authMode === 'signup' ? 'Organize your health insurance appeals in one secure file.' : 'Access your active appeals and drafts.'}
              </p>
            </div>

            {/* Firebase Domain Notice & Guest Fallback Card */}
            {firebaseDomainError && (
              <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-200">
                <div className="flex items-center gap-1.5 font-medium text-amber-300 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Firebase Domain Setting Notice</span>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed">
                  Your current host (<code>localhost:3000</code>) is not yet in your Firebase Authorized Domains list. You can explore all features right now with instant guest demo mode:
                </p>
                <button
                  type="button"
                  onClick={() => handleStartInstantDemo()}
                  className="w-full bg-brand-gold text-brand-bg font-medium py-2 rounded-lg text-xs hover:bg-brand-gold/90 transition-all shadow-sm"
                >
                  Continue in Instant Demo Workspace →
                </button>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-brand-text-muted mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-surface-light border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-brand-text-muted mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-surface-light border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-gold"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-gold text-brand-bg font-medium px-4 py-3 rounded-xl text-xs hover:bg-brand-gold/90 transition-all disabled:opacity-50 mt-2 shadow-[0_0_20px_rgba(185,152,69,0.2)]"
              >
                {isSubmitting ? 'Processing...' : authMode === 'signup' ? 'Create Free Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between">
              <hr className="flex-1 border-brand-border" />
              <span className="px-3 text-[10px] text-brand-text-muted uppercase">OR</span>
              <hr className="flex-1 border-brand-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-surface-light border border-brand-border hover:border-brand-gold/40 text-brand-text px-4 py-2.5 rounded-xl text-xs transition-all"
            >
              <span>Continue with Google</span>
            </button>

            {/* 1-Click Guest Access Option */}
            <div className="mt-4 pt-4 border-t border-brand-border text-center">
              <button
                type="button"
                onClick={() => handleStartInstantDemo()}
                className="text-xs text-brand-gold hover:text-brand-text flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Demo / Guest Access (No password required)</span>
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-brand-text-muted">
              {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                className="text-brand-gold hover:underline font-medium"
              >
                {authMode === 'signup' ? 'Sign in here' : 'Sign up here'}
              </button>
            </p>

          </div>
        </div>
      )}

    </div>
  );
}
