import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardCheck,
  FlaskConical,
  GraduationCap,
  LockKeyhole,
  LogOut,
  Menu,
  Microscope,
  Radio,
  ScanLine,
  Scale,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { RoleSwitcher } from '../../components/common/RoleSwitcher';

interface NavItem {
  label: string;
  path: string;
  isSyncing?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Catalog', path: '/resources' },
  { label: 'My Bookings', path: '/bookings' },
  { label: 'Handover & Return', path: '/inspections' },
  { label: 'Incidents', path: '/incidents' },
  { label: 'Audit Ledger', path: '/audit', isSyncing: true },
];

interface InnovationItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  accent: 'emerald' | 'blue' | 'violet' | 'cyan' | 'amber';
  badge?: string;
  path: string;
}

const INNOVATIONS: InnovationItem[] = [
  {
    icon: ShieldCheck,
    title: 'Deterministic 7-Gate Safety',
    body: 'Role check, certifications, hazard training, quota, schedule, cooldown & verification.',
    accent: 'emerald',
    path: '/resources',
  },
  {
    icon: LockKeyhole,
    title: 'Atomic Half-Open Scheduling',
    body: '[t_start, t_end) collision-free bookings, buffer windows & automatic cooldowns.',
    accent: 'blue',
    path: '/resources',
  },
  {
    icon: Scale,
    title: 'Anti-Monopoly F-Formula',
    body: 'Weighted queue priorities & dynamic quadratic quotas based on historical usage.',
    accent: 'violet',
    path: '/waitlist',
  },
  {
    icon: ScanLine,
    title: 'Digital Custody & Sensor Diffing',
    body: 'PIN handovers, pre/post checklists, telemetry deltas & bilateral return signoffs.',
    accent: 'cyan',
    path: '/bookings',
  },
  {
    icon: ClipboardCheck,
    title: 'Cryptographic SHA-256 Audit Ledger',
    body: 'Chronological block explorer, merkle-chained hashes & SHA-256 verification engine.',
    accent: 'amber',
    badge: '100% intact',
    path: '/audit',
  },
];

const LIFECYCLE_STEPS = [
  { label: 'Discovery', status: 'Draft', color: 'muted', path: '/resources' },
  { label: '7-Gate Safety', status: 'Pending', color: 'amber', path: '/resources' },
  { label: 'Manager Review', status: 'Approved', color: 'green', path: '/review' },
  { label: 'Digital PIN Access', status: 'Handover', color: 'blue', path: '/bookings' },
  { label: 'Post-Use Diffing', status: 'Diff', color: 'violet', path: '/bookings' },
  { label: 'Dispute Resolution', status: 'Closed', color: 'green', path: '/incidents' },
];

const FOOTER_COLUMNS = [
  {
    title: 'CORE INSTRUMENTS',
    links: [
      { text: 'Electron Microscopes (SEM/TEM)', path: '/resources' },
      { text: 'ISO Class 5 Cleanroom Bays', path: '/resources' },
      { text: 'High-Field NMR Spectrometers', path: '/resources' },
      { text: 'Precision 5-Axis CNC Machining', path: '/resources' },
      { text: 'Metal Additive Makerspaces', path: '/resources' },
    ],
  },
  {
    title: 'SAFETY & STANDARDS',
    links: [
      { text: 'Laser Safety Protocols (L1-L3)', path: '/resources' },
      { text: 'Hazardous Chemicals Handling', path: '/resources' },
      { text: 'Metrology Delta Verification', path: '/bookings' },
      { text: 'Bilateral Return Inspections', path: '/bookings' },
      { text: 'Research Grant Compliance', path: '/review' },
    ],
  },
  {
    title: 'GOVERNANCE',
    links: [
      { text: 'Anti-Monopolization Quotas', path: '/waitlist' },
      { text: '24-Hour SLA Review Queue', path: '/review' },
      { text: 'Fairness Score Waitlist Promotion', path: '/waitlist' },
      { text: 'Dispute Adjudication Panel', path: '/incidents' },
      { text: 'Cryptographic Block Ledger', path: '/audit' },
    ],
  },
];

