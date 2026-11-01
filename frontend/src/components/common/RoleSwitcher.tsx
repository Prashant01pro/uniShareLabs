import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap,
  Microscope,
  Cpu,
  ClipboardList,
  ShieldAlert,
  ChevronDown,
  Check,
  Loader2,
  Sparkles,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth, DEMO_PERSONAS } from '../../context/AuthContext';
import { UserRole } from '../../types';

export interface RoleSwitcherProps {
  compact?: boolean;
  className?: string;
  onSelect?: () => void;
}

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  STUDENT: <GraduationCap className="w-4 h-4 text-emerald-400" />,
  RESEARCHER: <Microscope className="w-4 h-4 text-cyan-400" />,
  RESOURCE_OWNER: <Cpu className="w-4 h-4 text-purple-400" />,
  LAB_MANAGER: <ClipboardList className="w-4 h-4 text-amber-400" />,
  ADMIN: <ShieldAlert className="w-4 h-4 text-rose-400" />,
};

const ROLE_THEMES: Record<
  UserRole,
  { border: string; bg: string; badge: string; text: string; ring: string }
> = {
  STUDENT: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    text: 'text-emerald-400',
    ring: 'focus:ring-emerald-500/40',
  },
  RESEARCHER: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    text: 'text-cyan-400',
    ring: 'focus:ring-cyan-500/40',
  },
  RESOURCE_OWNER: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    text: 'text-purple-400',
    ring: 'focus:ring-purple-500/40',
  },
  LAB_MANAGER: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    text: 'text-amber-400',
    ring: 'focus:ring-amber-500/40',
  },
  ADMIN: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    text: 'text-rose-400',
    ring: 'focus:ring-rose-500/40',
  },
};

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  compact = false,
  className = '',
  onSelect,
}) => {
  const { currentUser, activeRole, switchPersona, isSwitchingPersona } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [targetSwitchRole, setTargetSwitchRole] = useState<UserRole | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentTheme = ROLE_THEMES[activeRole] || ROLE_THEMES.STUDENT;
  const currentPersona = DEMO_PERSONAS[activeRole] || DEMO_PERSONAS.STUDENT;
  const trustScore = currentUser?.trustScore ?? currentPersona.trustScore;

  const handleSelectRole = async (role: UserRole) => {
    if (role === activeRole) {
      setIsOpen(false);
      onSelect?.();
      return;
    }

    try {
      setTargetSwitchRole(role);
      await switchPersona(role);
      onSelect?.();
    } catch (err) {
      console.error('Failed to switch persona:', err);
    } finally {
      setTargetSwitchRole(null);
      setIsOpen(false);
    }
  };

  const rolesList: UserRole[] = [
    'STUDENT',
    'RESEARCHER',
    'RESOURCE_OWNER',
    'LAB_MANAGER',
    'ADMIN',
  ];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchingPersona}
        className={`group flex items-center space-x-2.5 px-3 py-1.5 rounded-full border transition-all duration-200 bg-surface-900/90 hover:bg-surface-800 ${currentTheme.border} ${currentTheme.ring} shadow-sm`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className={`p-1 rounded-full ${currentTheme.bg}`}>
          {isSwitchingPersona ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
          ) : (
            ROLE_ICONS[activeRole]
          )}
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-white tracking-tight truncate max-w-[120px] sm:max-w-[160px]">
              {currentUser?.name || currentPersona.name}
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${currentTheme.badge}`}
            >
              {currentPersona.badge}
            </span>
          </div>

          {!compact && (
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="truncate max-w-[100px]">
                {currentUser?.department || currentPersona.department}
              </span>
              <span>•</span>
              <span className="flex items-center space-x-0.5 text-emerald-400 font-mono">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>{trustScore} Trust</span>
              </span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 group-hover:text-white ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl p-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Instant Persona Switcher</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">1-Click RBAC</span>
          </div>

          <div className="space-y-1">
            {rolesList.map((role) => {
              const persona = DEMO_PERSONAS[role];
              const isSelected = activeRole === role;
              const isPending = targetSwitchRole === role && isSwitchingPersona;
              const theme = ROLE_THEMES[role];

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  disabled={isSwitchingPersona}
                  className={`w-full flex items-start space-x-3 p-2.5 rounded-xl text-left transition-all duration-150 group ${
                    isSelected
                      ? `${theme.bg} border ${theme.border} shadow-sm`
                      : 'hover:bg-surface-800/80 border border-transparent'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${theme.bg} border ${theme.border} mt-0.5`}
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                    ) : (
                      ROLE_ICONS[role]
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="text-xs font-bold text-white truncate">
                          {persona.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${theme.badge}`}
                        >
                          {persona.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-1">
                      {persona.description}
                    </p>

                    <div className="mt-1.5 flex items-center space-x-3 text-[10px] font-mono text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[120px]">{persona.department}</span>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400">
                        {persona.trustScore} Trust
                      </span>
                      <span>•</span>
                      <span className="text-indigo-300">
                        {persona.quotaHours}h/wk
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 px-2 py-1 text-[10px] text-slate-500 text-center">
            Deterministic University RBAC • Instant Token Rotation
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
