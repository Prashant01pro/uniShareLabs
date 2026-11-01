import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  ShieldAlert,
  Hash,
  Database,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Cpu,
  DollarSign,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface AuditLogEvent {
  _id: string;
  sequenceNumber: number;
  eventId: string;
  timestamp: string;
  action: string;
  actorId: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  fromState?: string;
  toState?: string;
  payloadHash: string;
  previousHash: string;
  currentHash?: string;
  hash?: string;
  metadata?: Record<string, any>;
}

export interface ChainVerificationResult {
  verified: boolean;
  totalRecordsVerified: number;
  lastBlockHash?: string;
  genesisHash?: string;
  tamperedSequence?: number;
  expectedHash?: string;
  foundHash?: string;
  reason?: string;
}

export interface UtilizationAnalytics {
  totalSessions: number;
  totalMachineHours: number;
  averageSessionHours: number;
  uptimePercentage: number;
  incidentsReported: number;
}

export interface GrantChargeback {
  grantCode: string;
  totalHours: number;
  totalCost: number;
  bookingsCount: number;
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

export default function AuditLedgerView() {
  const [logs, setLogs] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ChainVerificationResult | null>(null);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  const [utilization, setUtilization] = useState<UtilizationAnalytics | null>(null);
  const [chargebacks, setChargebacks] = useState<GrantChargeback[]>([]);

  const { token, isLoading: authLoading } = useAuth();

  const fetchLedger = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const api = getApiClient();

      const params: Record<string, any> = { limit: 50 };
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (entityFilter !== 'ALL') params.entityType = entityFilter;

      const res = await api.get('/audit/ledger', { params });
      const data = res.data?.events || res.data?.data || res.data || [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError('Authentication required to inspect cryptographic audit ledger.');
      } else {
        console.error('Failed to load audit ledger:', err);
        setError(err?.response?.data?.message || err.message || 'Unable to load audit logs.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      const api = getApiClient();
      const [uRes, cRes] = await Promise.allSettled([
        api.get('/audit/analytics/utilization'),
        api.get('/audit/analytics/chargebacks')
      ]);

      if (uRes.status === 'fulfilled') {
        setUtilization(uRes.value.data);
      }
      if (cRes.status === 'fulfilled') {
        setChargebacks(cRes.value.data?.grants || []);
      }
    } catch (err) {
      console.warn('Analytics endpoints optional, skipping.');
    }
  };

  useEffect(() => {
    if (!authLoading && token) {
      fetchLedger();
      fetchAnalytics();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
  }, [token, authLoading, actionFilter, entityFilter]);

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const api = getApiClient();
      const res = await api.get('/audit/verify-chain');
      setVerificationResult(res.data);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setVerificationResult(err.response.data);
      } else {
        alert(err?.response?.data?.message || 'Verification endpoint call failed.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyHash = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const action = log.action || '';
    const actor = log.actorId || '';
    const entity = log.entityId || '';
    const pHash = log.payloadHash || '';
    return (
      action.toLowerCase().includes(q) ||
      actor.toLowerCase().includes(q) ||
      entity.toLowerCase().includes(q) ||
      pHash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Step 10: Cryptographic Audit Ledger
            </span>
            <span className="text-xs text-slate-400">Append-Only SHA-256 Chain</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Tamper-Evident SHA-256 Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Immutable hash-chained event ledger logging every booking state transition, check-in meter reading, return inspection, and adjudication ruling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLedger()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-800 bg-surface-900 hover:bg-surface-800 text-slate-300 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>

          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Recomputing Hashes...' : 'Verify Cryptographic Continuity'}</span>
          </button>
        </div>
      </div>

      {verificationResult && (
        <div
          className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            verificationResult.verified
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl ${
                verificationResult.verified
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {verificationResult.verified ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest block">
                {verificationResult.verified
                  ? '✓ CRYPTOGRAPHIC CONTINUITY VERIFIED'
                  : '⚠️ HASH CHAIN INTEGRITY VIOLATION DETECTED'}
              </span>
              <h4 className="text-sm font-bold text-white">
                {verificationResult.verified
                  ? `SHA-256 Hash Chain continuous across ${verificationResult.totalRecordsVerified} blocks from Genesis tip.`
                  : `Tampering detected at sequence #${verificationResult.tamperedSequence}: ${verificationResult.reason}`}
              </h4>
              <p className="text-xs font-mono opacity-80 truncate max-w-xl">
                Tip Block Hash: {verificationResult.lastBlockHash || 'verified tip hash'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-surface-950 border border-slate-800">
              {verificationResult.totalRecordsVerified} Blocks Verified
            </span>
          </div>
        </div>
      )}

      {utilization && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Activity className="w-3.5 h-3.5 text-brand-400" />
              <span>Machine Uptime</span>
            </div>
            <p className="text-2xl font-black text-white font-mono">{utilization.uptimePercentage}%</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Total Machine Hours</span>
            </div>
            <p className="text-2xl font-black text-white font-mono">{utilization.totalMachineHours}h</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Completed Sessions</span>
            </div>
            <p className="text-2xl font-black text-white font-mono">{utilization.totalSessions}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Flagged Incidents</span>
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono">{utilization.incidentsReported}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono text-xs focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Actions</option>
            <option value="BOOKING_CREATED">BOOKING_CREATED</option>
            <option value="BOOKING_APPROVED">BOOKING_APPROVED</option>
            <option value="BOOKING_CHECKED_IN">BOOKING_CHECKED_IN</option>
            <option value="BOOKING_RETURNED">BOOKING_RETURNED</option>
            <option value="INCIDENT_ADJUDICATED">INCIDENT_ADJUDICATED</option>
            <option value="WAITLIST_PROMOTED">WAITLIST_PROMOTED</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono text-xs focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Entity Types</option>
            <option value="BOOKING">BOOKING</option>
            <option value="RESOURCE">RESOURCE</option>
            <option value="INCIDENT">INCIDENT</option>
            <option value="USER">USER</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor ID, or hash..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-900/50 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-xs text-rose-300">
          {error}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-900/40 border border-slate-800 text-center space-y-3">
          <Database className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">No Ledger Blocks Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No audit ledger entries match your current search filters.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 overflow-hidden bg-surface-900/90 shadow-card-dark">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                  <th className="py-3 px-4">Seq #</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action & State</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Payload Hash (H_payload)</th>
                  <th className="py-3 px-4">Current Block Hash (H_n)</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 text-[11px]">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log._id;
                  const currentHash = log.currentHash || log.hash || 'hash';
                  const truncPayload = log.payloadHash ? `${log.payloadHash.substring(0, 10)}...` : 'n/a';
                  const truncCurrent = currentHash ? `${currentHash.substring(0, 10)}...` : 'n/a';

                  return (
                    <React.Fragment key={log._id}>
                      <tr className="hover:bg-surface-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-brand-300">
                          #{log.sequenceNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[10px]">
                          {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{log.action}</span>
                          {log.fromState && log.toState && (
                            <span className="text-[10px] text-slate-500">
                              {log.fromState} → {log.toState}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-200 block truncate max-w-[100px]">{log.actorId}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-950 text-slate-400 border border-slate-800">
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-300 font-semibold">{log.entityType}</span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[90px]">{log.entityId}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span title={log.payloadHash}>{truncPayload}</span>
                            <button
                              onClick={() => handleCopyHash(log.payloadHash, `p-${log._id}`)}
                              className="text-slate-600 hover:text-slate-300"
                            >
                              {copiedHashId === `p-${log._id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-emerald-400">
                          <div className="flex items-center gap-1.5">
                            <span title={currentHash}>{truncCurrent}</span>
                            <button
                              onClick={() => handleCopyHash(currentHash, `c-${log._id}`)}
                              className="text-slate-600 hover:text-slate-300"
                            >
                              {copiedHashId === `c-${log._id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                            className="p-1 rounded hover:bg-surface-800 text-slate-400 hover:text-white"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-surface-950/90 border-b border-slate-800">
                          <td colSpan={8} className="p-4 space-y-3 font-mono text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                  H_{'{n-1}'} Preceding Hash:
                                </span>
                                <p className="text-slate-400 break-all text-[11px]">{log.previousHash}</p>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                  H_n Current Hash:
                                </span>
                                <p className="text-emerald-400 break-all text-[11px]">{currentHash}</p>
                              </div>
                            </div>

                            <div className="space-y-1 pt-2 border-t border-slate-800">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                Canonical JSON Payload Metadata:
                              </span>
                              <pre className="p-3 rounded-xl bg-surface-900 border border-slate-800 text-slate-300 text-[11px] overflow-x-auto">
                                {JSON.stringify(log.metadata || {}, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
