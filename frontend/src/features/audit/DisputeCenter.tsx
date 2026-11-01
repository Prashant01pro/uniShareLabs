import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Camera,
  FileText,
  DollarSign,
  Gavel,
  RefreshCw,
  Search,
  Hash,
  XCircle,
  MessageSquare,
  Building2,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type IncidentCategory =
  | 'LATE_RETURN'
  | 'PHYSICAL_DAMAGE'
  | 'UNAUTHORIZED_ACCESS'
  | 'MISSING_PARTS'
  | 'SAFETY_BREACH'
  | 'EQUIPMENT_DAMAGE';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED' | 'ADJUDICATED';
export type AdjudicationDecision = 'USER_LIABLE' | 'PREEXISTING_FATIGUE' | 'SHARED_LIABILITY' | 'DISMISSED';

export interface IIncident {
  _id: string;
  incidentNumber: string;
  bookingId: any;
  resourceId: any;
  reportedBy: any;
  accusedParty?: any;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  repairCostEstimate: number;
  penaltyHours?: number;
  evidencePhotos?: Array<{ photoUrl: string; sha256Hash: string; caption?: string }>;
  disputeStatement?: string;
  disputeDetails?: string;
  disputedAt?: string;
  adjudication?: {
    adjudicatedBy: any;
    adjudicatedAt: string;
    decision: AdjudicationDecision;
    penaltyPointsAssigned: number;
    billingChargeAmount?: number;
    grantCodeCharged?: string;
    actionItemsRequired: string[];
    findingsSummary: string;
  };
  createdAt: string;
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

export default function DisputeCenter() {
  const [incidents, setIncidents] = useState<IIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [defendingIncident, setDefendingIncident] = useState<IIncident | null>(null);
  const [defenseStatement, setDefenseStatement] = useState('');
  const [isFilingDefense, setIsFilingDefense] = useState(false);

  const [adjudicatingIncident, setAdjudicatingIncident] = useState<IIncident | null>(null);
  const [adjudicationDecision, setAdjudicationDecision] = useState<AdjudicationDecision>('SHARED_LIABILITY');
  const [penaltyPoints, setPenaltyPoints] = useState<number>(15);
  const [billingCharge, setBillingCharge] = useState<number>(250);
  const [grantCodeCharged, setGrantCodeCharged] = useState('NSF-DMR-2026-9912');
  const [actionItemsText, setActionItemsText] = useState('Retake Laboratory Specimen Handling Safety Module 2');
  const [findingsSummary, setFindingsSummary] = useState('');
  const [isAdjudicating, setIsAdjudicating] = useState(false);

  const { token, activeRole, switchPersona, isLoading: authLoading } = useAuth();
  const canAdjudicate = ['LAB_MANAGER', 'ADMIN', 'RESOURCE_OWNER'].includes(activeRole);

  const fetchIncidents = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const api = getApiClient();
      const res = await api.get('/incidents');
      const data = res.data?.data || res.data || [];
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError('Authentication required to access incident and dispute tickets.');
      } else {
        console.error('Failed to load incidents:', err);
        setError(err?.response?.data?.message || err.message || 'Unable to retrieve incident tickets.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && token) {
      fetchIncidents();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
  }, [token, authLoading, activeRole]);

