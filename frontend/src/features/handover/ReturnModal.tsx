import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  X,
  LogOut,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Camera,
  CheckCircle2,
  Hash,
  ArrowRight
} from 'lucide-react';
import { IBooking } from '../bookings/BookingsList';
import ConditionDiffViewer, { ConditionRating, IConditionDiffData } from './ConditionDiffViewer';

interface ReturnModalProps {
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

const CONDITION_RANKS: Record<ConditionRating, number> = {
  EXCELLENT: 4,
  GOOD: 3,
  FAIR: 2,
  POOR: 1,
  DAMAGED: 0
};

export default function ReturnModal({
  booking,
  isOpen,
  onClose,
  onSuccess
}: ReturnModalProps) {
  const [loadingBaseline, setLoadingBaseline] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [completedSummary, setCompletedSummary] = useState<IConditionDiffData | null>(null);

  const [baselineMeters, setBaselineMeters] = useState<Record<string, number>>({
    laserHours: 1420.5,
    operatingTemperature: 22.4,
    spindleCycles: 31500,
    runTimeSeconds: 85200
  });
  const [initialCondition, setInitialCondition] = useState<ConditionRating>('EXCELLENT');

  const [finalLaserHours, setFinalLaserHours] = useState<number>(1422.8);
  const [finalOperatingTemperature, setFinalOperatingTemperature] = useState<number>(24.1);
  const [finalSpindleCycles, setFinalSpindleCycles] = useState<number>(31620);
  const [finalRunTimeSeconds, setFinalRunTimeSeconds] = useState<number>(92400);

  const [finalCondition, setFinalCondition] = useState<ConditionRating>('EXCELLENT');
  const [returnNotes, setReturnNotes] = useState('');

  const [shutdownChecklist, setShutdownChecklist] = useState([
    { itemId: 'chk-vent', itemText: 'Vacuum chamber pumped down or vented to safe state', verified: true },
    { itemId: 'chk-power', itemText: 'Laser diodes and high-voltage supply powered down', verified: true },
    { itemId: 'chk-waste', itemText: 'Specimens, substrates, and chemical waste properly disposed', verified: true },
    { itemId: 'chk-keys', itemText: 'Physical lockbox key secured inside digital lockbox', verified: true }
  ]);

  const [photoUrl, setPhotoUrl] = useState('/uploads/return_clean_stage.jpg');
  const [photoHash, setPhotoHash] = useState('f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb');

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [signerName, setSignerName] = useState(currentUser.name || 'Alex Mercer');
  const [signOffConfirmed, setSignOffConfirmed] = useState(false);

  useEffect(() => {
    if (!isOpen || !booking?._id) return;

    const fetchBaseline = async () => {
      try {
        setLoadingBaseline(true);
        const api = getApiClient();
        const res = await api.get(`/inspections/booking/${booking._id}`);
        const checkIn = res.data?.initialInspection;
        if (checkIn) {
          if (checkIn.meterReadings) {
            const rawM = checkIn.meterReadings;
            const m = rawM instanceof Map ? Object.fromEntries(rawM) : rawM;
            setBaselineMeters(m);
            if (m.laserHours !== undefined) {
              setFinalLaserHours(Number((m.laserHours + 2.3).toFixed(1)));
            }
            if (m.operatingTemperature !== undefined) {
              setFinalOperatingTemperature(Number(m.operatingTemperature));
            }
            if (m.spindleCycles !== undefined) {
              setFinalSpindleCycles(Number(m.spindleCycles + 120));
            }
            if (m.runTimeSeconds !== undefined) {
              setFinalRunTimeSeconds(Number(m.runTimeSeconds + 7200));
            }
          }
          if (checkIn.conditionRating) {
            setInitialCondition(checkIn.conditionRating);
            setFinalCondition(checkIn.conditionRating);
          }
        }
      } catch (err) {
        console.warn('Could not fetch baseline inspection, using fallback defaults.');
      } finally {
        setLoadingBaseline(false);
      }
    };

    fetchBaseline();
  }, [isOpen, booking?._id]);

  const currentFinalMeters: Record<string, number> = {
    laserHours: Number(finalLaserHours),
    operatingTemperature: Number(finalOperatingTemperature),
    spindleCycles: Number(finalSpindleCycles),
    runTimeSeconds: Number(finalRunTimeSeconds)
  };

  const meterDeltas = useMemo(() => {
    const deltas: Record<string, { baseline: number; final: number; delta: number; rollback: boolean }> = {};
    Object.keys(currentFinalMeters).forEach((key) => {
      const base = baselineMeters[key] !== undefined ? baselineMeters[key] : currentFinalMeters[key];
      const final = currentFinalMeters[key];
      const delta = Number((final - base).toFixed(2));
      deltas[key] = {
        baseline: base,
        final,
        delta,
        rollback: delta < 0
      };
    });
    return deltas;
  }, [currentFinalMeters, baselineMeters]);

  const hasRollbackError = Object.values(meterDeltas).some((m) => m.rollback);

  const initialRank = CONDITION_RANKS[initialCondition] ?? 4;
  const finalRank = CONDITION_RANKS[finalCondition] ?? 4;
  const rankDelta = finalRank - initialRank;

  const isSevereDegradation = rankDelta <= -2 || finalCondition === 'DAMAGED' || finalCondition === 'POOR';

  if (!isOpen) return null;

  const toggleChecklist = (itemId: string) => {
    setShutdownChecklist((prev) =>
      prev.map((c) => (c.itemId === itemId ? { ...c, verified: !c.verified } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasRollbackError) {
      setError('Counter Rollback Error: Final return readings cannot be lower than initial baseline readings.');
      return;
    }

    if (!signOffConfirmed) {
      setError('You must confirm the final return sign-off attestation.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const api = getApiClient();

      const finalMeterReadings: Record<string, number> = {
        laserHours: Number(finalLaserHours),
        operatingTemperature: Number(finalOperatingTemperature),
        spindleCycles: Number(finalSpindleCycles),
        runTimeSeconds: Number(finalRunTimeSeconds)
      };

      const payload = {
        bookingId: booking._id,
        finalConditionRating: finalCondition,
        conditionRating: finalCondition,
        returnNotes: returnNotes.trim() || 'Session concluded normally; shutdown protocol executed.',
        finalMeterReadings,
        meterReadings: finalMeterReadings,
        checklistResponses: shutdownChecklist.map((c) => ({
          itemId: c.itemId,
          itemText: c.itemText,
          verified: c.verified
        })),
        photoUploads: photoUrl
          ? [
              {
                photoUrl,
                sha256Hash: photoHash,
                caption: 'Post-use return stage state'
              }
            ]
          : [],
        signOffConfirmed: true,
        digitalSignature: {
          signerName: signerName.trim(),
          signedAt: new Date().toISOString()
        }
      };

      const res = await api.post('/inspections/return', payload);
      const data = res.data;

      setCompletedSummary({
        initialRating: initialCondition,
        finalRating: finalCondition,
        ratingDelta: rankDelta,
        meterDeltas: Object.fromEntries(
          Object.entries(meterDeltas).map(([k, v]) => [k, v.delta])
        ),
        flaggedAnomaly: isSevereDegradation,
        anomalyDetails: isSevereDegradation
          ? `Condition rating degraded from ${initialCondition} to ${finalCondition}. Automated incident ticket filed.`
          : undefined,
        incidentCreated: isSevereDegradation,
        incidentId: data?.incident?._id || data?.incidentId,
        initialMeters: baselineMeters,
        finalMeters: finalMeterReadings,
        returnNotes: returnNotes.trim(),
        initialPhotos: [],
        returnPhotos: [
          {
            photoUrl,
            sha256Hash: photoHash,
            caption: 'Clean return state'
          }
        ],
        returnSignature: {
          signerName,
          signedAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.error('Return failed:', err);
      setError(
        err?.response?.data?.message || err?.response?.data?.detail || 'Return inspection submission failed.'
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
          if (completedSummary) {
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
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Step 8 of Lifecycle
              </span>
              <span className="text-xs font-mono text-slate-400">{resCode}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Digital Return & Condition Diff Engine
            </h2>
            <p className="text-xs text-slate-400">
              Submit final metrology readings, verify condition rating, and finalize custody transfer.
            </p>
          </div>

          <button
            onClick={() => {
              if (completedSummary) onSuccess();
              else onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedSummary ? (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                ✓ Return Inspection Successfully Committed
              </span>
              <h3 className="text-2xl font-black text-white">
                Session Metrology Summary
              </h3>
            </div>

            <ConditionDiffViewer diffData={completedSummary} isOpen={true} />

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  onSuccess();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300">
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {hasRollbackError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/60 text-rose-200 flex items-start gap-3 animate-pulse">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-white text-xs">
                    Counter Rollback Detected! (422 Unprocessable)
                  </h4>
                  <p className="text-[11px] opacity-90">
                    Final meter readings cannot be lower than baseline initial readings. Please correct your inputs before submitting.
                  </p>
                </div>
              </div>
            )}

            {isSevereDegradation && (
              <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/60 text-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-white text-xs">
                    ⚠️ Automatic Incident Warning: Severe Condition Degradation
                  </h4>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Condition degraded from <strong className="text-white">{initialCondition}</strong> to{' '}
                    <strong className="text-white">{finalCondition}</strong> (Δ {rankDelta} levels). Submitting this return will automatically file an incident ticket and place the booking into <strong className="text-white">IN_DISPUTE</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                1. Final Meter Readings & Delta Computation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-surface-950/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">laserHours</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Baseline: {baselineMeters.laserHours ?? 1420.5} hrs
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={finalLaserHours}
                    onChange={(e) => setFinalLaserHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-slate-800 font-mono text-white"
                  />
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-500">Computed Delta (Δ):</span>
                    <span
                      className={`font-bold ${
                        meterDeltas.laserHours?.rollback ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {meterDeltas.laserHours?.delta >= 0
                        ? `+${meterDeltas.laserHours?.delta}`
                        : meterDeltas.laserHours?.delta}{' '}
                      hrs
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-950/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">operatingTemperature</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Baseline: {baselineMeters.operatingTemperature ?? 22.4} °C
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={finalOperatingTemperature}
                    onChange={(e) => setFinalOperatingTemperature(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-slate-800 font-mono text-white"
                  />
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-500">Computed Delta (Δ):</span>
                    <span
                      className={`font-bold ${
                        meterDeltas.operatingTemperature?.rollback ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {meterDeltas.operatingTemperature?.delta >= 0
                        ? `+${meterDeltas.operatingTemperature?.delta}`
                        : meterDeltas.operatingTemperature?.delta}{' '}
                      °C
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-950/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">spindleCycles</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Baseline: {baselineMeters.spindleCycles ?? 31500}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    required
                    value={finalSpindleCycles}
                    onChange={(e) => setFinalSpindleCycles(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-slate-800 font-mono text-white"
                  />
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-500">Computed Delta (Δ):</span>
                    <span
                      className={`font-bold ${
                        meterDeltas.spindleCycles?.rollback ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {meterDeltas.spindleCycles?.delta >= 0
                        ? `+${meterDeltas.spindleCycles?.delta}`
                        : meterDeltas.spindleCycles?.delta}{' '}
                      cycles
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-950/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">runTimeSeconds</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Baseline: {baselineMeters.runTimeSeconds ?? 85200} s
                    </span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    required
                    value={finalRunTimeSeconds}
                    onChange={(e) => setFinalRunTimeSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-slate-800 font-mono text-white"
                  />
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-500">Computed Delta (Δ):</span>
                    <span
                      className={`font-bold ${
                        meterDeltas.runTimeSeconds?.rollback ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {meterDeltas.runTimeSeconds?.delta >= 0
                        ? `+${meterDeltas.runTimeSeconds?.delta}`
                        : meterDeltas.runTimeSeconds?.delta}{' '}
                      seconds
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  2. Post-Use Condition Rating
                </h3>
                <span className="text-[11px] text-slate-400">
                  Baseline was: <strong className="text-white">{initialCondition}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as ConditionRating[]).map((rating) => {
                  const isSelected = finalCondition === rating;
                  const isDegradedOption = rating === 'DAMAGED' || rating === 'POOR';

                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFinalCondition(rating)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? isDegradedOption
                            ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                            : 'bg-brand-600/20 border-brand-500 text-white font-bold'
                          : 'bg-surface-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-semibold">{rating}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Rank {CONDITION_RANKS[rating]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-slate-300 font-semibold">Session Return Notes</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Record session notes, specimen observations, vacuum level left at shutdown..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" />
                3. Post-Use Instrument Shutdown Checklist
              </h3>

              <div className="space-y-2">
                {shutdownChecklist.map((item) => (
                  <label
                    key={item.itemId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-950/60 border border-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.verified}
                      onChange={() => toggleChecklist(item.itemId)}
                      className="rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-slate-200">{item.itemText}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-slate-300 font-semibold block flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-400" />
                Clean Return Photographic Proof (SHA-256 Provenance)
              </label>
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono text-xs"
              />
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <Hash className="w-3.5 h-3.5" />
                <span>SHA-256: {photoHash}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Returning Operator Signature</label>
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
                  checked={signOffConfirmed}
                  onChange={(e) => setSignOffConfirmed(e.target.checked)}
                  className="mt-0.5 rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-300 leading-relaxed text-[11px]">
                  I certify that I have followed all operational shutdown procedures, recorded final meters without rollback, and left the instrument clean and locked for the next researcher.
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
                disabled={submitting || hasRollbackError}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{submitting ? 'Calculating Delta & Finalizing...' : 'Submit Digital Return & Sign-Off'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
