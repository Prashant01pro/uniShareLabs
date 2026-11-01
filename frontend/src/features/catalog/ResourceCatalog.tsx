import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  Microscope,
  Layers,
  Printer,
  Radio,
  Cpu,
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlusCircle,
  ExternalLink,
  Calendar,
  Sparkles,
  RefreshCw,
  Building2,
  Tag
} from 'lucide-react';
import ResourceDetailModal from './ResourceDetailModal';
import ResourceCreateModal from './ResourceCreateModal';
import BookingModal from '../bookings/BookingModal';

export type ResourceCategory =
  | 'MICROSCOPES'
  | 'CLEANROOMS'
  | 'MAKERSPACE_3D_PRINTERS'
  | 'SPECTROMETERS'
  | 'CNC_MACHINING'
  | 'GENERAL_LAB';

export type SafetyLevel =
  | 'LEVEL_1_GENERAL'
  | 'LEVEL_2_SUPERVISED'
  | 'LEVEL_3_RESTRICTED';

export type ResourceStatus =
  | 'AVAILABLE'
  | 'MAINTENANCE'
  | 'OFFLINE';

export interface IResource {
  _id: string;
  name: string;
  title?: string;
  code: string;
  category: ResourceCategory;
  department: string;
  labLocation?: string;
  location?: string;
  description: string;
  safetyLevel?: SafetyLevel;
  status: ResourceStatus;
  approvalMode: 'AUTOMATIC' | 'MANUAL_REVIEW';
  hourlyRate?: number;
  specifications?: Record<string, string | number>;
  calendar?: {
    allowedDays: number[];
    dailyStartTime: string;
    dailyEndTime: string;
    slotGranularityMinutes: number;
    minDurationMinutes: number;
    maxDurationMinutes: number;
    bufferTimeMinutes: number;
    advanceBookingDaysMax: number;
  };
  prerequisites?: {
    minRole?: string;
    requiredCertifications?: Array<{ certCode: string; name: string }>;
    requiredSafetyTrainings?: string[];
    supervisorEndorsementRequired?: boolean;
    projectGrantCodeRequired?: boolean;
    requiresInduction?: boolean;
    safetyAgreementRequired?: boolean;
  };
  inspectionConfig?: {
    checklistItems: Array<{ itemId: string; itemText: string; isCritical: boolean }>;
    meters: Array<{ meterKey: string; label: string; unit: string }>;
  };
  imageUrl?: string;
}

const CATEGORIES: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'ALL', label: 'All Equipment', icon: Layers },
  { key: 'MICROSCOPES', label: 'Microscopes & Imaging', icon: Microscope },
  { key: 'CLEANROOMS', label: 'Cleanrooms & Litho', icon: Sparkles },
  { key: 'MAKERSPACE_3D_PRINTERS', label: '3D Printers & Makerspace', icon: Printer },
  { key: 'SPECTROMETERS', label: 'Spectrometers (NMR/MS)', icon: Radio },
  { key: 'CNC_MACHINING', label: 'CNC & Precision Machining', icon: Cpu },
  { key: 'GENERAL_LAB', label: 'General Lab Instruments', icon: FlaskConical },
];

const DEPARTMENTS = [
  'All Departments',
  'Materials Science & Engineering',
  'Physics & Astronomy',
  'Chemistry & Chemical Biology',
  'Bioengineering & Nanomedicine',
  'Electrical & Computer Engineering',
  'Mechanical & Aerospace Engineering'
];

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

interface ResourceCatalogProps {
  onSelectResource?: (resource: IResource) => void;
  userRole?: string;
}

