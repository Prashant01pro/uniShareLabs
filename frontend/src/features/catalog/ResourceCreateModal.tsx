import React, { useState } from 'react';
import axios from 'axios';
import {
  X,
  Plus,
  Trash2,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  FileText
} from 'lucide-react';
import { ResourceCategory, SafetyLevel } from './ResourceCatalog';

interface ResourceCreateModalProps {
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

const CATEGORIES: { value: ResourceCategory; label: string }[] = [
  { value: 'MICROSCOPES', label: 'Microscopes & Imaging' },
  { value: 'CLEANROOMS', label: 'Cleanrooms & Lithography' },
  { value: 'MAKERSPACE_3D_PRINTERS', label: '3D Printers & Makerspace' },
  { value: 'SPECTROMETERS', label: 'Spectrometers (NMR / MS / FTIR)' },
  { value: 'CNC_MACHINING', label: 'CNC & Precision Machining' },
  { value: 'GENERAL_LAB', label: 'General Lab Equipment' },
];

const DEPARTMENTS = [
  'Materials Science & Engineering',
  'Physics & Astronomy',
  'Chemistry & Chemical Biology',
  'Bioengineering & Nanomedicine',
  'Electrical & Computer Engineering',
  'Mechanical & Aerospace Engineering'
];

export default function ResourceCreateModal({
  isOpen,
  onClose,
  onSuccess
}: ResourceCreateModalProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('MICROSCOPES');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [labLocation, setLabLocation] = useState('');
  const [description, setDescription] = useState('');
  const [safetyLevel, setSafetyLevel] = useState<SafetyLevel>('LEVEL_1_GENERAL');
  const [approvalMode, setApprovalMode] = useState<'AUTOMATIC' | 'MANUAL_REVIEW'>('MANUAL_REVIEW');
  const [hourlyRate, setHourlyRate] = useState<number>(50);

  const [allowedDays, setAllowedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dailyStartTime, setDailyStartTime] = useState('08:00');
  const [dailyEndTime, setDailyEndTime] = useState('20:00');
  const [slotGranularityMinutes, setSlotGranularityMinutes] = useState(30);
  const [minDurationMinutes, setMinDurationMinutes] = useState(30);
  const [maxDurationMinutes, setMaxDurationMinutes] = useState(240);
  const [bufferTimeMinutes, setBufferTimeMinutes] = useState(15);
  const [advanceBookingDaysMax, setAdvanceBookingDaysMax] = useState(14);

  const [minRole, setMinRole] = useState<'STUDENT' | 'RESEARCHER' | 'RESOURCE_OWNER' | 'LAB_MANAGER' | 'ADMIN'>('STUDENT');
  const [supervisorEndorsementRequired, setSupervisorEndorsementRequired] = useState(false);
  const [projectGrantCodeRequired, setProjectGrantCodeRequired] = useState(true);
  const [requiresInduction, setRequiresInduction] = useState(false);
  const [safetyAgreementRequired, setSafetyAgreementRequired] = useState(true);

  const [requiredCerts, setRequiredCerts] = useState<Array<{ certCode: string; name: string; validityPeriodDays: number }>>([
    { certCode: 'CERT-LASER-SAFETY-L1', name: 'Laser Safety Level 1', validityPeriodDays: 365 }
  ]);
  const [newCertCode, setNewCertCode] = useState('');
  const [newCertName, setNewCertName] = useState('');

  const [trainingsText, setTrainingsText] = useState('TRAIN-HAZMAT-101, TRAIN-EHS-GENERAL');

  const [checklist, setChecklist] = useState<Array<{ itemId: string; itemText: string; isCritical: boolean }>>([
    { itemId: 'chk-1', itemText: 'Vacuum chamber seal and pressure verified', isCritical: true },
    { itemId: 'chk-2', itemText: 'Emergency stop button clear and operational', isCritical: true },
    { itemId: 'chk-3', itemText: 'Workspace clean and free of biological or chemical residue', isCritical: false }
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistCritical, setNewChecklistCritical] = useState(false);

  const [meters, setMeters] = useState<Array<{ meterKey: string; label: string; unit: string; warningDeltaThreshold: number }>>([
    { meterKey: 'runTimeSeconds', label: 'Operational Runtime', unit: 'seconds', warningDeltaThreshold: 14400 },
    { meterKey: 'operatingTemperature', label: 'Operating Temperature', unit: '°C', warningDeltaThreshold: 85 }
  ]);
  const [newMeterKey, setNewMeterKey] = useState('');
  const [newMeterLabel, setNewMeterLabel] = useState('');
  const [newMeterUnit, setNewMeterUnit] = useState('');

  if (!isOpen) return null;

  const toggleDay = (dayIndex: number) => {
    if (allowedDays.includes(dayIndex)) {
      if (allowedDays.length > 1) {
        setAllowedDays(allowedDays.filter((d) => d !== dayIndex));
      }
    } else {
      setAllowedDays([...allowedDays, dayIndex].sort());
    }
  };

  const handleAddCert = () => {
    if (!newCertCode.trim() || !newCertName.trim()) return;
    setRequiredCerts([
      ...requiredCerts,
      { certCode: newCertCode.trim().toUpperCase(), name: newCertName.trim(), validityPeriodDays: 365 }
    ]);
    setNewCertCode('');
    setNewCertName('');
  };

  const handleRemoveCert = (index: number) => {
    setRequiredCerts(requiredCerts.filter((_, i) => i !== index));
  };

  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([
      ...checklist,
      {
        itemId: `chk-${Date.now()}`,
        itemText: newChecklistText.trim(),
        isCritical: newChecklistCritical
      }
    ]);
    setNewChecklistText('');
    setNewChecklistCritical(false);
  };

  const handleRemoveChecklist = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleAddMeter = () => {
    if (!newMeterKey.trim() || !newMeterLabel.trim()) return;
    setMeters([
      ...meters,
      {
        meterKey: newMeterKey.trim(),
        label: newMeterLabel.trim(),
        unit: newMeterUnit.trim() || 'units',
        warningDeltaThreshold: 100
      }
    ]);
    setNewMeterKey('');
    setNewMeterLabel('');
    setNewMeterUnit('');
  };

  const handleRemoveMeter = (index: number) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !description.trim()) {
      setError('Please fill in all mandatory equipment details (name, code, description).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const api = getApiClient();

      const parsedTrainings = trainingsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        title: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        department,
        labLocation: labLocation.trim() || 'Central Facility Room 101',
        description: description.trim(),
        safetyLevel,
        approvalMode,
        hourlyRate: Number(hourlyRate),
        calendar: {
          allowedDays,
          dailyStartTime,
          dailyEndTime,
          slotGranularityMinutes: Number(slotGranularityMinutes),
          minDurationMinutes: Number(minDurationMinutes),
          maxDurationMinutes: Number(maxDurationMinutes),
          bufferTimeMinutes: Number(bufferTimeMinutes),
          advanceBookingDaysMax: Number(advanceBookingDaysMax),
          leadTimeMinutesMin: 60
        },
        prerequisites: {
          minRole,
          requiredCertifications: requiredCerts,
          requiredSafetyTrainings: parsedTrainings,
          supervisorEndorsementRequired,
          projectGrantCodeRequired,
          requiresInduction,
          safetyAgreementRequired
        },
        inspectionConfig: {
          checklistItems: checklist,
          meters,
          requirePhotos: true,
          maxPhotos: 4
        },
        status: 'AVAILABLE'
      };

      await api.post('/resources', payload);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create resource:', err);
      setError(
        err?.response?.data?.message || err?.response?.data?.detail || 'Failed to list new equipment. Please verify permissions and fields.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const daysLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-surface-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-surface-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                List New Research Instrumentation
              </h2>
              <p className="text-xs text-slate-400">
                Configure equipment envelopes, safety prerequisites, inspection checklists, and telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8 flex-1 text-xs text-slate-300">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              1. Equipment Identification & Classification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-300 font-semibold">Instrument Official Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. FEI Quanta 200 Environmental SEM"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Unique Asset Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. EQ-MIC-002"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Equipment Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Academic Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Laboratory Room & Building *</label>
                <input
                  type="text"
                  value={labLocation}
                  onChange={(e) => setLabLocation(e.target.value)}
                  placeholder="e.g. Nanotech Wing Room 304B"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-300 font-semibold">Operational Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize instrument capabilities, vacuum envelopes, detectors, and suitable sample types..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Safety Clearance Level *</label>
                <select
                  value={safetyLevel}
                  onChange={(e) => setSafetyLevel(e.target.value as SafetyLevel)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="LEVEL_1_GENERAL">Level 1: General Access</option>
                  <option value="LEVEL_2_SUPERVISED">Level 2: Supervised Access</option>
                  <option value="LEVEL_3_RESTRICTED">Level 3: Restricted Access</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Approval Mode *</label>
                <select
                  value={approvalMode}
                  onChange={(e) => setApprovalMode(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="MANUAL_REVIEW">Owner / Manager Review Queue</option>
                  <option value="AUTOMATIC">Instant Deterministic Auto-Approve</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              2. Scheduling Rules & Operational Envelope
            </h3>

            <div className="space-y-3">
              <label className="text-slate-300 font-semibold block">Permitted Operational Days</label>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                  const isAllowed = allowedDays.includes(dayIdx);
                  return (
                    <button
                      key={dayIdx}
                      type="button"
                      onClick={() => toggleDay(dayIdx)}
                      className={`px-3 py-1.5 rounded-lg font-mono font-medium text-xs transition-all border ${
                        isAllowed
                          ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                          : 'bg-surface-950 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {daysLabel[dayIdx]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400">Daily Opening Time</label>
                <input
                  type="time"
                  value={dailyStartTime}
                  onChange={(e) => setDailyStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Daily Closing Time</label>
                <input
                  type="time"
                  value={dailyEndTime}
                  onChange={(e) => setDailyEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Min Duration (m)</label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={minDurationMinutes}
                  onChange={(e) => setMinDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Max Duration (m)</label>
                <input
                  type="number"
                  min="30"
                  step="30"
                  value={maxDurationMinutes}
                  onChange={(e) => setMaxDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Buffer / Vent Time (m)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={bufferTimeMinutes}
                  onChange={(e) => setBufferTimeMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Max Advance Days</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={advanceBookingDaysMax}
                  onChange={(e) => setAdvanceBookingDaysMax(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              3. Prerequisites & Deterministic Safety Gates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Minimum Institutional Role</label>
                <select
                  value={minRole}
                  onChange={(e) => setMinRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-white"
                >
                  <option value="STUDENT">Student</option>
                  <option value="RESEARCHER">Researcher</option>
                  <option value="RESOURCE_OWNER">Resource Owner / PI</option>
                  <option value="LAB_MANAGER">Lab Manager</option>
                  <option value="ADMIN">University Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Required EHS Training Modules (comma-separated)</label>
                <input
                  type="text"
                  value={trainingsText}
                  onChange={(e) => setTrainingsText(e.target.value)}
                  placeholder="e.g. TRAIN-HAZMAT-101, TRAIN-EHS-GENERAL"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={projectGrantCodeRequired}
                  onChange={(e) => setProjectGrantCodeRequired(e.target.checked)}
                  className="rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-200">Require Active Research Grant Code</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supervisorEndorsementRequired}
                  onChange={(e) => setSupervisorEndorsementRequired(e.target.checked)}
                  className="rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-200">Require Supervisor Endorsement</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresInduction}
                  onChange={(e) => setRequiresInduction(e.target.checked)}
                  className="rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-200">Require Physical Walkthrough Induction</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyAgreementRequired}
                  onChange={(e) => setSafetyAgreementRequired(e.target.checked)}
                  className="rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-200">Require Safety Protocol Sign-Off</span>
              </label>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-slate-300 font-semibold block">Mandatory Safety Certifications</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cert Code (e.g. CERT-LASER-SAFETY-L2)"
                  value={newCertCode}
                  onChange={(e) => setNewCertCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                />
                <input
                  type="text"
                  placeholder="Certification Name"
                  value={newCertName}
                  onChange={(e) => setNewCertName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white"
                />
                <button
                  type="button"
                  onClick={handleAddCert}
                  className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                >
                  Add Cert
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {requiredCerts.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-950/60 border border-slate-800"
                  >
                    <span className="font-mono text-brand-300">{c.certCode}</span>
                    <span className="text-slate-300">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCert(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              4. Inspection Checklists & Telemetry Meters
            </h3>

            <div className="space-y-2">
              <label className="text-slate-300 font-semibold block">Pre-Use Inspection Checklist Items</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Filament emission stabilized, vacuum verified"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newChecklistCritical}
                    onChange={(e) => setNewChecklistCritical(e.target.checked)}
                    className="rounded bg-surface-950 border-slate-700 text-rose-500"
                  />
                  <span>Critical Gate</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                >
                  Add Item
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-950/60 border border-slate-800"
                  >
                    <span className="text-slate-200">{item.itemText}</span>
                    <div className="flex items-center gap-2">
                      {item.isCritical ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20">
                          Critical
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800">
                          Standard
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklist(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-slate-300 font-semibold block">Monitored Metrology Meters</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key (e.g. laserHours)"
                  value={newMeterKey}
                  onChange={(e) => setNewMeterKey(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 font-mono text-white"
                />
                <input
                  type="text"
                  placeholder="Display Label"
                  value={newMeterLabel}
                  onChange={(e) => setNewMeterLabel(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white"
                />
                <input
                  type="text"
                  placeholder="Unit (e.g. hrs)"
                  value={newMeterUnit}
                  onChange={(e) => setNewMeterUnit(e.target.value)}
                  className="w-24 px-3 py-2 rounded-xl bg-surface-950 border border-slate-800 text-white"
                />
                <button
                  type="button"
                  onClick={handleAddMeter}
                  className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                >
                  Add Meter
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {meters.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-950/60 border border-slate-800 font-mono"
                  >
                    <span className="text-brand-300">{m.meterKey}</span>
                    <span className="text-slate-300">{m.label} ({m.unit})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMeter(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? 'Registering Equipment...' : 'Publish Equipment Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
