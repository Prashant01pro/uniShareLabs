import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  LogIn,
  LogOut,
  Ban,
  FileQuestion,
  Eye,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  Layers,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CheckInModal from '../handover/CheckInModal';
import ReturnModal from '../handover/ReturnModal';
import ConditionDiffViewer from '../handover/ConditionDiffViewer';

export type BookingStatus =
  | 'DRAFT'
  | 'SYSTEM_VERIFYING'
  | 'VERIFIED'
  | 'APPROVED'
  | 'PENDING_REVIEW'
  | 'AWAITING_APPROVAL'
  | 'CHECKED_IN'
  | 'IN_USE'
  | 'RETURNED'
  | 'COMPLETED'
  | 'IN_DISPUTE'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'WAITLISTED'
  | 'OFFERED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'REJECTED';

export interface IBooking {
  _id: string;
  bookingId?: string;
  resourceId: any;
  userId: any;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: BookingStatus;
  projectGrantCode?: string;
  supervisorEmail?: string;
  supervisorEndorsed?: boolean;
  intendedPurpose?: string;
  accessPin?: string;
  checkInTime?: string;
  returnTime?: string;
  cancellationReason?: string;
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

interface BookingsListProps {
  onCheckInRequested?: (booking: IBooking) => void;
  onReturnRequested?: (booking: IBooking) => void;
  onDisputeRequested?: (booking: IBooking) => void;
}

export default function BookingsList({
  onCheckInRequested,
  onReturnRequested,
  onDisputeRequested
}: BookingsListProps) {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [checkInBooking, setCheckInBooking] = useState<IBooking | null>(null);
  const [returnBooking, setReturnBooking] = useState<IBooking | null>(null);
  const [diffBookingId, setDiffBookingId] = useState<string | null>(null);

  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);