  const handleFileDefense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defendingIncident || !defenseStatement.trim()) return;

    try {
      setIsFilingDefense(true);
      const api = getApiClient();
      await api.post(`/incidents/${defendingIncident._id}/dispute`, {
        disputeStatement: defenseStatement.trim()
      });
      setDefendingIncident(null);
      setDefenseStatement('');
      fetchIncidents();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to file defense statement.');
    } finally {
      setIsFilingDefense(false);
    }
  };

  const handleAdjudicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjudicatingIncident || !findingsSummary.trim()) {
      alert('Formal findings summary is mandatory for adjudication ruling.');
      return;
    }

    try {
      setIsAdjudicating(true);
      const api = getApiClient();
      const actionItems = actionItemsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.post(`/incidents/${adjudicatingIncident._id}/adjudicate`, {
        decision: adjudicationDecision,
        penaltyPointsAssigned: Number(penaltyPoints),
        billingChargeAmount: Number(billingCharge),
        grantCodeCharged: grantCodeCharged.trim(),
        actionItemsRequired: actionItems,
        findingsSummary: findingsSummary.trim()
      });

      setAdjudicatingIncident(null);
      setFindingsSummary('');
      fetchIncidents();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit adjudication ruling.');
    } finally {
      setIsAdjudicating(false);
    }
  };

  const renderSeverityBadge = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            CRITICAL SEVERITY
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
            HIGH SEVERITY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            MEDIUM SEVERITY
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            LOW SEVERITY
          </span>
        );
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (activeTab === 'OPEN' && !['OPEN', 'INVESTIGATING'].includes(inc.status)) return false;
    if (activeTab === 'RESOLVED' && !['RESOLVED', 'DISMISSED', 'ADJUDICATED'].includes(inc.status)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const num = inc.incidentNumber || '';
      const desc = inc.description || '';
      return num.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Step 9: Incidents & Disputes
            </span>
            <span className="text-xs text-slate-400">Due Process & Adjudication</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Institutional Dispute & Incident Adjudication Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent incident handling. Accused researchers have 48h to file counter-evidence statements before formal Manager rulings.
          </p>
        </div>

        <button
          onClick={() => fetchIncidents()}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-800 bg-surface-900 hover:bg-surface-800 text-slate-300 transition-colors self-start sm:self-auto"
          title="Refresh Incidents"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          {[
            { id: 'ALL', label: 'All Incident Tickets' },
            { id: 'OPEN', label: 'Active & Under Investigation' },
            { id: 'RESOLVED', label: 'Adjudicated & Resolved' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl font-medium transition-all border ${
                activeTab === tab.id
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : 'bg-surface-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident number..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-surface-900/50 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-xs text-rose-300">
          {error}
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-900/40 border border-slate-800 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-base font-bold text-white">No Active Incident Tickets</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All equipment returns have been clean and within metrological tolerance. Zero outstanding disputes.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredIncidents.map((inc) => {
            const isResolved = ['RESOLVED', 'DISMISSED', 'ADJUDICATED'].includes(inc.status);
            const statement = inc.disputeStatement || inc.disputeDetails;

            return (
              <div
                key={inc._id}
                className="p-6 rounded-2xl bg-surface-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-card-dark space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white px-2.5 py-1 rounded bg-surface-950 border border-slate-800">
                      {inc.incidentNumber || 'INC-2026-0001'}
                    </span>
                    {renderSeverityBadge(inc.severity)}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-300 bg-surface-950 border border-slate-800">
                      {inc.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Status:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded ${
                        isResolved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-200 leading-relaxed font-sans">{inc.description}</p>
                  {inc.repairCostEstimate > 0 && (
                    <div className="flex items-center gap-1.5 font-mono text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Estimated Repair Cost:{' '}
                        <strong className="text-white">${inc.repairCostEstimate.toFixed(2)}</strong>
                      </span>
                    </div>
                  )}
                </div>

                
                {inc.evidencePhotos && inc.evidencePhotos.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-surface-950/80 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-brand-400" />
                      Damage Evidence Photos with Provenance
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {inc.evidencePhotos.map((p, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-surface-900 border border-slate-800 truncate">
                          <span className="text-slate-300 font-semibold">{p.caption || 'Damage Photo'}</span>
                          <p className="font-mono text-[9px] text-slate-500 truncate">SHA-256: {p.sha256Hash}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                
                <div className="p-4 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      Accused Researcher Defense Statement (Due Process)
                    </span>
                    {!isResolved && !statement && (
                      <button
                        onClick={() => setDefendingIncident(inc)}
                        className="text-xs font-bold text-brand-400 hover:text-brand-300 underline"
                      >
                        File Defense Statement
                      </button>
                    )}
                  </div>

                  {statement ? (
                    <p className="text-xs text-slate-300 italic leading-relaxed">
                      "{statement}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      No defense statement has been filed yet by the operator.
                    </p>
                  )}
                </div>

                
                {inc.adjudication ? (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                        <Gavel className="w-3.5 h-3.5" />
                        Formal Manager Adjudication Ruling: {inc.adjudication.decision}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(inc.adjudication.adjudicatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed font-sans">
                      {inc.adjudication.findingsSummary}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-emerald-500/20 font-mono text-[11px]">
                      <span className="text-rose-400">
                        Penalty Points: {inc.adjudication.penaltyPointsAssigned}
                      </span>
                      {inc.adjudication.billingChargeAmount !== undefined && (
                        <span className="text-amber-300">
                          Assessed Charge: ${inc.adjudication.billingChargeAmount.toFixed(2)}
                        </span>
                      )}
                      {inc.adjudication.grantCodeCharged && (
                        <span className="text-slate-400">
                          Charged to Grant: {inc.adjudication.grantCodeCharged}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  canAdjudicate && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setAdjudicatingIncident(inc);
                          setFindingsSummary('');
                        }}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 flex items-center gap-2"
                      >
                        <Gavel className="w-4 h-4" />
                        Adjudicate Dispute
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      
      {defendingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setDefendingIncident(null)} />
          <div className="relative w-full max-w-lg bg-surface-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                Submit Defense & Counter-Evidence Statement
              </h3>
              <button onClick={() => setDefendingIncident(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400">
              Your statement will be permanently entered into the immutable audit record and reviewed by Lab Management before any penalty points or grant chargebacks are assessed.
            </p>

            <form onSubmit={handleFileDefense} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Defense Statement & Chronology *</label>
                <textarea
                  rows={4}
                  required
                  value={defenseStatement}
                  onChange={(e) => setDefenseStatement(e.target.value)}
                  placeholder="Detail why the damage was pre-existing (referencing baseline photo #), or explain operational anomalies outside operator control..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDefendingIncident(null)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFilingDefense}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold disabled:opacity-50"
                >
                  {isFilingDefense ? 'Submitting...' : 'File Official Defense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {adjudicatingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setAdjudicatingIncident(null)} />
          <div className="relative w-full max-w-xl bg-surface-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gavel className="w-4 h-4 text-brand-400" />
                Lab Manager Adjudication Console
              </h3>
              <button onClick={() => setAdjudicatingIncident(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjudicate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Adjudication Ruling Decision *</label>
                <select
                  value={adjudicationDecision}
                  onChange={(e) => setAdjudicationDecision(e.target.value as AdjudicationDecision)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white font-semibold"
                >
                  <option value="USER_LIABLE">USER_LIABLE — Operator solely responsible for damage</option>
                  <option value="SHARED_LIABILITY">SHARED_LIABILITY — Fatigue / joint responsibility</option>
                  <option value="PREEXISTING_FATIGUE">PREEXISTING_FATIGUE — Hardware wear, operator cleared</option>
                  <option value="DISMISSED">DISMISSED — False alarm or baseless report</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Penalty Points Assigned</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={penaltyPoints}
                    onChange={(e) => setPenaltyPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                  />
                  <span className="text-[10px] text-slate-500">Points &gt; 50 locks future reservations</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Assessed Repair Charge ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={billingCharge}
                    onChange={(e) => setBillingCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Grant Code to Charge</label>
                <input
                  type="text"
                  value={grantCodeCharged}
                  onChange={(e) => setGrantCodeCharged(e.target.value.toUpperCase())}
                  placeholder="NSF-DMR-2026-9912"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Mandatory Remediation Action Items</label>
                <textarea
                  rows={2}
                  value={actionItemsText}
                  onChange={(e) => setActionItemsText(e.target.value)}
                  placeholder="Enter required safety retraining modules..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Findings Summary & Technical Justification *</label>
                <textarea
                  rows={3}
                  required
                  value={findingsSummary}
                  onChange={(e) => setFindingsSummary(e.target.value)}
                  placeholder="Summarize evidence analysis, comparison of pre-checkin photos against return state..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjudicatingIncident(null)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjudicating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold disabled:opacity-50"
                >
                  {isAdjudicating ? 'Committing Ruling...' : 'Enact Formal Ruling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
