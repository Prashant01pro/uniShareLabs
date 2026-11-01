import React from 'react';
import {
  Clock,
  CheckCircle2,
  Users,
  Sparkles,
  PlayCircle,
  ShieldCheck,
  XCircle,
  Ban,
  UserX,
  AlertTriangle,
  CheckSquare,
  FileText,
  Wrench,
  PowerOff,
  Archive,
  AlertCircle,
  Scale,
  Shield,
  ShieldAlert,
  Flame,
  Info,
  LucideIcon,
} from 'lucide-react';
import { BookingStatus, ResourceStatus, ConditionRating, IncidentStatus, IncidentSeverity, SafetyLevel } from '../../types';

export interface StatusBadgeProps {
  status:
    | BookingStatus
    | ResourceStatus
    | ConditionRating
    | IncidentStatus
    | IncidentSeverity
    | SafetyLevel
    | string;
  type?: 'booking' | 'resource' | 'incident' | 'condition' | 'safety' | 'auto';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
  className?: string;
  labelOverride?: string;
}

interface BadgeConfig {
  label: string;
  icon: LucideIcon;
  bg: string;
  text: string;
  border: string;
  dotBg: string;
}

const BADGE_CONFIGS: Record<string, BadgeConfig> = {
  DRAFT: {
    label: 'Draft',
    icon: FileText,
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    dotBg: 'bg-slate-400',
  },
  PENDING_REVIEW: {
    label: 'Pending Review',
    icon: Clock,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dotBg: 'bg-amber-400 animate-pulse',
  },
  PENDING_VERIFICATION: {
    label: 'Verifying',
    icon: Clock,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dotBg: 'bg-amber-400 animate-pulse',
  },
  AWAITING_APPROVAL: {
    label: 'Awaiting Approval',
    icon: Clock,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dotBg: 'bg-amber-400 animate-pulse',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dotBg: 'bg-emerald-400',
  },
  WAITLISTED: {
    label: 'Waitlisted',
    icon: Users,
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    dotBg: 'bg-purple-400',
  },
  OFFERED: {
    label: 'Slot Offered',
    icon: Sparkles,
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
    dotBg: 'bg-cyan-400 animate-ping',
  },
  CHECKED_IN: {
    label: 'Checked In',
    icon: PlayCircle,
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
    dotBg: 'bg-sky-400 animate-pulse',
  },
  IN_USE: {
    label: 'In Session',
    icon: PlayCircle,
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
    dotBg: 'bg-sky-400 animate-pulse',
  },
  RETURNED: {
    label: 'Returned',
    icon: ShieldCheck,
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    dotBg: 'bg-indigo-400',
  },
  COMPLETED: {
    label: 'Completed',
    icon: ShieldCheck,
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    dotBg: 'bg-indigo-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    dotBg: 'bg-slate-400',
  },
  REJECTED: {
    label: 'Rejected',
    icon: Ban,
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dotBg: 'bg-rose-400',
  },
  NO_SHOW: {
    label: 'No Show',
    icon: UserX,
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    dotBg: 'bg-orange-400',
  },
  DISPUTED: {
    label: 'Disputed',
    icon: AlertTriangle,
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    dotBg: 'bg-red-400 animate-pulse',
  },
  RESOLVED: {
    label: 'Resolved',
    icon: CheckSquare,
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
    dotBg: 'bg-teal-400',
  },

  AVAILABLE: {
    label: 'Available',
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dotBg: 'bg-emerald-400',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon: Wrench,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dotBg: 'bg-amber-400',
  },
  OFFLINE: {
    label: 'Offline',
    icon: PowerOff,
    bg: 'bg-slate-600/10',
    text: 'text-slate-400',
    border: 'border-slate-600/20',
    dotBg: 'bg-slate-500',
  },
  DECOMMISSIONED: {
    label: 'Decommissioned',
    icon: Archive,
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dotBg: 'bg-rose-500',
  },

  EXCELLENT: {
    label: 'Excellent',
    icon: Sparkles,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dotBg: 'bg-emerald-400',
  },
  GOOD: {
    label: 'Good',
    icon: CheckCircle2,
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
    dotBg: 'bg-teal-400',
  },
  FAIR: {
    label: 'Fair',
    icon: AlertCircle,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dotBg: 'bg-amber-400',
  },
  POOR: {
    label: 'Poor',
    icon: AlertTriangle,
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    dotBg: 'bg-orange-400',
  },
  DAMAGED: {
    label: 'Damaged',
    icon: Ban,
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    dotBg: 'bg-red-400',
  },

  OPEN: {
    label: 'Open',
    icon: AlertCircle,
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    dotBg: 'bg-red-400 animate-pulse',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    icon: Clock,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dotBg: 'bg-amber-400',
  },
  ADJUDICATED: {
    label: 'Adjudicated',
    icon: Scale,
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    dotBg: 'bg-indigo-400',
  },
  DISMISSED: {
    label: 'Dismissed',
    icon: CheckSquare,
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    dotBg: 'bg-slate-400',
  },

  LOW: {
    label: 'Low Severity',
    icon: Info,
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    dotBg: 'bg-blue-400',
  },
  MEDIUM: {
    label: 'Medium Severity',
    icon: AlertCircle,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dotBg: 'bg-amber-400',
  },
  HIGH: {
    label: 'High Severity',
    icon: AlertTriangle,
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    dotBg: 'bg-orange-400',
  },
  CRITICAL: {
    label: 'Critical Severity',
    icon: Flame,
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dotBg: 'bg-rose-400 animate-ping',
  },

  LEVEL_1_GENERAL: {
    label: 'Level 1: General',
    icon: Shield,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dotBg: 'bg-emerald-400',
  },
  LEVEL_2_SUPERVISED: {
    label: 'Level 2: Supervised',
    icon: ShieldAlert,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dotBg: 'bg-amber-400',
  },
  LEVEL_3_RESTRICTED: {
    label: 'Level 3: Restricted',
    icon: Ban,
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dotBg: 'bg-rose-400',
  },
};

const SIZE_CLASSES = {
  xs: {
    badge: 'px-1.5 py-0.5 text-[10px] gap-1',
    icon: 'w-2.5 h-2.5',
    dot: 'w-1 h-1',
  },
  sm: {
    badge: 'px-2 py-0.5 text-xs gap-1.5',
    icon: 'w-3 h-3',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    badge: 'px-2.5 py-1 text-xs gap-1.5 font-medium',
    icon: 'w-3.5 h-3.5',
    dot: 'w-2 h-2',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm gap-2 font-medium',
    icon: 'w-4 h-4',
    dot: 'w-2 h-2',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  showDot = false,
  className = '',
  labelOverride,
}) => {
  const normalizedKey = status ? String(status).toUpperCase() : 'UNKNOWN';
  const config: BadgeConfig = BADGE_CONFIGS[normalizedKey] || {
    label: String(status || 'Unknown'),
    icon: Info,
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    dotBg: 'bg-slate-400',
  };

  const sizeStyle = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const IconComponent = config.icon;
  const displayLabel = labelOverride || config.label;

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all duration-150 ${config.bg} ${config.text} ${config.border} ${sizeStyle.badge} ${className}`}
    >
      {showDot && (
        <span className={`rounded-full shrink-0 ${sizeStyle.dot} ${config.dotBg}`} />
      )}
      {showIcon && !showDot && (
        <IconComponent className={`shrink-0 ${sizeStyle.icon}`} />
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
