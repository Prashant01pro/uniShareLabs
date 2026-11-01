import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  FileCheck2,
  Gauge,
  Info,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Zap,
  Lock,
  ListChecks,
  AlertOctagon
} from 'lucide-react';
import { IResource } from './ResourceCatalog';

export interface EligibilityCheckResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface EligibilityEvaluation {
  eligible: boolean;
  isEligible: boolean;
  reasons: string[];
  blockingReasons?: string[];
  missingCertifications: string[];
  missingTrainings: string[];
  checks: EligibilityCheckResult[];
  eligibilityScore: number;
  recommendedRemediation: string[];
}

interface ResourceDetailModalProps {
  resource: IResource;
  isOpen: boolean;
  onClose: () => void;
  onProceedToBooking: () => void;
}

const getApiClient = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
};

export default function ResourceDetailModal({
  resource,
  isOpen,
  onClose,
  onProceedToBooking
}: ResourceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'eligibility' | 'checklists'>('overview');
  const [eligibility, setEligibility] = useState<EligibilityEvaluation | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(true);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !resource?._id) return;

    const fetchEligibility = async () => {
      try {
        setLoadingEligibility(true);
        setEligibilityError(null);
        const api = getApiClient();
        const res = await api.get(`/resources/${resource._id}/eligibility`);
        setEligibility(res.data);
      } catch (err: any) {
        console.error('Failed to evaluate eligibility:', err);
        setEligibilityError(
          err?.response?.data?.message || err?.response?.data?.detail || 'Unable to run deterministic eligibility checker.'
        );
      } finally {
        setLoadingEligibility(false);
      }
    };

    fetchEligibility();
  }, [isOpen, resource?._id]);

  if (!isOpen || !resource) return null;

  const loc = resource.labLocation || resource.location || 'Central Instrumentation Wing';
  const allowedDaysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const allowedDays = resource.calendar?.allowedDays?.map((d) => allowedDaysMap[d]).join(', ') || 'Mon - Fri';

  const getGateDetails = (name: string) => {
    switch (name) {
      case 'ACCOUNT_STANDING':
        return {
          title: 'Gate 1: Account & Disciplinary Standing',
          desc: 'Verifies active university credentials, absence of disciplinary suspensions, and penalty points < 50.'
        };
      case 'RESOURCE_AVAILABILITY':
        return {
          title: 'Gate 2: Resource Availability Status',
          desc: 'Confirms instrument is AVAILABLE and has no overlapping maintenance blackout windows.'
        };
      case 'ROLE_CLEARANCE':
        return {
          title: 'Gate 3: Institutional Role Clearance',
          desc: `Verifies academic rank satisfies the minimum prerequisite '${resource.prerequisites?.minRole || 'STUDENT'}'.`
        };
      case 'SAFETY_CERTIFICATIONS':
        return {
          title: 'Gate 4: Mandatory Safety Certifications',
          desc: 'Validates active, unexpired institutional laboratory certifications (e.g. Laser Safety, Cleanroom Protocol).'
        };
      case 'SAFETY_TRAININGS':
        return {
          title: 'Gate 5: Required Safety Modules',
          desc: 'Ensures completion of Environmental Health & Safety hazardous materials and equipment courses.'
        };
      case 'FACILITY_INDUCTION':
        return {
          title: 'Gate 6: Physical Facility Induction',
          desc: 'Checks completed hands-on equipment walkthrough with laboratory staff.'
        };
      case 'SAFETY_AGREEMENT':
        return {
          title: 'Gate 7: Facility Safety Protocol Sign-Off',
          desc: 'Confirms explicit user acknowledgement of equipment hazard terms and containment policies.'
        };
      default:
        return { title: name, desc: 'Deterministic prerequisite validation check.' };
    }
  };

  const isEligible = eligibility ? (eligibility.eligible ?? eligibility.isEligible) : false;
  const score = eligibility?.eligibilityScore ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-surface-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10">
        <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between bg-surface-950/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {resource.code}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-400">{resource.category}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-400 font-semibold">{resource.department}</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {resource.name || resource.title}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Location: {loc}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 px-6 border-b border-slate-800 bg-surface-900/50 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            Overview & Specifications
          </button>

          <button
            onClick={() => setActiveTab('eligibility')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'eligibility'
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Live 7-Gate Eligibility Checker
            {eligibility && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  isEligible
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {score}%
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('checklists')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'checklists'
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Pre-Use Checklist & Meters
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Equipment Description
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed bg-surface-950/40 p-4 rounded-2xl border border-slate-800">
                  {resource.description || 'No detailed description provided for this instrument.'}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  Operating Envelope & Scheduling Rules
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Operating Days</span>
                    <p className="font-semibold text-white">{allowedDays}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Daily Operating Window</span>
                    <p className="font-semibold text-white font-mono">
                      {resource.calendar?.dailyStartTime || '08:00'} - {resource.calendar?.dailyEndTime || '20:00'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Session Duration Limits</span>
                    <p className="font-semibold text-white font-mono">
                      {resource.calendar?.minDurationMinutes || 30}m - {resource.calendar?.maxDurationMinutes || 240}m
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Post-Use Cooldown Buffer</span>
                    <p className="font-semibold text-white font-mono">
                      {resource.calendar?.bufferTimeMinutes || 15} minutes
                    </p>
                  </div>
                </div>
              </div>

              {resource.specifications && Object.keys(resource.specifications).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Technical Specifications
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {Object.entries(resource.specifications).map(([key, val]) => (
                      <div
                        key={key}
                        className="p-3 rounded-xl bg-surface-950/60 border border-slate-800 flex items-center justify-between"
                      >
                        <span className="text-slate-400">{key}</span>
                        <span className="font-mono text-slate-100 font-semibold">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-brand-950/20 border border-brand-800/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-300">
                    Access Protocols & Verification Pipeline
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Safety Clearance Level:</span>
                    <p className="font-semibold text-white mt-0.5">{resource.safetyLevel || 'LEVEL_1_GENERAL'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Approval Mechanism:</span>
                    <p className="font-semibold text-white mt-0.5">
                      {resource.approvalMode === 'AUTOMATIC' ? 'Instant Automatic Approval' : 'Lab Manager Review Queue'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Handover Credential:</span>
                    <p className="font-semibold text-white mt-0.5">Digital Lockbox 4-Digit PIN</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eligibility' && (
            <div className="space-y-6">
              {loadingEligibility ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-slate-400 font-mono">
                    Executing Deterministic 7-Gate Safety Verification Pipeline...
                  </p>
                </div>
              ) : eligibilityError ? (
                <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Failed to Run Eligibility Evaluation</span>
                  </div>
                  <p className="text-xs">{eligibilityError}</p>
                </div>
              ) : eligibility ? (
                <div className="space-y-6">
                  <div
                    className={`p-6 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isEligible
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-2xl ${
                          isEligible
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isEligible ? (
                          <ShieldCheck className="w-8 h-8" />
                        ) : (
                          <ShieldAlert className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {isEligible
                            ? 'Certified & Qualified to Reserve'
                            : 'Access Restricted — Prerequisites Incomplete'}
                        </h3>
                        <p className="text-xs opacity-90 mt-0.5">
                          {isEligible
                            ? 'All safety certifications, role clearances, and standing criteria verified deterministically.'
                            : `${eligibility.reasons?.length || 1} gate(s) failed. Action required before booking.`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black font-mono">
                        {score}%
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        Eligibility Score
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>7-Gate Deterministic Pipeline Breakdown</span>
                      <span className="text-slate-500 font-mono text-[10px]">Authoritative Evaluation</span>
                    </h4>

                    <div className="space-y-2.5">
                      {eligibility.checks?.map((check) => {
                        const meta = getGateDetails(check.name);
                        return (
                          <div
                            key={check.name}
                            className={`p-4 rounded-2xl border transition-all ${
                              check.passed
                                ? 'bg-surface-950/60 border-slate-800'
                                : 'bg-rose-500/5 border-rose-500/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {check.passed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-sm font-bold text-white">
                                      {meta.title}
                                    </h5>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                        check.passed
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      }`}
                                    >
                                      {check.passed ? 'PASSED' : 'FAILED'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400">{meta.desc}</p>
                                  <p
                                    className={`text-xs font-mono mt-1 ${
                                      check.passed ? 'text-slate-300' : 'text-rose-300 font-semibold'
                                    }`}
                                  >
                                    → {check.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {eligibility.recommendedRemediation && eligibility.recommendedRemediation.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <AlertOctagon className="w-4 h-4" />
                        <span>Recommended Remediation Path</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-amber-200">
                        {eligibility.recommendedRemediation.map((rem, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{rem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'checklists' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-brand-400" />
                  Pre-Use Inspection Checklist Requirements
                </h4>
                <p className="text-xs text-slate-400">
                  During Step 7 Handover, operators must physically inspect and attest to these points before digital lockbox PIN reveal:
                </p>

                {resource.inspectionConfig?.checklistItems && resource.inspectionConfig.checklistItems.length > 0 ? (
                  <div className="space-y-2">
                    {resource.inspectionConfig.checklistItems.map((item, idx) => (
                      <div
                        key={item.itemId || idx}
                        className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-200">{item.itemText}</span>
                        {item.isCritical ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Critical Safety Gate
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800">
                            Standard Check
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-950/40 border border-slate-800 text-xs text-slate-400 text-center">
                    Standard laboratory clean state check and visual baseline verification applies.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-brand-400" />
                  Monitored Telemetry & Metrology Meters
                </h4>

                {resource.inspectionConfig?.meters && resource.inspectionConfig.meters.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {resource.inspectionConfig.meters.map((meter, idx) => (
                      <div
                        key={meter.meterKey || idx}
                        className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-slate-200 font-semibold">{meter.label}</span>
                          <p className="text-[10px] font-mono text-slate-500">{meter.meterKey}</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-surface-900 border border-slate-700 font-mono text-brand-300">
                          {meter.unit || 'units'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-200">Runtime Hours (runTimeSeconds)</span>
                      <span className="font-mono text-brand-300">seconds / hrs</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-200">Operational Temperature</span>
                      <span className="font-mono text-brand-300">°C</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-surface-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close Profile
          </button>

          <button
            onClick={onProceedToBooking}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
              isEligible
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-600/30'
                : 'bg-surface-800 text-slate-300 hover:bg-surface-700 border border-slate-700'
            }`}
          >
            <span>Proceed to Reservation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
