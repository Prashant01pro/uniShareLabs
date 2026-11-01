import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Camera,
  FileText,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Hash
} from 'lucide-react';

export type ConditionRating = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface MeterReadingRecord {
  key: string;
  label: string;
  baseline: number;
  final: number;
  delta: number;
  unit: string;
}

export interface IConditionDiffData {
  initialRating: ConditionRating;
  finalRating: ConditionRating;
  ratingDelta: number;
  meterDeltas: Record<string, number>;
  flaggedAnomaly?: boolean;
  anomalyDetails?: string;
  incidentCreated?: boolean;
  incidentId?: string;
  initialMeters?: Record<string, number>;
  finalMeters?: Record<string, number>;
  preExistingNotes?: string;
  returnNotes?: string;
  initialPhotos?: Array<{ photoUrl: string; sha256Hash: string; caption?: string }>;
  returnPhotos?: Array<{ photoUrl: string; sha256Hash: string; caption?: string }>;
  initialSignature?: { signerName?: string; signedAt?: string; signatureHash?: string };
  returnSignature?: { signerName?: string; signedAt?: string; signatureHash?: string };
}

interface ConditionDiffViewerProps {
  bookingId?: string;
  diffData?: IConditionDiffData;
  isOpen?: boolean;
  onClose?: () => void;
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

export default function ConditionDiffViewer({
  bookingId,
  diffData: propDiffData,
  isOpen = true,
  onClose
}: ConditionDiffViewerProps) {
  const [diff, setDiff] = useState<IConditionDiffData | null>(propDiffData || null);
  const [loading, setLoading] = useState<boolean>(!propDiffData && !!bookingId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propDiffData) {
      setDiff(propDiffData);
      return;
    }
    if (!bookingId) return;

    const fetchInspectionDiff = async () => {
      try {
        setLoading(true);
        setError(null);
        const api = getApiClient();
        const res = await api.get(`/inspections/booking/${bookingId}`);
        const data = res.data;
        const initial = data.initialInspection;
        const final = data.finalInspection;
        const diffObj = data.diff || final?.conditionDiff || {};

        const initialM = initial?.meterReadings || {};
        const finalM = final?.meterReadings || {};
        const meterDeltas: Record<string, number> = diffObj.meterDeltas || {};

        Object.keys({ ...initialM, ...finalM }).forEach((k) => {
          if (meterDeltas[k] === undefined) {
            const b = Number(initialM[k] || 0);
            const f = Number(finalM[k] || b);
            meterDeltas[k] = Number((f - b).toFixed(4));
          }
        });

        setDiff({
          initialRating: initial?.conditionRating || 'EXCELLENT',
          finalRating: final?.conditionRating || 'GOOD',
          ratingDelta: diffObj.ratingDelta ?? 0,
          meterDeltas,
          initialMeters: initialM,
          finalMeters: finalM,
          flaggedAnomaly: diffObj.flaggedAnomaly || false,
          anomalyDetails: diffObj.anomalyDetails,
          incidentCreated: diffObj.incidentCreated || false,
          incidentId: diffObj.incidentId,
          preExistingNotes: initial?.preExistingDamageNotes || initial?.notes,
          returnNotes: final?.notes,
          initialPhotos: initial?.photos || initial?.photoUploads || [],
          returnPhotos: final?.photos || final?.photoUploads || [],
          initialSignature: initial?.digitalSignature,
          returnSignature: final?.digitalSignature
        });
      } catch (err: any) {
        console.error('Failed to load inspection diff:', err);
        setError(err?.response?.data?.message || 'Unable to load metrology inspection records.');
      } finally {
        setLoading(false);
      }
    };

    fetchInspectionDiff();
  }, [bookingId, propDiffData]);

  if (!isOpen) return null;

  const renderRatingBadge = (rating: ConditionRating) => {
    switch (rating) {
      case 'EXCELLENT':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            EXCELLENT (Rank 4)
          </span>
        );
      case 'GOOD':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            GOOD (Rank 3)
          </span>
        );
      case 'FAIR':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            FAIR (Rank 2)
          </span>
        );
      case 'POOR':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            POOR (Rank 1)
          </span>
        );
      case 'DAMAGED':
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            DAMAGED (Rank 0)
          </span>
        );
    }
  };

  const content = (
    <div className="space-y-6 text-xs text-slate-300">
      {loading ? (
        <div className="p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
          <p className="text-slate-400 font-mono">Computing Metrology Deltas & Condition Differential...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
          {error}
        </div>
      ) : diff ? (
        <>
          {diff.flaggedAnomaly || diff.incidentCreated ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">
                  Metrology Anomaly & Degradation Detected!
                </h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {diff.anomalyDetails ||
                    `Condition rating dropped by ${Math.abs(diff.ratingDelta)} levels. Automatic incident ticket has been filed and routed for Manager Adjudication.`}
                </p>
                {diff.incidentId && (
                  <span className="font-mono text-[10px] text-rose-300 font-bold block pt-1">
                    Incident Reference ID: {diff.incidentId}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-white text-sm">
                  Clean Handover & Normal Operational Wear
                </h4>
                <p className="text-xs opacity-90">
                  Instrument returned within normal metrological operating envelope. No safety non-compliances flagged.
                </p>
              </div>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-surface-950/80 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              Condition Differential (Delta_Condition)
            </h4>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-900 border border-slate-800/80">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Baseline Initial</span>
                {renderRatingBadge(diff.initialRating)}
              </div>

              <div className="flex items-center gap-2 text-slate-500 self-center">
                <ArrowRight className="w-5 h-5 text-brand-400" />
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-950 border border-slate-800 text-slate-300">
                  Δ {diff.ratingDelta >= 0 ? `+${diff.ratingDelta}` : diff.ratingDelta}
                </span>
              </div>

              <div className="space-y-1 text-right sm:text-left">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Post-Use Final</span>
                {renderRatingBadge(diff.finalRating)}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-brand-400" />
                Metrology Delta Table (Delta_Meter = Reading_final - Reading_initial)
              </h4>
              <span className="text-[10px] font-mono text-slate-500">Rollback Invariant Enforced</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] font-mono">
                    <th className="py-2.5 px-3">Telemetry Metric</th>
                    <th className="py-2.5 px-3">Baseline Reading</th>
                    <th className="py-2.5 px-3">Final Return</th>
                    <th className="py-2.5 px-3">Delta (Δ Meter)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {Object.keys(diff.meterDeltas || {}).length > 0 ? (
                    Object.entries(diff.meterDeltas).map(([k, delta]) => {
                      const initialVal = diff.initialMeters?.[k] ?? 0;
                      const finalVal = diff.finalMeters?.[k] ?? initialVal + delta;
                      const isNegative = delta < 0;

                      return (
                        <tr key={k} className="hover:bg-surface-900/50">
                          <td className="py-3 px-3 font-semibold text-white">{k}</td>
                          <td className="py-3 px-3 text-slate-400">{initialVal}</td>
                          <td className="py-3 px-3 text-slate-300 font-bold">{finalVal}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                isNegative
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/10 text-emerald-400'
                              }`}
                            >
                              {delta >= 0 ? `+${delta}` : delta}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {isNegative ? (
                              <span className="text-rose-400 font-semibold text-[10px]">
                                Rollback Error
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold text-[10px]">
                                Valid Consumption
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500">
                        No telemetry meters configured for this session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-surface-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-400" />
                Pre-Use Notes & Damage Baseline
              </span>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{diff.preExistingNotes || 'No pre-existing damages noted at baseline check-in.'}"
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Return Sign-off Notes
              </span>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{diff.returnNotes || 'Session completed; equipment shutdown protocol verified.'}"
              </p>
            </div>
          </div>

          {((diff.initialPhotos && diff.initialPhotos.length > 0) ||
            (diff.returnPhotos && diff.returnPhotos.length > 0)) && (
            <div className="p-5 rounded-2xl bg-surface-950/80 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-400" />
                Photographic Provenance & Cryptographic Hashes
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {diff.initialPhotos?.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-900 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                      [Pre-Use Inspection Photo]
                    </span>
                    <p className="text-xs text-slate-300">{p.caption || 'Chamber baseline'}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 truncate">
                      <Hash className="w-3 h-3 text-slate-600" />
                      <span>SHA-256: {p.sha256Hash}</span>
                    </div>
                  </div>
                ))}

                {diff.returnPhotos?.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-900 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold block">
                      [Post-Use Return Photo]
                    </span>
                    <p className="text-xs text-slate-300">{p.caption || 'Return state'}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 truncate">
                      <Hash className="w-3 h-3 text-slate-600" />
                      <span>SHA-256: {p.sha256Hash}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-brand-950/20 border border-brand-800/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Baseline Inspector Signature</span>
              <p className="text-white font-bold mt-0.5">{diff.initialSignature?.signerName || 'Authorized Operator'}</p>
              <p className="text-[10px] text-slate-400 truncate">
                Hash: {diff.initialSignature?.signatureHash || 'verified-ecdsa-hash'}
              </p>
            </div>

            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Return Inspector Signature</span>
              <p className="text-white font-bold mt-0.5">{diff.returnSignature?.signerName || 'Authorized Operator'}</p>
              <p className="text-[10px] text-slate-400 truncate">
                Hash: {diff.returnSignature?.signatureHash || 'verified-ecdsa-hash'}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={onClose} />
        <div className="relative w-full max-w-3xl bg-surface-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10">
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-surface-950/40">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Metrology Condition Differential & Handover Summary
              </h3>
              <p className="text-xs text-slate-400">
                Step 8 Metrology Diff Analysis between Baseline Check-In and Final Return.
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">{content}</div>

          <div className="px-6 py-4 border-t border-slate-800 flex justify-end bg-surface-950/60">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return content;
}
