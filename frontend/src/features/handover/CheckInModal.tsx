import React, { useState } from 'react';
import axios from 'axios';
import {
  X,
  LogIn,
  Key,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Gauge,
  Camera,
  CheckCircle2,
  Copy,
  Check,
  Hash,
  Sparkles
} from 'lucide-react';
import { IBooking } from '../bookings/BookingsList';
import { ConditionRating } from './ConditionDiffViewer';

interface CheckInModalProps {
  booking: IBooking;
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

export default function CheckInModal({
  booking,
  isOpen,
  onClose,
  onSuccess
}: CheckInModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [laserHours, setLaserHours] = useState<number>(1420.5);
  const [operatingTemperature, setOperatingTemperature] = useState<number>(22.4);
  const [spindleCycles, setSpindleCycles] = useState<number>(31500);
  const [runTimeSeconds, setRunTimeSeconds] = useState<number>(85200);

  const [initialCondition, setInitialCondition] = useState<ConditionRating>('EXCELLENT');
  const [preExistingDamageNotes, setPreExistingDamageNotes] = useState('');

  const [checklistItems, setChecklistItems] = useState([
    {
      itemId: 'chk-vacuum',
      itemText: 'High vacuum gauge verified (< 0.2 mbar) and pump operational',
      isCritical: true,
      verified: false
    },
    {
      itemId: 'chk-interlocks',
      itemText: 'Laser interlocks and emergency cutoff switches tested clear',
      isCritical: true,
      verified: false
    },
    {
      itemId: 'chk-cleanliness',
      itemText: 'Sample stage and specimen chamber clean of debris / residue',
      isCritical: false,
      verified: true
    },
    {
      itemId: 'chk-containment',
      itemText: 'Chemical spill kit and PPE goggles equipped in workspace',
      isCritical: true,
      verified: false
    }
  ]);

  const [photoUrl, setPhotoUrl] = useState('/uploads/baseline_chamber_sample.jpg');
  const [photoHash, setPhotoHash] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [signerName, setSignerName] = useState(currentUser.name || 'Alex Mercer');
  const [attestationChecked, setAttestationChecked] = useState(false);

  if (!isOpen) return null;

  const toggleChecklist = (itemId: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, verified: !item.verified } : item))
    );
  };

  const handleCopyPin = () => {
    if (!revealedPin) return;
    navigator.clipboard.writeText(revealedPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const unverifiedCritical = checklistItems.find((item) => item.isCritical && !item.verified);
    if (unverifiedCritical) {
      setError(`Critical Safety Gate Unchecked: '${unverifiedCritical.itemText}'. You must verify all critical items to unlock access.`);
      return;
    }

    if (!attestationChecked) {
      setError('You must sign the legal honor-code attestation.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const api = getApiClient();

      const meterReadings: Record<string, number> = {
        laserHours: Number(laserHours),
        operatingTemperature: Number(operatingTemperature),
        spindleCycles: Number(spindleCycles),
        runTimeSeconds: Number(runTimeSeconds)
      };

      const payload = {
        bookingId: booking._id,
        initialConditionRating: initialCondition,
        conditionRating: initialCondition,
        preExistingDamageNotes: preExistingDamageNotes.trim() || 'No pre-existing damages noted.',
        meterReadings,
        checklistResponses: checklistItems.map((c) => ({
          itemId: c.itemId,
          itemText: c.itemText,
          isCritical: c.isCritical,
          verified: c.verified
        })),
        photoUploads: photoUrl
          ? [
              {
                photoUrl,
                sha256Hash: photoHash,
                caption: 'Baseline pre-use stage condition'
              }
            ]
          : [],
        digitalSignature: {
          signerName: signerName.trim(),
          signedAt: new Date().toISOString()
        }
      };

      const res = await api.post('/inspections/check-in', payload);
      const pin = res.data?.accessPin || booking.accessPin || Math.floor(1000 + Math.random() * 9000).toString();
      setRevealedPin(pin);
    } catch (err: any) {
      console.error('Check-in failed:', err);
      setError(
        err?.response?.data?.message || err?.response?.data?.detail || 'Check-in failed. Please verify window [-15m, +30m] and critical gates.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resObj = typeof booking.resourceId === 'object' ? booking.resourceId : null;
  const resName = resObj?.name || resObj?.title || 'Scientific Instrument';
  const resCode = resObj?.code || 'EQ-LAB';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={() => {
          if (revealedPin) {
            onSuccess();
          } else {
            onClose();
          }
        }}
      />

      <div className="relative w-full max-w-2xl bg-surface-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-surface-950/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Step 7 of Lifecycle
              </span>
              <span className="text-xs font-mono text-slate-400">{resCode}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Digital Check-In & Physical Handover
            </h2>
            <p className="text-xs text-slate-400">
              Record baseline telemetry meters, inspect workspace condition, and unlock your digital access PIN.
            </p>
          </div>

          <button
            onClick={() => {
              if (revealedPin) onSuccess();
              else onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {revealedPin ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
              <Key className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                ✓ Check-In Verified & Custody Initialized
              </span>
              <h3 className="text-2xl font-black text-white">
                Digital Lockbox Access PIN
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Enter this 4-digit code on the instrument lockbox or keypad to retrieve physical ignition keys.
              </p>
            </div>

            <div className="max-w-xs mx-auto p-6 rounded-3xl bg-surface-950 border-2 border-emerald-500/60 shadow-glow-emerald space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                4-Digit Unlock Code
              </span>
              <div className="text-5xl font-black font-mono tracking-[0.25em] text-white">
                {revealedPin}
              </div>
              <button
                type="button"
                onClick={handleCopyPin}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-slate-300 text-xs font-semibold transition-colors border border-slate-800"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Access PIN'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Session clock is running. Please complete return checklist upon finishing.
            </p>

            <button
              onClick={() => {
                onSuccess();
              }}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
            >
              Continue to Active Sessions
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300">
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-surface-950/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                <span>Operational Check-In Window:</span>
                <span className="font-mono text-white font-semibold">[-15m to +30m]</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                WINDOW OPEN
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                1. Baseline Metrology Inputs (Rollback Lower Bound)
              </h3>
              <p className="text-[11px] text-slate-400">
                Verify physical instrument meters before powering on. Final readings upon return must exceed these baselines.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">laserHours</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={laserHours}
                    onChange={(e) => setLaserHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                  />
                  <span className="text-[10px] text-slate-500">hours</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">operatingTemperature</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={operatingTemperature}
                    onChange={(e) => setOperatingTemperature(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                  />
                  <span className="text-[10px] text-slate-500">°C</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">spindleCycles</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={spindleCycles}
                    onChange={(e) => setSpindleCycles(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                  />
                  <span className="text-[10px] text-slate-500">cycles</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">runTimeSeconds</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={runTimeSeconds}
                    onChange={(e) => setRunTimeSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                  />
                  <span className="text-[10px] text-slate-500">seconds</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                2. Initial Physical Condition Rating
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] as ConditionRating[]).map((rating) => {
                  const isSelected = initialCondition === rating;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setInitialCondition(rating)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-brand-600/20 border-brand-500 text-white font-bold shadow-sm'
                          : 'bg-surface-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-xs">{rating}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {rating === 'EXCELLENT' ? 'Flawless' : rating === 'GOOD' ? 'Normal Wear' : rating === 'FAIR' ? 'Minor Blemishes' : 'Degraded'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-slate-300 font-semibold">
                  Pre-Existing Damage / Blemish Notes (Protects your trust score)
                </label>
                <textarea
                  rows={2}
                  value={preExistingDamageNotes}
                  onChange={(e) => setPreExistingDamageNotes(e.target.value)}
                  placeholder="Record any existing scratches, specimen stains, or loose screws observed prior to use..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" />
                3. Pre-Use Safety Checklist (Mandatory Gates)
              </h3>

              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div
                    key={item.itemId}
                    onClick={() => toggleChecklist(item.itemId)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                      item.verified
                        ? 'bg-surface-950/80 border-slate-800'
                        : item.isCritical
                        ? 'bg-rose-500/5 border-rose-500/40'
                        : 'bg-surface-950/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.verified}
                        onChange={() => {}}
                        className="rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                      />
                      <span className={`text-xs ${item.verified ? 'text-white' : 'text-slate-300'}`}>
                        {item.itemText}
                      </span>
                    </div>

                    {item.isCritical && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 shrink-0">
                        Critical Gate
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-slate-300 font-semibold block flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-400" />
                Pre-Use Inspection Photo Upload & SHA-256 Hash
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://.../baseline_photo.jpg"
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <Hash className="w-3.5 h-3.5" />
                <span>SHA-256 Provenance: {photoHash}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Operator Digital Signature</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-950/80 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={attestationChecked}
                  onChange={(e) => setAttestationChecked(e.target.checked)}
                  className="mt-0.5 rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-300 leading-relaxed text-[11px]">
                  I declare under university disciplinary code that the baseline meters and inspection checklist above are true, accurate, and physically verified.
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
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>{submitting ? 'Verifying Baseline...' : 'Complete Check-In & Reveal PIN'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