export default function ResourceCatalog({ onSelectResource, userRole }: ResourceCatalogProps) {
  const [resources, setResources] = useState<IResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');
  const [selectedSafetyLevel, setSelectedSafetyLevel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [eligibleOnly, setEligibleOnly] = useState<boolean>(false);

  const [detailResource, setDetailResource] = useState<IResource | null>(null);
  const [bookingResource, setBookingResource] = useState<IResource | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const activeRole = userRole || localStorage.getItem('activeRole') || 'STUDENT';
  const canCreate = ['RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'].includes(activeRole);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const api = getApiClient();
      const params: Record<string, any> = {};

      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedDepartment !== 'All Departments') params.department = selectedDepartment;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (eligibleOnly) params.eligibleOnly = true;

      const res = await api.get('/resources', { params });
      const data = res.data?.data || res.data || [];
      setResources(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch resources:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to load equipment catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedCategory, selectedDepartment, selectedStatus, eligibleOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      if (selectedSafetyLevel !== 'ALL' && res.safetyLevel && res.safetyLevel !== selectedSafetyLevel) {
        return false;
      }
      return true;
    });
  }, [resources, selectedSafetyLevel]);

  const renderSafetyBadge = (level?: SafetyLevel) => {
    switch (level) {
      case 'LEVEL_3_RESTRICTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3" />
            Level 3: Restricted
          </span>
        );
      case 'LEVEL_2_SUPERVISED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            Level 2: Supervised
          </span>
        );
      case 'LEVEL_1_GENERAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" />
            Level 1: General Access
          </span>
        );
    }
  };

  const renderStatusBadge = (status: ResourceStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Available
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            Maintenance
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Offline
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Institutional Discovery
            </span>
            <span className="text-xs text-slate-400">Step 2 of Lifecycle</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Research Instrumentation Catalog
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Browse shared scientific infrastructure across campus. Check deterministic 7-gate safety prerequisites and reserve instrumentation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchResources()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-800 bg-surface-900 hover:bg-surface-800 text-slate-300 transition-colors"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-brand-600/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              List New Equipment
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/30'
                  : 'bg-surface-900/80 hover:bg-surface-800 text-slate-300 border-slate-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 rounded-2xl bg-surface-900/60 border border-slate-800/80 backdrop-blur-md space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by equipment name, code (e.g. EQ-MIC-001), keywords or technique..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-surface-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSafetyLevel}
                onChange={(e) => setSelectedSafetyLevel(e.target.value)}
                className="bg-surface-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
              >
                <option value="ALL">All Safety Levels</option>
                <option value="LEVEL_1_GENERAL">Level 1: General Access</option>
                <option value="LEVEL_2_SUPERVISED">Level 2: Supervised</option>
                <option value="LEVEL_3_RESTRICTED">Level 3: Restricted</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-surface-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
              >
                <option value="ALL">All Operational Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="MAINTENANCE">In Maintenance</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
              className="rounded bg-surface-950 border-slate-700 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
            />
            <span className="font-medium text-slate-300">
              Only Show Instruments I Am Qualified For
            </span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-96 rounded-2xl bg-surface-900/50 border border-slate-800/80 animate-pulse p-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-24 h-5 rounded-full bg-slate-800" />
                <div className="w-3/4 h-7 rounded-lg bg-slate-800" />
                <div className="w-1/2 h-4 rounded bg-slate-800" />
                <div className="space-y-2 pt-4">
                  <div className="w-full h-3 rounded bg-slate-800/60" />
                  <div className="w-5/6 h-3 rounded bg-slate-800/60" />
                </div>
              </div>
              <div className="w-full h-10 rounded-xl bg-slate-800/60" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">Error Loading Catalog</h3>
          <p className="text-sm text-rose-300 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => fetchResources()}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-900/40 border border-slate-800 text-center space-y-4">
          <Microscope className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Research Instruments Found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              No equipment matching the current criteria was found. Try clearing your filters or search terms.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setSelectedDepartment('All Departments');
              setSelectedSafetyLevel('ALL');
              setSelectedStatus('ALL');
              setSearchQuery('');
              setEligibleOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const loc = res.labLocation || res.location || 'Central Facility';
            const title = res.name || res.title || 'Scientific Instrument';

            return (
              <div
                key={res._id}
                className="group rounded-2xl bg-surface-900/80 hover:bg-surface-900 border border-slate-800/80 hover:border-brand-500/40 transition-all duration-200 shadow-card-dark flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    {renderStatusBadge(res.status)}
                    {renderSafetyBadge(res.safetyLevel)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-brand-400 font-semibold mb-1">
                      <Tag className="w-3 h-3" />
                      <span>{res.code}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">{res.category}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                      {title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{res.department} — {loc}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {res.description}
                  </p>

                  <div className="p-3 rounded-xl bg-surface-950/80 border border-slate-800/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-brand-400" />
                        Window:
                      </span>
                      <span className="font-mono text-slate-200">
                        {res.calendar?.dailyStartTime || '08:00'} - {res.calendar?.dailyEndTime || '20:00'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Approval:
                      </span>
                      <span className={`font-semibold ${
                        res.approvalMode === 'AUTOMATIC' ? 'text-emerald-400' : 'text-indigo-400'
                      }`}>
                        {res.approvalMode === 'AUTOMATIC' ? 'Instant Auto-Approve' : 'Manual Review'}
                      </span>
                    </div>

                    {res.prerequisites?.requiredCertifications && res.prerequisites.requiredCertifications.length > 0 && (
                      <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/40">
                        <span>Required Certs:</span>
                        <span className="font-mono text-amber-300">
                          {res.prerequisites.requiredCertifications.length} active
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-surface-950/60 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDetailResource(res);
                      if (onSelectResource) onSelectResource(res);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Details & Eligibility
                  </button>

                  <button
                    disabled={res.status !== 'AVAILABLE'}
                    onClick={() => setBookingResource(res)}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      res.status === 'AVAILABLE'
                        ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Book
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailResource && (
        <ResourceDetailModal
          resource={detailResource}
          isOpen={!!detailResource}
          onClose={() => setDetailResource(null)}
          onProceedToBooking={() => {
            const r = detailResource;
            setDetailResource(null);
            setBookingResource(r);
          }}
        />
      )}

      {bookingResource && (
        <BookingModal
          resource={bookingResource}
          isOpen={!!bookingResource}
          onClose={() => setBookingResource(null)}
          onSuccess={() => {
            setBookingResource(null);
            fetchResources();
          }}
        />
      )}

      {showCreateModal && (
        <ResourceCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchResources();
          }}
        />
      )}
    </div>
  );
}