const ACCENT_STYLES = {
  emerald: {
    card: 'border-emerald-500/20 bg-emerald-500/[0.04] hover:border-emerald-400/50 hover:bg-emerald-500/[0.08]',
    iconBox: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    titleHover: 'group-hover:text-emerald-300',
    badge: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  },
  blue: {
    card: 'border-blue-500/20 bg-blue-500/[0.04] hover:border-blue-400/50 hover:bg-blue-500/[0.08]',
    iconBox: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    titleHover: 'group-hover:text-blue-300',
    badge: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
  },
  violet: {
    card: 'border-violet-500/20 bg-violet-500/[0.04] hover:border-violet-400/50 hover:bg-violet-500/[0.08]',
    iconBox: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    titleHover: 'group-hover:text-violet-300',
    badge: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  },
  cyan: {
    card: 'border-cyan-500/20 bg-cyan-500/[0.04] hover:border-cyan-400/50 hover:bg-cyan-500/[0.08]',
    iconBox: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    titleHover: 'group-hover:text-cyan-300',
    badge: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
  },
  amber: {
    card: 'border-amber-500/20 bg-amber-500/[0.04] hover:border-amber-400/50 hover:bg-amber-500/[0.08]',
    iconBox: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    titleHover: 'group-hover:text-amber-300',
    badge: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  },
};