  const [cancellingBooking, setCancellingBooking] = useState<IBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [disputingBooking, setDisputingBooking] = useState<IBooking | null>(null);
  const [disputeCategory, setDisputeCategory] = useState('EQUIPMENT_DAMAGE');
  const [disputeSeverity, setDisputeSeverity] = useState('HIGH');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputePhotoUrl, setDisputePhotoUrl] = useState('');
  const [isFilingDispute, setIsFilingDispute] = useState(false);

  const { token, switchPersona, isLoading: authLoading } = useAuth();

  const fetchBookings = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const api = getApiClient();
      const res = await api.get('/bookings');
      const data = res.data?.data || res.data || [];
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError('Authentication session expired or unauthorized. Please sign in or switch persona.');
      } else {
        console.error('Failed to load bookings:', err);
        setError(err?.response?.data?.message || err.message || 'Unable to retrieve reservations list.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && token) {
      fetchBookings();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
  }, [token, authLoading]);

  const togglePinReveal = (bookingId: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };

  const copyPin = (bookingId: string, pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPinId(bookingId);
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking) return;
    try {
      setIsCancelling(true);
      const api = getApiClient();
      await api.patch(`/bookings/${cancellingBooking._id}/cancel`, {
        cancellationReason: cancelReason.trim() || 'User requested session cancellation'
      });
      setCancellingBooking(null);
      setCancelReason('');
      fetchBookings();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel reservation.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAcceptWaitlistOffer = async (bookingId: string) => {
    try {
      const api = getApiClient();
      await api.post(`/bookings/${bookingId}/accept-waitlist-offer`);
      fetchBookings();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to claim waitlist offer. Window may have expired.');
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingBooking) return;
    try {
      setIsFilingDispute(true);
      const api = getApiClient();
      await api.post('/incidents', {
        bookingId: disputingBooking._id,
        category: disputeCategory,
        severity: disputeSeverity,
        description: disputeDescription.trim(),
        evidencePhotos: disputePhotoUrl.trim()
          ? [
              {
                photoUrl: disputePhotoUrl.trim(),
                sha256Hash: crypto.randomUUID().replace(/-/g, '') + 'abcdef'
              }
            ]
          : []
      });
      setDisputingBooking(null);
      setDisputeDescription('');
      setDisputePhotoUrl('');
      fetchBookings();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to file incident report.');
    } finally {
      setIsFilingDispute(false);
    }
  };

  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved & Scheduled
          </span>
        );
      case 'CHECKED_IN':
      case 'IN_USE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Session In Progress
          </span>
        );
      case 'PENDING_REVIEW':
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Completed
          </span>
        );
      case 'IN_DISPUTE':
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            In Dispute
          </span>
        );
      case 'WAITLISTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Clock className="w-3.5 h-3.5" />
            Waitlisted
          </span>
        );
      case 'OFFERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Slot Offered! (2h window)
          </span>
        );
      case 'CANCELLED':
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-500 border border-slate-700">
            <XCircle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/40 text-rose-400 border border-rose-800/60">
            <Ban className="w-3.5 h-3.5" />
            No-Show Violation (-20 Trust)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-400 bg-surface-950 border border-slate-800">
            {status}
          </span>
        );
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ACTIVE') {
      if (!['APPROVED', 'CHECKED_IN', 'IN_USE'].includes(b.status)) return false;
    } else if (activeTab === 'PENDING') {
      if (!['PENDING_REVIEW', 'AWAITING_APPROVAL', 'SYSTEM_VERIFYING'].includes(b.status)) return false;
    } else if (activeTab === 'COMPLETED') {
      if (!['COMPLETED', 'RESOLVED'].includes(b.status)) return false;
    } else if (activeTab === 'DISPUTED') {
      if (!['IN_DISPUTE', 'DISPUTED'].includes(b.status)) return false;
    } else if (activeTab === 'WAITLIST') {
      if (!['WAITLISTED', 'OFFERED'].includes(b.status)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const resName = typeof b.resourceId === 'object' ? (b.resourceId?.name || b.resourceId?.title || '') : '';
      const grant = b.projectGrantCode || '';
      return resName.toLowerCase().includes(q) || grant.toLowerCase().includes(q) || b.status.toLowerCase().includes(q);
    }

    return true;
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Institutional Stewardship
            </span>
            <span className="text-xs text-slate-400">Step 3 - Step 8 Dashboard</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Reservations & Custody Sessions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your instrument bookings, reveal digital access PINs, perform Step 7 Check-in and Step 8 Return handovers.
          </p>
        </div>

        <button
          onClick={() => fetchBookings()}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-800 bg-surface-900 hover:bg-surface-800 text-slate-300 transition-colors self-start sm:self-auto"
          title="Refresh Reservations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'ALL', label: 'All Bookings' },
            { id: 'ACTIVE', label: 'Active & Approved' },
            { id: 'PENDING', label: 'Pending Review' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'DISPUTED', label: 'In Dispute' },
            { id: 'WAITLIST', label: 'Waitlist & Offers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
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
            placeholder="Search bookings..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-surface-900/50 border border-slate-800/80 animate-pulse p-6"
            />
          ))}
        </div>
      ) : !token ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <Calendar className="w-10 h-10 text-cyan-400 mx-auto" />
          <h4 className="text-lg font-bold text-white">Sign In Required</h4>
          <p className="text-xs text-slate-400">
            Sign in with your university credentials or click Fast Pass to view your reservations and check-in PINs.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl text-xs transition"
            >
              Sign In
            </Link>
            <button
              onClick={() => switchPersona('RESEARCHER')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs border border-slate-700 transition"
            >
              1-Click Fast Pass (Researcher)
            </button>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300 font-semibold">{error}</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-900/40 border border-slate-800 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">No Reservations Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You do not have any active or past reservations under this filter. Browse the catalog to book instrumentation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const resObj = typeof b.resourceId === 'object' ? b.resourceId : null;
            const resName = resObj?.name || resObj?.title || 'Research Instrument';
            const resCode = resObj?.code || 'EQ-LAB';
            const startDate = new Date(b.startTime);
            const endDate = new Date(b.endTime);

            const isPinAvailable = ['APPROVED', 'CHECKED_IN', 'IN_USE'].includes(b.status);
            const pinRevealed = revealedPins[b._id];
            const pinCode = b.accessPin || '4892';

            return (
              <div
                key={b._id}
                className="p-5 rounded-2xl bg-surface-900/80 border border-slate-800/80 hover:border-slate-700 transition-all shadow-card-dark flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderStatusBadge(b.status)}
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-xs font-bold text-brand-400">{resCode}</span>
                    {b.projectGrantCode && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-surface-950 border border-slate-800">
                        Grant: {b.projectGrantCode}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {resName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1.5 font-mono text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-brand-400" />
                        {startDate.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>

                      <span className="flex items-center gap-1.5 font-mono text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({b.durationMinutes}m)
                      </span>
                    </div>
                  </div>

                  {b.intendedPurpose && (
                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                      "{b.intendedPurpose}"
                    </p>
                  )}

                  {isPinAvailable && (
                    <div className="inline-flex items-center gap-3 p-2 rounded-xl bg-surface-950 border border-brand-500/30 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-brand-300">
                        <Key className="w-3.5 h-3.5 text-brand-400" />
                        <span>Lockbox PIN:</span>
                      </div>

                      <span className="font-mono font-bold tracking-widest text-white px-2 py-0.5 rounded bg-surface-900 border border-slate-800">
                        {pinRevealed ? pinCode : '••••'}
                      </span>

                      <button
                        type="button"
                        onClick={() => togglePinReveal(b._id)}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                        title={pinRevealed ? 'Hide PIN' : 'Reveal PIN'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {pinRevealed && (
                        <button
                          type="button"
                          onClick={() => copyPin(b._id, pinCode)}
                          className="text-slate-400 hover:text-brand-300 transition-colors p-1"
                          title="Copy PIN"
                        >
                          {copiedPinId === b._id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                  {b.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        setCheckInBooking(b);
                        if (onCheckInRequested) onCheckInRequested(b);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Step 7: Check-In
                    </button>
                  )}

                  {(b.status === 'CHECKED_IN' || b.status === 'IN_USE') && (
                    <button
                      onClick={() => {
                        setReturnBooking(b);
                        if (onReturnRequested) onReturnRequested(b);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Step 8: Return Instrument
                    </button>
                  )}

                  {b.status === 'OFFERED' && (
                    <button
                      onClick={() => handleAcceptWaitlistOffer(b._id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Accept Offered Slot
                    </button>
                  )}

                  {['COMPLETED', 'RETURNED', 'IN_DISPUTE', 'DISPUTED', 'RESOLVED'].includes(b.status) && (
                    <button
                      onClick={() => setDiffBookingId(b._id)}
                      className="px-3.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Diff
                    </button>
                  )}

                  {['COMPLETED', 'RETURNED', 'CHECKED_IN', 'IN_DISPUTE'].includes(b.status) && (
                    <button
                      onClick={() => setDisputingBooking(b)}
                      className="px-3 py-2 rounded-xl bg-surface-950 hover:bg-surface-800 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-500/30"
                      title="File an incident or damage ticket"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Report Issue
                    </button>
                  )}

                  {['APPROVED', 'PENDING_REVIEW', 'AWAITING_APPROVAL', 'WAITLISTED', 'OFFERED'].includes(b.status) && (
                    <button
                      onClick={() => setCancellingBooking(b)}
                      className="px-3 py-2 rounded-xl bg-surface-950 hover:bg-surface-800 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-800"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {checkInBooking && (
        <CheckInModal
          booking={checkInBooking}
          isOpen={!!checkInBooking}
          onClose={() => setCheckInBooking(null)}
          onSuccess={() => {
            setCheckInBooking(null);
            fetchBookings();
          }}
        />
      )}

      {returnBooking && (
        <ReturnModal
          booking={returnBooking}
          isOpen={!!returnBooking}
          onClose={() => setReturnBooking(null)}
          onSuccess={() => {
            setReturnBooking(null);
            fetchBookings();
          }}
        />
      )}

      {diffBookingId && (
        <ConditionDiffViewer
          bookingId={diffBookingId}
          isOpen={!!diffBookingId}
          onClose={() => setDiffBookingId(null)}
        />
      )}

      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setCancellingBooking(null)} />
          <div className="relative w-full max-w-md bg-surface-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400" />
                Cancel Reservation
              </h3>
              <button onClick={() => setCancellingBooking(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400">
              Cancelling releases this slot to the waitlist. Late cancellations (&lt; 2 hours before start) may incur fairness reliability deductions.
            </p>

            <form onSubmit={handleCancelBooking} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Reason for Cancellation</label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Precursor sample delayed, equipment not needed..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Keep Reservation
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {disputingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setDisputingBooking(null)} />
          <div className="relative w-full max-w-lg bg-surface-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 z-10 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Report Equipment Incident or Damage
              </h3>
              <button onClick={() => setDisputingBooking(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFileDispute} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Incident Category</label>
                  <select
                    value={disputeCategory}
                    onChange={(e) => setDisputeCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white"
                  >
                    <option value="PHYSICAL_DAMAGE">Hardware / Physical Damage</option>
                    <option value="LATE_RETURN">Late Return Overrun</option>
                    <option value="MISSING_PARTS">Missing Parts or Accessories</option>
                    <option value="SAFETY_BREACH">Safety Protocol Breach</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Severity</label>
                  <select
                    value={disputeSeverity}
                    onChange={(e) => setDisputeSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white"
                  >
                    <option value="LOW">Low - Minor Scuff</option>
                    <option value="MEDIUM">Medium - Operational Degradation</option>
                    <option value="HIGH">High - Sensor or Mechanical Fault</option>
                    <option value="CRITICAL">Critical - Facility Shutdown</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Incident Description *</label>
                <textarea
                  rows={3}
                  required
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Describe damage, missing items, or operational anomalies observed during session..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Evidence Photo URL (optional)</label>
                <input
                  type="text"
                  value={disputePhotoUrl}
                  onChange={(e) => setDisputePhotoUrl(e.target.value)}
                  placeholder="https://.../damage_evidence.jpg"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDisputingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFilingDispute}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
                >
                  {isFilingDispute ? 'Filing Incident...' : 'Open Incident Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
