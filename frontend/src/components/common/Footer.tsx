import React from 'react';
import {
  Microscope,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  Lock,
  GitCommit,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800 bg-surface-950 text-slate-400 text-xs">
      
      <div className="border-b border-slate-800/80 bg-surface-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center sm:text-left">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-200 text-xs">Half-Open Scheduling</div>
                <div className="text-[10px] text-slate-400 font-mono">[t_start, t_end) collision-free</div>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-200 text-xs">Append-Only Audit</div>
                <div className="text-[10px] text-slate-400 font-mono">SHA-256 cryptographic chain</div>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-200 text-xs">Deterministic RBAC</div>
                <div className="text-[10px] text-slate-400 font-mono">5 university roles & quotas</div>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-200 text-xs">Metrology Invariance</div>
                <div className="text-[10px] text-slate-400 font-mono">Digital custody & photo diffs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-brand-600/20 border border-brand-500/30 rounded-xl text-brand-400">
                <Microscope className="w-5 h-5" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                UniShare Labs
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Institutional resource-sharing platform engineered for academic laboratories,
              advanced instrumentation, and shared makerspaces across the complete 10-step sharing lifecycle.
            </p>
            <div className="pt-2 flex items-center space-x-3 text-[11px] font-mono text-slate-400">
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-surface-900 border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>SYSTEM HEALTH: 100%</span>
              </span>
              <span>•</span>
              <span>API v1 RFC 7807</span>
            </div>
          </div>

          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              Core Instruments
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className="hover:text-white transition-colors cursor-pointer">
                Electron Microscopes (SEM/TEM)
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                ISO Class 5 Cleanroom Bays
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                High-Field NMR Spectrometers
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Precision 5-Axis CNC Machining
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Metal Additive Makerspaces
              </li>
            </ul>
          </div>

          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              Safety & Standards
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className="hover:text-white transition-colors cursor-pointer">
                Laser Safety Protocols (L1-L3)
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Hazardous Chemicals Handling
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Metrology Delta Verification
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Bilateral Return Inspections
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Research Grant Compliance
              </li>
            </ul>
          </div>

          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              Governance
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className="hover:text-white transition-colors cursor-pointer">
                Anti-Monopolization Quotas
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                24-Hour SLA Review Queue
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Fairness Score Waitlist Promotion
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Dispute Adjudication Panel
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Cryptographic Block Ledger
              </li>
            </ul>
          </div>
        </div>

        
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 space-y-3 sm:space-y-0">
          <div>
            &copy; 2026 UniShare Labs. University Resource-Sharing Platform. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <span className="font-mono text-slate-400">Release v1.0.0</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Privacy & Data Custody</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Security Ledger</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