export const UniShareLanding: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, activeRole, logout, token } = useAuth();
  const { unreadCount, isConnected } = useSocket();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return 'Student';
      case 'RESEARCHER':
        return 'Researcher';
      case 'LAB_MANAGER':
        return 'Lab Manager';
      case 'DEPARTMENT_HEAD':
        return 'Dept Head';
      case 'AUDITOR':
        return 'Auditor';
      case 'ADMIN':
        return 'Dean / Admin';
      default:
        return role;
    }
  };

  const displayName = currentUser?.name || 'Alex Mercer';
  const displayRole = formatRoleLabel(activeRole || 'STUDENT');
  const displayDepartment = currentUser?.department || 'Physics';
  const displayTrust = currentUser?.trustScore ?? 85;

  return (
    <div className="min-h-screen overflow-hidden bg-[#050817] text-slate-100 selection:bg-indigo-500/30">
      
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#060a1c]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 lg:px-8">
          
          <Link
            to="/"
            className="flex items-center gap-3 group transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="grid size-11 place-items-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 shadow-[0_0_24px_rgba(99,102,241,.15)] transition-colors group-hover:border-indigo-400/70 group-hover:bg-indigo-500/20">
              <FlaskConical className="size-5" />
            </div>
            <div className="leading-none">
              <div className="flex items-center gap-2 font-semibold tracking-tight text-white text-base">
                UniShare Labs{' '}
                <span className="rounded border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-1 text-[9px] font-bold tracking-[.18em] text-indigo-300">
                  ACADEMIC
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 font-mono tracking-tight">
                Research Resource Platform
              </p>
            </div>
          </Link>

          
          <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path)}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition-all duration-150 hover:bg-white/[0.05] hover:text-white"
              >
                {item.label}
                {item.isSyncing && (
                  <span className="ml-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-amber-400">
                    <i className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {isConnected ? 'SYNCING' : 'CONNECTING'}
                  </span>
                )}
              </button>
            ))}
          </nav>

          
          <div className="hidden items-center gap-3 md:flex">
            
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              aria-label="Notifications"
              className="relative grid size-9 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:border-indigo-400/50 hover:text-indigo-300"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[0.05] px-3 py-1.5 transition-all duration-200 hover:border-cyan-400/60 hover:bg-cyan-400/[0.1] text-left"
                title="Click to switch persona role"
              >
                <div className="grid size-7 place-items-center rounded-full bg-cyan-500/15 text-cyan-300">
                  <GraduationCap className="size-4" />
                </div>
                <div className="leading-none">
                  <p className="text-xs font-semibold text-white">
                    {displayName}{' '}
                    <span className="ml-1 text-[10px] font-normal text-emerald-300">
                      {displayRole}
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {displayDepartment} ·{' '}
                    <span className="font-semibold text-emerald-400">{displayTrust} Trust</span>
                  </p>
                </div>
                <ChevronDown className="ml-1 size-3.5 text-slate-400" />
              </button>

              
              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl z-50">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Fast Persona Switch
                    </span>
                    <button
                      type="button"
                      onClick={() => setRoleDropdownOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <RoleSwitcher onSelect={() => setRoleDropdownOpen(false)} />
                </div>
              )}
            </div>

            
            {token ? (
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                title="Sign out of current account"
              >
                <LogOut className="size-3.5" />
                <span>Logout</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_0_22px_rgba(99,102,241,.3)] transition-all duration-200 hover:scale-105 hover:bg-indigo-500"
                >
                  + Register
                </button>
              </>
            )}
          </div>

          
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid size-10 place-items-center rounded-lg border border-white/10 text-slate-300 md:hidden hover:border-white/25"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        
        {mobileOpen && (
          <div className="border-t border-white/10 bg-[#060a1c] px-5 py-4 md:hidden">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-cyan-300" />
                <span className="text-xs font-semibold text-white">{displayName}</span>
                <span className="text-[10px] text-emerald-300">({displayRole})</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Trust: {displayTrust}</span>
            </div>

            <div className="flex flex-col space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-300 hover:bg-white/[0.05] hover:text-white"
                >
                  <span>{item.label}</span>
                  {item.isSyncing && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                      <i className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2">
              <div className="mb-1 text-xs font-semibold text-slate-400 uppercase font-mono">
                Switch Role
              </div>
              <RoleSwitcher onSelect={() => setMobileOpen(false)} />

              <div className="mt-3 flex gap-2">
                {token ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-center text-xs font-semibold text-red-300"
                  >
                    Logout
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/login');
                        setMobileOpen(false);
                      }}
                      className="flex-1 rounded-lg border border-white/10 py-2 text-center text-xs font-semibold text-slate-200"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/register');
                        setMobileOpen(false);
                      }}
                      className="flex-1 rounded-lg bg-indigo-600 py-2 text-center text-xs font-semibold text-white"
                    >
                      + Register
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      
      <main>
        
        <section className="relative mx-auto max-w-[1440px] px-5 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24">
          
          <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-96 w-[720px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[130px]" />

          <div className="relative z-10 grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[.22em] text-indigo-300 backdrop-blur-md">
                <Sparkles className="size-3.5 text-indigo-400" />
                Institutional access, re-engineered
              </div>

              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-.045em] text-white sm:text-6xl lg:text-7xl">
                Unlock{' '}
                <span className="bg-gradient-to-r from-indigo-300 via-blue-300 to-cyan-200 bg-clip-text text-transparent">
                  Institutional
                </span>{' '}
                Research Potential.
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-slate-400">
                Eliminate bottlenecks for multi-million-dollar scientific instrumentation with
                deterministic safety gates, atomic scheduling, and cryptographic audit trails.
              </p>

              <div className="mt-9 flex flex-wrap gap-3.5">
                <button
                  type="button"
                  onClick={() => navigate('/resources')}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(99,102,241,.35)] transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 hover:bg-indigo-500 active:scale-95"
                >
                  Explore Equipment Catalog <ArrowUpRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/audit')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-slate-200 transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-indigo-400/10 active:scale-95"
                >
                  View SHA-256 Ledger <BookOpen className="size-4" />
                </button>
              </div>

              
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-400" />
                  Deterministic access gates
                </span>
                <span className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-400" />
                  Append-only records
                </span>
                <span className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-400" />
                  Fairness by design
                </span>
              </div>
            </div>

            
            <div className="grid gap-3.5 sm:grid-cols-2">
              <FeatureCard
                icon={ShieldCheck}
                label="01 / SAFETY"
                title="Determine Safety"
                body="Role check, certifications, hazard audit & prerequisite compliance."
                accent="emerald"
                onClick={() => navigate('/resources')}
              />

              <FeatureCard
                icon={Timer}
                label="02 / SCHEDULING"
                title="Atomic Half-Open Scheduling"
                body="[t_start, t_end) collision-free bookings, buffer windows & cooldowns."
                accent="blue"
                onClick={() => navigate('/resources')}
              />

              
              <div className="relative overflow-hidden rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.06] p-5 sm:col-span-2 backdrop-blur-md">
                <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-[.2em] uppercase text-indigo-300 font-mono">
                      SYSTEM SNAPSHOT
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      98.7<span className="text-base text-slate-400 font-normal">% uptime</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      28 Instruments · 6 Institutional Labs · 100% Chain Integrity
                    </p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-xl border border-indigo-300/20 bg-indigo-300/10 text-indigo-300">
                    <Radio className="size-5 animate-pulse" />
                  </div>
                </div>

                
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-indigo-950/80">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-400 to-cyan-300 w-[98.7%] transition-all duration-1000 ease-out" />
                </div>
              </div>
            </div>
          </div>
        </section>

        
        <section className="border-y border-white/[0.07] bg-[#080d20]/70 py-16 lg:py-20">
          <div className="mx-auto max-w-[1440px] px-5 lg:px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-bold tracking-[.25em] text-indigo-300 font-mono uppercase">
                  CORE SYSTEMS
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Built for the laboratory edge cases.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-400">
                Every interaction is a safety decision, an atomic scheduling constraint, or an
                immutable SHA-256 cryptographic record.
              </p>
            </div>

            <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-5">
              {INNOVATIONS.map((item) => (
                <InnovationCard key={item.title} item={item} onClick={() => navigate(item.path)} />
              ))}
            </div>
          </div>
        </section>

        
        <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-8 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[.25em] text-cyan-300 font-mono uppercase">
                THE CONTROL PLANE
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                10-step resource sharing lifecycle
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Half-open interval scheduling <span className="mx-2 text-slate-700">·</span>{' '}
                Append-only SHA-256 audit ledger
              </p>
            </div>

            <div className="inline-flex items-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-3.5 py-2 text-xs font-medium text-emerald-300">
              <span className="mr-2 inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational · API v1 Connected
            </div>
          </div>

          
          <div className="mt-14 overflow-x-auto pb-4 no-scrollbar">
            <div className="relative grid min-w-[900px] grid-cols-6 gap-4">
              
              <div className="absolute left-[8%] right-[8%] top-5 h-0.5 overflow-hidden bg-slate-800">
                <div className="flow-line h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              </div>

              {LIFECYCLE_STEPS.map((step, index) => {
                const getStepStyle = (color: string) => {
                  switch (color) {
                    case 'green':
                      return 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.15)]';
                    case 'amber':
                      return 'border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)]';
                    case 'blue':
                      return 'border-blue-400/50 bg-blue-400/10 text-blue-300 shadow-[0_0_15px_rgba(96,165,250,0.15)]';
                    case 'violet':
                      return 'border-violet-400/50 bg-violet-400/10 text-violet-300 shadow-[0_0_15px_rgba(167,139,250,0.15)]';
                    default:
                      return 'border-slate-700 bg-slate-900 text-slate-400';
                  }
                };

                return (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => navigate(step.path)}
                    className="group relative flex flex-col items-center text-center transition-transform hover:-translate-y-1"
                  >
                    <div
                      className={`z-10 grid size-11 place-items-center rounded-full border transition-transform duration-200 group-hover:scale-110 ${getStepStyle(
                        step.color
                      )}`}
                    >
                      <span className="text-xs font-bold font-mono">0{index + 1}</span>
                    </div>
                    <p className="mt-4 text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {step.label}
                    </p>
                    <span className="mt-2 rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-mono text-slate-400 group-hover:border-white/20">
                      {step.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-[#030612]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.25fr_2fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
                  <Microscope className="size-5" />
                </div>
                <p className="text-lg font-semibold text-white">UniShare Labs</p>
              </div>

              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
                Institutional resource-sharing platform engineered for academic laboratories,
                advanced instrumentation, and shared makerspaces across the complete 10-step sharing
                lifecycle.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2 font-mono text-[10px] tracking-wide text-emerald-300">
                <i className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM HEALTH: 100% <span className="text-slate-600">·</span> API v1 RFC 7807
              </div>
            </div>

            <div className="grid gap-10 sm:grid-cols-3">
              {FOOTER_COLUMNS.map((column) => (
                <div key={column.title}>
                  <h3 className="font-mono text-[10px] font-bold tracking-[.2em] uppercase text-slate-300">
                    {column.title}
                  </h3>
                  <ul className="mt-5 flex flex-col gap-3">
                    {column.links.map((link) => (
                      <li key={link.text}>
                        <button
                          type="button"
                          onClick={() => navigate(link.path)}
                          className="text-left text-sm text-slate-400 transition-colors duration-150 hover:text-indigo-300"
                        >
                          {link.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6 text-xs text-slate-500">
            <p>© 2026 UniShare Labs. University Resource-Sharing Platform. All rights reserved.</p>
            <div className="flex gap-5">
              <span className="font-mono text-[11px]">Release v1.0.0</span>
              <button
                type="button"
                onClick={() => navigate('/audit')}
                className="hover:text-slate-400 transition"
              >
                Audited Protocols
              </button>
              <button
                type="button"
                onClick={() => navigate('/resources')}
                className="hover:text-slate-400 transition"
              >
                Catalog Index
              </button>
            </div>
          </div>
        </div>
      </footer>

      <aside
        aria-label="Demo Persona Quick Switcher"
        className="fixed bottom-5 right-5 z-40 hidden sm:flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0b1227]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl ring-1 ring-white/10 hover:border-indigo-500/50 transition-all duration-200"
      >
        <div className="text-right">
          <p className="font-mono text-[9px] tracking-[.16em] uppercase text-slate-400">
            DEMO PERSONA
          </p>
          <p className="mt-0.5 text-xs font-semibold text-white">1-Click Switch</p>
        </div>
        <RoleSwitcher />
      </aside>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  body: string;
  accent: 'emerald' | 'blue' | 'violet' | 'cyan' | 'amber';
  onClick?: () => void;
}

function FeatureCard({ icon: Icon, label, title, body, accent, onClick }: FeatureCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${styles.card}`}
    >
      <div className="flex items-center justify-between">
        <div className={`grid size-10 place-items-center rounded-xl ${styles.iconBox}`}>
          <Icon className="size-5" />
        </div>
        <span className="font-mono text-[10px] text-slate-500 tracking-wider font-semibold">
          {label}
        </span>
      </div>
      <h3 className={`mt-6 text-base font-semibold text-white transition-colors ${styles.titleHover}`}>
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}

interface InnovationCardProps {
  item: InnovationItem;
  onClick?: () => void;
}

function InnovationCard({ item, onClick }: InnovationCardProps) {
  const Icon = item.icon;
  const styles = ACCENT_STYLES[item.accent];

  return (
    <article
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.015] hover:border-slate-500/40 hover:bg-white/[0.04]`}
    >
      <div className={`mb-7 grid size-10 place-items-center rounded-xl ${styles.iconBox}`}>
        <Icon className="size-5" />
      </div>

      <h3 className={`text-sm font-semibold leading-5 text-white transition-colors ${styles.titleHover}`}>
        {item.title}
      </h3>

      <p className="mt-3 text-xs leading-5 text-slate-400">{item.body}</p>

      {item.badge && (
        <span
          className={`mt-4 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-mono ${styles.badge}`}
        >
          <Check className="size-2.5" />
          {item.badge}
        </span>
      )}

      <div className="pointer-events-none absolute -bottom-10 -right-10 size-24 rounded-full bg-indigo-500/10 blur-2xl transition-opacity duration-300 group-hover:bg-indigo-500/25" />
    </article>
  );
}

export default UniShareLanding;

