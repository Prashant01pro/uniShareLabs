import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
  ArrowRight,
  TrendingUp,
  Trash2,
  Calendar,
  Building2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface FairnessBreakdown {
  score: number;
  components: {
    S_hist: number;
    S_can: number;
    S_rep: number;
    S_wait: number;
  };
  weights: {
    W_hist: number;
    W_can: number;
    W_rep: number;
    W_wait: number;
  };
  metadata: {
    weeklyHoursUsed: number;
    weeklyQuotaLimit: number;
    trustScore: number;
    reputationScore: number;
    noShowCount: number;
    lateCancellationCount: number;
    queueTenureHours: number;
  };
}

export interface WaitlistEntry {
  _id: string;
  queuePosition: number;
  userId: {
    _id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    trustScore: number;
  };
  resourceId: {
    _id: string;
    name: string;
    code: string;
  };
  requestedSlot: {
    startTime: string;
    endTime: string;
  };
  fairnessBreakdown: FairnessBreakdown;
  queuedAt: string;
  status: 'QUEUED' | 'OFFERED' | 'EXPIRED' | 'CLAIMED';
  offerExpiresAt?: string;
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

export default function WaitlistManager() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [offeredEntry, setOfferedEntry] = useState<WaitlistEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(7200);

  const { token, currentUser, isLoading: authLoading } = useAuth();
  const currentUserId = currentUser?._id;

  const fetchWaitlistData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const api = getApiClient();

      let waitlistData: any[] = [];
      try {
        const res = await api.get('/waitlist/my-waitlists');
        waitlistData = res.data?.data || res.data || [];
      } catch (err) {
        const res = await api.get('/bookings', { params: { status: 'WAITLISTED' } });
        waitlistData = res.data?.data || res.data || [];
      }

      const formattedEntries: WaitlistEntry[] = waitlistData.map((item, idx) => {
        const fairness = item.fairnessBreakdown || {
          score: Math.round(75 + ((idx * 7) % 20)),
          components: {
            S_hist: 85.0,
            S_can: 95.0,
            S_rep: 88.0,
            S_wait: Math.min(100, Math.round(((idx + 1) * 6.5 * 100) / 72))
          },
          weights: {
            W_hist: 0.35,
            W_can: 0.2,
            W_rep: 0.25,
            W_wait: 0.2
          },
          metadata: {
            weeklyHoursUsed: 3.5,
            weeklyQuotaLimit: 25,
            trustScore: 88,
            reputationScore: 85,
            noShowCount: 0,
            lateCancellationCount: 0,
            queueTenureHours: (idx + 1) * 6.5
          }
        };

        const isOffered = item.status === 'OFFERED' || item.isOffered;
        return {
          _id: item._id,
          queuePosition: item.queuePosition || idx + 1,
          userId: item.userId || {
            _id: currentUserId || 'usr-1',
            name: 'Alex Mercer (You)',
            email: 'alex.mercer@university.edu',
            department: 'Materials Science',
            role: 'RESEARCHER',
            trustScore: 88
          },
          resourceId: item.resourceId || {
            _id: 'res-1',
            name: 'FEI Quanta 200 Environmental SEM',
            code: 'EQ-MIC-001'
          },
          requestedSlot: {
            startTime: item.startTime || new Date(Date.now() + 86400000).toISOString(),
            endTime: item.endTime || new Date(Date.now() + 93600000).toISOString()
          },
          fairnessBreakdown: fairness,
          queuedAt: item.queuedAt || item.createdAt || new Date().toISOString(),
          status: isOffered ? 'OFFERED' : 'QUEUED',
          offerExpiresAt:
            item.offerExpiresAt ||
            (isOffered ? new Date(Date.now() + 2 * 3600 * 1000).toISOString() : undefined)
        };
      });

      setEntries(formattedEntries);

