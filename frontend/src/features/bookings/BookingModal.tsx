import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  X,
  Calendar,
  Clock,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  FileText,
  UserCheck
} from 'lucide-react';
import { IResource } from '../catalog/ResourceCatalog';

interface BookingModalProps {
  resource: IResource;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export default function BookingModal({
  resource,
  isOpen,
  onClose,
  onSuccess
}: BookingModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictOccurred, setConflictOccurred] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];
  const [bookingDate, setBookingDate] = useState(todayIso);
  const [startTimeStr, setStartTimeStr] = useState(resource.calendar?.dailyStartTime || '10:00');
  const [endTimeStr, setEndTimeStr] = useState('12:00');

  const [projectGrantCode, setProjectGrantCode] = useState('NSF-DMR-2026-9912');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [supervisorEndorsed, setSupervisorEndorsed] = useState(false);
  const [intendedPurpose, setIntendedPurpose] = useState('');
  const [safetyAcknowledgement, setSafetyAcknowledgement] = useState(false);
  const [allowWaitlist, setAllowWaitlist] = useState(true);

  const [quotaLimit, setQuotaLimit] = useState<number>(25);
  const [quotaUsed, setQuotaUsed] = useState<number>(4.5);
  const [loadingQuota, setLoadingQuota] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchQuota = async () => {
      try {
        setLoadingQuota(true);
        const api = getApiClient();
        const res = await api.get('/auth/me');
        const user = res.data?.user || res.data;
        if (user) {
          const role = user.role || 'STUDENT';
          const defaultLimits: Record<string, number> = {
            STUDENT: 10,
            RESEARCHER: 25,
            RESOURCE_OWNER: 40,
            LAB_MANAGER: 40,
            ADMIN: 100
          };
          setQuotaLimit(user.weeklyQuotaLimitHours || defaultLimits[role] || 10);
          setQuotaUsed(user.weeklyHoursUsed || 0);
        }
      } catch (err) {
        console.warn('Could not fetch user profile for quota gauge fallback to defaults');
      } finally {
        setLoadingQuota(false);
      }
    };

    fetchQuota();
  }, [isOpen]);

  const startDateTime = useMemo(() => {
    return new Date(`${bookingDate}T${startTimeStr}:00Z`);
  }, [bookingDate, startTimeStr]);

  const endDateTime = useMemo(() => {
    return new Date(`${bookingDate}T${endTimeStr}:00Z`);
  }, [bookingDate, endTimeStr]);

  const durationMinutes = useMemo(() => {
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return 0;
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    return Math.round(diffMs / (60 * 1000));
  }, [startDateTime, endDateTime]);

  const durationHours = useMemo(() => {
    return Number((durationMinutes / 60).toFixed(2));
  }, [durationMinutes]);

  const isIntervalValid = durationMinutes > 0;
  const minDuration = resource.calendar?.minDurationMinutes || 30;
  const maxDuration = resource.calendar?.maxDurationMinutes || 240;
  const isDurationAllowed = durationMinutes >= minDuration && durationMinutes <= maxDuration;

  const newTotalUsed = Number((quotaUsed + (durationHours > 0 ? durationHours : 0)).toFixed(2));
  const remainingQuota = Number(Math.max(0, quotaLimit - quotaUsed).toFixed(2));
  const isQuotaExceeded = newTotalUsed > quotaLimit;

  const grantCodeRegex = /^[A-Z0-9\-_]{5,30}$/;
  const isGrantCodeValid = grantCodeRegex.test(projectGrantCode.trim().toUpperCase());
  const isPurposeValid = intendedPurpose.trim().length >= 20;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isIntervalValid) {
      setError('End time must be strictly greater than start time for half-open interval [start, end).');
      return;
    }
    if (!isDurationAllowed) {
      setError(`Duration must be between ${minDuration}m and ${maxDuration}m.`);
      return;
    }
    if (resource.prerequisites?.projectGrantCodeRequired && !isGrantCodeValid) {
      setError('A valid project grant code is required (5-30 alphanumeric/dash characters).');
      return;
    }
    if (resource.prerequisites?.supervisorEndorsementRequired && (!supervisorEmail.trim() || !supervisorEndorsed)) {
      setError('Supervisor email and endorsement acknowledgement are mandatory for this resource.');
      return;
    }
    if (!isPurposeValid) {
      setError('Intended research purpose statement must be at least 20 characters long.');
      return;
    }
    if (!safetyAcknowledgement) {
      setError('You must acknowledge the laboratory safety protocol.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setConflictOccurred(false);
      const api = getApiClient();

      const idempotencyKey = crypto.randomUUID();

      const payload = {
        resourceId: resource._id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        durationMinutes,
        projectGrantCode: projectGrantCode.trim().toUpperCase(),
        supervisorEmail: supervisorEmail.trim() || undefined,
        supervisorEndorsed,
        intendedPurpose: intendedPurpose.trim(),
        safetyAcknowledgement: true,
        allowWaitlist
      };

      await api.post('/bookings', payload, {
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      });

      onSuccess();
    } catch (err: any) {
      console.error('Booking submission failed:', err);
      if (err?.response?.status === 409) {
        setConflictOccurred(true);
        setError('Slot Collision: The requested half-open interval conflicts with an active reservation.');
      } else {
        setError(
          err?.response?.data?.message || err?.response?.data?.detail || 'Failed to submit reservation. Please check prerequisites.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-surface-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-surface-950/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Step 3: Reservation
              </span>
              <span className="text-xs font-mono text-slate-400">{resource.code}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Reserve {resource.name || resource.title}
            </h2>
            <p className="text-xs text-slate-400">
              Half-Open Interval Scheduling [t_start, t_end) with Deterministic Pipeline Verification.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Booking Submission Notice</span>
              </div>
              <p>{error}</p>
              {conflictOccurred && (
                <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                  <span>Would you like to queue for this slot on the waitlist?</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-white font-bold">
                    <input
                      type="checkbox"
                      checked={allowWaitlist}
                      onChange={(e) => setAllowWaitlist(e.target.checked)}
                      className="rounded bg-surface-950 border-rose-500 text-brand-500"
                    />
                    <span>Enable Waitlist</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              1. Half-Open Interval Slot Selection [t_start, t_end)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Reservation Date</label>
                <input
                  type="date"
                  required
                  min={todayIso}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Start Time [t_start)</label>
                <input
                  type="time"
                  required
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">End Time [t_end)</label>
                <input
                  type="time"
                  required
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-950/70 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                <span>Calculated Session Duration:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {durationHours} hours ({durationMinutes} mins)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isDurationAllowed && isIntervalValid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Within limits ({minDuration}-{maxDuration}m)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Invalid interval
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
                <Gauge className="w-4 h-4 text-brand-400" />
                <span>Weekly Anti-Monopoly Quota Gauge</span>
              </div>
              <span className="font-mono text-slate-400">
                {quotaUsed}h used / {quotaLimit}h limit
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-surface-950 border border-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${Math.min(100, (quotaUsed / quotaLimit) * 100)}%` }}
                className="h-full bg-brand-500 transition-all duration-300"
                title={`Used: ${quotaUsed}h`}
              />
              {durationHours > 0 && !isQuotaExceeded && (
                <div
                  style={{ width: `${Math.min(100, (durationHours / quotaLimit) * 100)}%` }}
                  className="h-full bg-indigo-400 animate-pulse transition-all duration-300"
                  title={`Requested: +${durationHours}h`}
                />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Remaining balance: {remainingQuota} hours</span>
              {isQuotaExceeded ? (
                <span className="text-rose-400 font-bold">
                  ⚠️ Request exceeds remaining weekly quota by {(newTotalUsed - quotaLimit).toFixed(1)}h
                </span>
              ) : (
                <span className="text-emerald-400">
                  New total: {newTotalUsed}h / {quotaLimit}h
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              2. Funding & Supervisor Endorsement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Project Grant Code *</label>
                <input
                  type="text"
                  required
                  value={projectGrantCode}
                  onChange={(e) => setProjectGrantCode(e.target.value.toUpperCase())}
                  placeholder="e.g. NSF-DMR-2026-9912"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white placeholder-slate-500 focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-[10px] text-slate-500">
                  Must conform to institutional grant format (5-30 chars).
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">
                  Principal Investigator / Supervisor Email
                </label>
                <input
                  type="email"
                  value={supervisorEmail}
                  onChange={(e) => setSupervisorEmail(e.target.value)}
                  placeholder="dr.supervisor@university.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {resource.prerequisites?.supervisorEndorsementRequired && (
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supervisorEndorsed}
                  onChange={(e) => setSupervisorEndorsed(e.target.checked)}
                  className="rounded bg-surface-950 border-amber-500 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-amber-200">
                  I confirm that my supervisor has reviewed and endorsed this experimental protocol.
                </span>
              </label>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">
                Detailed Intended Purpose & Sample Specimen Description *
              </label>
              <span className={`text-[10px] font-mono ${isPurposeValid ? 'text-emerald-400' : 'text-slate-500'}`}>
                {intendedPurpose.length} / 20 characters min
              </span>
            </div>
            <textarea
              rows={3}
              required
              value={intendedPurpose}
              onChange={(e) => setIntendedPurpose(e.target.value)}
              placeholder="Detail your scientific investigation, target materials, vacuum tolerances, laser excitation parameters..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-surface-950/80 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={safetyAcknowledgement}
                onChange={(e) => setSafetyAcknowledgement(e.target.checked)}
                className="mt-0.5 rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-slate-300 leading-relaxed">
                I hereby attest that I have reviewed the chemical and hazard safety protocols for this instrument. I agree to record accurate baseline meters during Step 7 Check-in and return the workspace clean.
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-950/40 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={allowWaitlist}
                onChange={(e) => setAllowWaitlist(e.target.checked)}
                className="rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-slate-300">
                Automatically queue my reservation on the Transparent Fairness Waitlist if slot is occupied.
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !isIntervalValid || !isDurationAllowed || isQuotaExceeded}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Verifying Pipeline...' : 'Submit Instant Reservation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
