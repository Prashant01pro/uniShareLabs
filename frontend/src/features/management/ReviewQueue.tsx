import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Building2,
  Calendar,
  FileText,
  UserPlus,
  RefreshCw,
  Search,
  Sparkles,
  Award,
  ChevronRight,
  Send,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface PendingReviewBooking {
  _id: string;
  resourceId: {
    _id: string;
    name: string;
    code: string;
    department: string;
    labLocation?: string;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    trustScore: number;
    reputationScore?: number;
    activePenaltyPoints?: number;
  };
  startTime: string;
  endTime: string;
  durationMinutes: number;
  projectGrantCode?: string;
  supervisorEmail?: string;
  supervisorEndorsed?: boolean;
  intendedPurpose?: string;
  status: string;
  createdAt: string;
  slaDeadline?: string;
  slaUrgent?: boolean;
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

const REJECTION_REASONS = [
  { code: 'EQUIPMENT_MAINTENANCE_OVERRIDE', label: 'Unscheduled Maintenance & Calibration Window' },
  { code: 'UNQUALIFIED_PROJECT_SCOPE', label: 'Incompatible Specimen / Chemical Protocol' },
  { code: 'INSUFFICIENT_SAFETY_MEASURES', label: 'Secondary Containment or PPE Protocol Missing' },
  { code: 'GRANT_ACCOUNT_EXHAUSTED', label: 'Invalid or Exhausted Grant Billing Code' },
  { code: 'SUPERVISOR_DENIED', label: 'Principal Investigator Disapproval' },
  { code: 'OTHER', label: 'Other Operational Discretion' }
];

export default function ReviewQueue() {
  const { token, activeRole, switchPersona, isLoading: authLoading } = useAuth();
  const [queue, setQueue] = useState<PendingReviewBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [approvingBooking, setApprovingBooking] = useState<PendingReviewBooking | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const [rejectingBooking, setRejectingBooking] = useState<PendingReviewBooking | null>(null);
  const [rejectionCode, setRejectionCode] = useState(REJECTION_REASONS[0].code);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [delegatingBooking, setDelegatingBooking] = useState<PendingReviewBooking | null>(null);
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegateNote, setDelegateNote] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);

  const fetchReviewQueue = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const api = getApiClient();
      let res;
      try {
        res = await api.get('/bookings/review-queue');
      } catch (err: any) {
        if (err?.response?.status === 403) {
          setError('Review Queue requires Lab Manager, Resource Owner, or Admin role permissions.');
          return;
        }
        res = await api.get('/bookings', { params: { status: 'PENDING_REVIEW' } });
      }

      const data = res.data?.data || res.data || [];
      setQueue(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError('Authentication session expired or unauthorized. Please sign in or switch persona.');
      } else if (err?.response?.status === 403) {
        setError('Review Queue requires Lab Manager, Resource Owner, or Admin role permissions.');
      } else {
        console.error('Failed to load review queue:', err);
        setError(err?.response?.data?.message || err.message || 'Unable to retrieve pending review queue.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && token) {
      fetchReviewQueue();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
    const interval = setInterval(() => {
      if (token) fetchReviewQueue();
    }, 30000);
    return () => clearInterval(interval);
  }, [token, authLoading, activeRole]);

  const calculateSLA = (createdAt: string) => {
    const createdMs = new Date(createdAt).getTime();
    const nowMs = Date.now();
    const slaTotalHours = 48;
    const elapsedHours = (nowMs - createdMs) / (1000 * 60 * 60);
    const remainingHours = Number(Math.max(0, slaTotalHours - elapsedHours).toFixed(1));

    if (remainingHours <= 0) {
      return { status: 'BREACHED', label: 'SLA BREACHED', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    }
    if (remainingHours < 4) {
      return {
        status: 'URGENT',
        label: `${remainingHours}h remaining (CRITICAL)`,
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse'
      };
    }
    if (remainingHours <= 12) {
      return {
        status: 'WARNING',
        label: `${remainingHours}h remaining`,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      };
    }
    return {
      status: 'ON_TRACK',
      label: `${remainingHours}h remaining`,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    };
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingBooking) return;
    try {
      setIsApproving(true);
      const api = getApiClient();
      await api.post(`/bookings/${approvingBooking._id}/approve`, {
        approvalNotes: approvalNotes.trim() || 'Safety protocol verified and research purpose endorsed.'
      });
      setApprovingBooking(null);
      setApprovalNotes('');
      fetchReviewQueue();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve booking request.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking) return;
    try {
      setIsRejecting(true);
      const api = getApiClient();
      await api.post(`/bookings/${rejectingBooking._id}/reject`, {
        reasonCode: rejectionCode,
        rejectionMessage: rejectionMessage.trim() || 'Request rejected per laboratory safety protocol.'
      });
      setRejectingBooking(null);
      setRejectionMessage('');
      fetchReviewQueue();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reject booking request.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegatingBooking || !delegateEmail.trim()) return;
    try {
      setIsDelegating(true);
      const api = getApiClient();
      await api.post(`/bookings/${delegatingBooking._id}/delegate`, {
        delegateUserId: delegateEmail.trim(),
        note: delegateNote.trim() || 'Please review experimental envelope and calibration.'
      });
      setDelegatingBooking(null);
      setDelegateEmail('');
      setDelegateNote('');
      fetchReviewQueue();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delegate review ticket.');
    } finally {
      setIsDelegating(false);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const applicant = item.userId?.name || '';
    const email = item.userId?.email || '';
    const resName = item.resourceId?.name || '';
    const grant = item.projectGrantCode || '';
    return (
      applicant.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      resName.toLowerCase().includes(q) ||
      grant.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Step 5: Review Queue
            </span>
            <span className="text-xs text-slate-400">Institutional Custody Control</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Manager Review & Adjudication Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Adjudicate equipment reservation applications with 48h SLA tracking, applicant trust scores, and 1-click approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchReviewQueue()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-800 bg-surface-900 hover:bg-surface-800 text-slate-300 transition-colors"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {['STUDENT', 'RESEARCHER'].includes(activeRole) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="text-amber-200 text-sm font-semibold">Manager Review Permissions Required</p>
              <p className="text-amber-300/70 text-xs">
                You are currently signed in as <strong className="text-amber-200">{activeRole}</strong>. The review queue requires Lab Manager, Resource Owner, or Admin credentials to inspect and approve bookings.
              </p>
            </div>
          </div>
          <button
            onClick={() => switchPersona('LAB_MANAGER')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            Switch to Lab Manager (Dr. Sarah Jenkins)
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface-900/60 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400">Pending Reviews</span>
            <p className="text-2xl font-black text-white font-mono">{queue.length}</p>
          </div>
          <Clock className="w-8 h-8 text-amber-400/30" />
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400">48h SLA Adherence</span>
            <p className="text-2xl font-black text-emerald-400 font-mono">100%</p>
          </div>
          <ShieldCheck className="w-8 h-8 text-emerald-400/30" />
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400">Average Turnaround</span>
            <p className="text-2xl font-black text-brand-300 font-mono">4.2h</p>
          </div>
          <Sparkles className="w-8 h-8 text-brand-400/30" />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter queue by applicant name, email, equipment code, or grant code..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {!token ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <Layers className="w-10 h-10 text-amber-400 mx-auto" />
          <h4 className="text-lg font-bold text-white">Manager Authentication Required</h4>
          <p className="text-xs text-slate-400">
            Sign in as Lab Manager or Resource Owner to adjudicate pending equipment reservations.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl text-xs transition"
            >
              Sign In
            </Link>
            <button
              onClick={() => switchPersona('LAB_MANAGER')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-xs transition"
            >
              1-Click Fast Pass (Lab Manager)
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-surface-900/50 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-xs text-rose-300">
          {error}
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-900/40 border border-slate-800 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-base font-bold text-white">Review Queue All Clear!</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Zero pending equipment reservation tickets require your review. All applicant dossiers are up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQueue.map((item) => {
            const sla = calculateSLA(item.createdAt);
            const user = item.userId;
            const res = item.resourceId;
            const startDate = new Date(item.startTime);
            const endDate = new Date(item.endTime);
            const trustScore = user?.trustScore ?? 85;

            const isVip = trustScore >= 85;
            const isProbation = trustScore < 65;

            return (
              <div
                key={item._id}
                className="p-6 rounded-2xl bg-surface-900/90 border border-slate-800/80 hover:border-slate-700 transition-all shadow-card-dark flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${sla.color}`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      SLA: {sla.label}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                        isVip
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isProbation
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      Trust Score: {trustScore}/100 {isVip ? '(VIP Tier)' : ''}
                    </span>

                    {item.projectGrantCode && (
                      <span className="px-2.5 py-1 rounded text-xs font-mono bg-surface-950 text-slate-300 border border-slate-800">
                        Grant: {item.projectGrantCode}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                        Researcher Dossier
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        {user?.name || 'Applicant Researcher'}
                      </h4>
                      <p className="text-slate-400 mt-0.5">
                        {user?.email} • {user?.department || 'Department'} ({user?.role || 'STUDENT'})
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                        Requested Instrument
                      </span>
                      <h4 className="text-sm font-bold text-brand-300 mt-0.5">
                        {res?.name || 'Scientific Instrument'} ({res?.code || 'EQ'})
                      </h4>
                      <p className="text-slate-400 mt-0.5">
                        {startDate.toLocaleDateString()} · {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.durationMinutes}m)
                      </p>
                    </div>
                  </div>

                  {item.intendedPurpose && (
                    <div className="p-3.5 rounded-xl bg-surface-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        Scientific Purpose & Protocol Statement:
                      </span>
                      <p className="leading-relaxed italic">"{item.intendedPurpose}"</p>
                    </div>
                  )}

                  {item.supervisorEmail && (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Supervisor: <span className="text-slate-300">{item.supervisorEmail}</span> (
                        {item.supervisorEndorsed ? 'Endorsed' : 'Pending Sign-off'})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
                  <button
                    onClick={() => setApprovingBooking(item)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Reservation
                  </button>

                  <button
                    onClick={() => setRejectingBooking(item)}
                    className="px-5 py-2.5 rounded-xl bg-surface-950 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Ticket
                  </button>

                  <button
                    onClick={() => setDelegatingBooking(item)}
                    className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Delegate Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {approvingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setApprovingBooking(null)} />
          <div className="relative w-full max-w-md bg-surface-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Approve Equipment Reservation
              </h3>
              <button onClick={() => setApprovingBooking(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400">
              Approving will schedule digital lockbox PIN release for{' '}
              <strong className="text-white">{approvingBooking.userId?.name}</strong> and emit real-time WebSocket notifications.
            </p>

            <form onSubmit={handleApprove} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Reviewer Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Safety protocol verified; user trained on secondary vacuum interlocks."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  {isApproving ? 'Approving...' : 'Confirm 1-Click Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setRejectingBooking(null)} />
          <div className="relative w-full max-w-md bg-surface-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                Reject Reservation Application
              </h3>
              <button onClick={() => setRejectingBooking(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Structured Rejection Reason Code *</label>
                <select
                  value={rejectionCode}
                  onChange={(e) => setRejectionCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Explanatory Guidance for Applicant *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                  placeholder="Explain required remediation, safety containment steps, or alternative instruments..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
                >
                  {isRejecting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {delegatingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setDelegatingBooking(null)} />
          <div className="relative w-full max-w-md bg-surface-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-400" />
                Delegate Review Ticket
              </h3>
              <button onClick={() => setDelegatingBooking(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDelegate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Delegate Technician or Co-Manager Email *</label>
                <input
                  type="email"
                  required
                  value={delegateEmail}
                  onChange={(e) => setDelegateEmail(e.target.value)}
                  placeholder="tech@university.edu"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Review Instructions</label>
                <textarea
                  rows={2}
                  value={delegateNote}
                  onChange={(e) => setDelegateNote(e.target.value)}
                  placeholder="Please double check cryogenic flow rate and sample thickness..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDelegatingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDelegating}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold disabled:opacity-50"
                >
                  {isDelegating ? 'Delegating...' : 'Delegate Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