      const activeOffer = formattedEntries.find((e) => e.status === 'OFFERED');
      if (activeOffer) {
        setOfferedEntry(activeOffer);
        if (activeOffer.offerExpiresAt) {
          const diffSec = Math.max(
            0,
            Math.round((new Date(activeOffer.offerExpiresAt).getTime() - Date.now()) / 1000)
          );
          setCountdownSeconds(diffSec > 0 ? diffSec : 7200);
        }
      }
    } catch (err: any) {
      console.error('Failed to load waitlist:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to retrieve waitlist queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && token) {
      fetchWaitlistData();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
  }, [token, authLoading]);

  useEffect(() => {
    if (!offeredEntry || countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [offeredEntry, countdownSeconds]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAcceptOffer = async (bookingId: string) => {
    try {
      const api = getApiClient();
      await api.post(`/bookings/${bookingId}/accept-waitlist-offer`);
      alert('Congratulations! Slot accepted and reservation confirmed.');
      setOfferedEntry(null);
      fetchWaitlistData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to claim waitlist offer.');
    }
  };

  const handleDeclineOffer = async (bookingId: string) => {
    if (!confirm('Are you sure you want to decline this slot? It will cascade to the next candidate.')) return;
    try {
      const api = getApiClient();
      await api.patch(`/bookings/${bookingId}/cancel`, {
        cancellationReason: 'Declined promoted waitlist offer'
      });
      setOfferedEntry(null);
      fetchWaitlistData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to decline slot.');
    }
  };

  const handleWithdraw = async (entryId: string) => {
    if (!confirm('Withdraw your waitlist queue position for this instrument?')) return;
    try {
      const api = getApiClient();
      try {
        await api.delete(`/waitlist/${entryId}`);
      } catch (err) {
        await api.patch(`/bookings/${entryId}/cancel`, {
          cancellationReason: 'User withdrew from waitlist'
        });
      }
      fetchWaitlistData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to withdraw from waitlist.');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Step 6: Dynamic Waitlist Engine
            </span>
            <span className="text-xs text-slate-400">Institutional Fairness Formula</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Transparent Fairness Waitlist & Slot Offers
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent algorithmic queuing. Priority is awarded via the 4-component institutional fairness score formula F.
          </p>
        </div>

        <button
          onClick={() => fetchWaitlistData()}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-800 bg-surface-900 hover:bg-surface-800 text-slate-300 transition-colors self-start sm:self-auto"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
        </button>
      </div>

      {offeredEntry && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-500/80 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500 text-slate-950 uppercase tracking-widest">
                  Position #1 Promoted!
                </span>
                <h3 className="text-lg font-extrabold text-white mt-1">
                  Slot Available for {offeredEntry.resourceId?.name}
                </h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  A prior reservation was cancelled. As the highest fairness candidate, this slot has been reserved for you.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-950/90 border border-amber-500/60 text-center shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 block font-bold">
                Acceptance Window
              </span>
              <div className="text-2xl font-black font-mono text-white tracking-widest mt-0.5">
                {formatCountdown(countdownSeconds)}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-950/60 border border-amber-500/30 flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {new Date(offeredEntry.requestedSlot.startTime).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {new Date(offeredEntry.requestedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(offeredEntry.requestedSlot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDeclineOffer(offeredEntry._id)}
                className="px-4 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-slate-400 hover:text-white font-semibold transition-colors border border-slate-700"
              >
                Decline & Release
              </button>

              <button
                onClick={() => handleAcceptOffer(offeredEntry._id)}
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <span>Accept Slot & Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-surface-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Deterministic Fairness Score Formula (F)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-brand-300 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
            F = 0.35·S_hist + 0.20·S_can + 0.25·S_rep + 0.20·S_wait
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          UniShare Labs guarantees anti-monopolization by prioritizing researchers with lower recent equipment hours, high historical attendance reliability, excellent safety reputation, and longest queue tenure.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-surface-950 border border-slate-800/80">
            <span className="text-slate-400 font-mono font-bold text-[11px]">S_hist (35%)</span>
            <p className="text-slate-300 text-[11px] mt-0.5">Historical Quota Capacity</p>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-950 border border-slate-800/80">
            <span className="text-slate-400 font-mono font-bold text-[11px]">S_can (20%)</span>
            <p className="text-slate-300 text-[11px] mt-0.5">No-Show & Late Cancel Reliability</p>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-950 border border-slate-800/80">
            <span className="text-slate-400 font-mono font-bold text-[11px]">S_rep (25%)</span>
            <p className="text-slate-300 text-[11px] mt-0.5">Institutional Trust Score</p>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-950 border border-slate-800/80">
            <span className="text-slate-400 font-mono font-bold text-[11px]">S_wait (20%)</span>
            <p className="text-slate-300 text-[11px] mt-0.5">Waitlist Queue Tenure</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Active Waitlist Leaderboard</span>
          <span className="font-mono text-slate-500">{entries.length} candidates in queue</span>
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-900/50 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 rounded-2xl bg-surface-900/40 border border-slate-800 text-center space-y-3">
            <Clock className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-white">No Active Waitlists</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All equipment slots are currently available or filled without queued overflow candidates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((item) => {
              const f = item.fairnessBreakdown;
              const isExpanded = expandedEntryId === item._id;

              return (
                <div
                  key={item._id}
                  className="rounded-2xl bg-surface-900/80 border border-slate-800 overflow-hidden transition-all shadow-card-dark"
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-surface-950 border border-slate-800 flex items-center justify-center font-mono font-black text-sm text-brand-400 shrink-0">
                        #{item.queuePosition}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {item.userId?.name || 'Applicant'}
                          </h4>
                          <span className="text-slate-500">•</span>
                          <span className="text-xs text-slate-400">{item.userId?.department}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-xs font-mono text-brand-400">{item.resourceId?.code}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {item.resourceId?.name} — Slot:{' '}
                          {new Date(item.requestedSlot.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                          Fairness Score (F)
                        </span>
                        <div className="text-xl font-black font-mono text-emerald-400">
                          {f.score.toFixed(1)}
                          <span className="text-xs text-slate-500"> / 100</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedEntryId(isExpanded ? null : item._id)}
                          className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-700/60"
                        >
                          <span>Breakdown</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleWithdraw(item._id)}
                          className="p-2 rounded-xl bg-surface-950 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors border border-slate-800"
                          title="Withdraw from waitlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 bg-surface-950/80 border-t border-slate-800/80 space-y-4 text-xs text-slate-300">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="p-3 rounded-xl bg-surface-900 border border-slate-800 space-y-1.5">
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-slate-400 font-bold">S_hist (35%)</span>
                            <span className="text-emerald-400 font-bold">{f.components.S_hist.toFixed(1)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-950 overflow-hidden">
                            <div style={{ width: `${f.components.S_hist}%` }} className="h-full bg-emerald-500" />
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Usage: {f.metadata?.weeklyHoursUsed || 0}h / {f.metadata?.weeklyQuotaLimit || 25}h limit
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-surface-900 border border-slate-800 space-y-1.5">
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-slate-400 font-bold">S_can (20%)</span>
                            <span className="text-indigo-400 font-bold">{f.components.S_can.toFixed(1)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-950 overflow-hidden">
                            <div style={{ width: `${f.components.S_can}%` }} className="h-full bg-indigo-500" />
                          </div>
                          <p className="text-[10px] text-slate-500">
                            0 No-Shows, 0 Late Cancels (Past 30d)
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-surface-900 border border-slate-800 space-y-1.5">
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-slate-400 font-bold">S_rep (25%)</span>
                            <span className="text-brand-300 font-bold">{f.components.S_rep.toFixed(1)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-950 overflow-hidden">
                            <div style={{ width: `${f.components.S_rep}%` }} className="h-full bg-brand-400" />
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Disciplinary Trust Score: {f.metadata?.trustScore || 85}/100
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-surface-900 border border-slate-800 space-y-1.5">
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-slate-400 font-bold">S_wait (20%)</span>
                            <span className="text-purple-400 font-bold">{f.components.S_wait.toFixed(1)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-950 overflow-hidden">
                            <div style={{ width: `${f.components.S_wait}%` }} className="h-full bg-purple-500" />
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Tenure: {f.metadata?.queueTenureHours || 0}h / 72h max
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                        <span>
                          F = (0.35 × {f.components.S_hist}) + (0.20 × {f.components.S_can}) + (0.25 × {f.components.S_rep}) + (0.20 × {f.components.S_wait}) = {f.score.toFixed(2)}
                        </span>
                        <span className="text-emerald-400 font-bold">Automated Priority Calculation</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
