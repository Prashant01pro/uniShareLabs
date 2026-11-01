import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Microscope, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface DemoAccount {
  role: UserRole;
  name: string;
  email: string;
  department: string;
  avatar: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'STUDENT',
    name: 'Alex Mercer',
    email: 'student@university.edu',
    department: 'Physics',
    avatar: '👨‍🎓',
    description: 'Undergraduate student (Laser Safety induction)',
  },
  {
    role: 'RESEARCHER',
    name: 'Dr. Elena Rostova',
    email: 'researcher@university.edu',
    department: 'Materials Science',
    avatar: '🔬',
    description: 'Senior Researcher (Electron Microscopy & Cleanroom certified)',
  },
  {
    role: 'RESOURCE_OWNER',
    name: 'Prof. Marcus Vance',
    email: 'owner@university.edu',
    department: 'Physics',
    avatar: '⚙️',
    description: 'Lab Director & Equipment Custodian',
  },
  {
    role: 'LAB_MANAGER',
    name: 'Dr. Sarah Jenkins',
    email: 'manager@university.edu',
    department: 'Materials Science',
    avatar: '📋',
    description: 'Facilities Manager (Reviews & SLA approvals)',
  },
  {
    role: 'ADMIN',
    name: 'Arthur Pendelton',
    email: 'admin@university.edu',
    department: 'Central Administration',
    avatar: '🛡️',
    description: 'Compliance Officer (SHA-256 Audit Ledger & Disputes)',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchPersona } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both your institutional email and password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/resources');
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please verify your credentials.';
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demo: DemoAccount) => {
    setEmail(demo.email);
    setPassword('Password123!');
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await switchPersona(demo.role);
      navigate('/resources');
    } catch {
      try {
        await login(demo.email, 'Password123!');
        navigate('/resources');
      } catch (err: any) {
        setErrorMessage('Failed to sign in as demo persona.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        
        <div className="lg:col-span-7 bg-surface-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center sm:text-left mb-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-mono mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SECURE ACCESS PORTAL</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Sign In</h1>
            <p className="text-sm text-slate-400 mt-1">
              Sign in with your university credentials to reserve research instruments and manage lab spaces.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-950/80 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500">Default demo: Password123!</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-950/80 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all shadow-lg shadow-brand-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Don't have an institutional account yet?</span>
            <Link
              to="/register"
              className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              Create Account →
            </Link>
          </div>
        </div>

        
        <div className="lg:col-span-5 bg-gradient-to-br from-surface-900 via-surface-900/90 to-surface-950 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Judge & Evaluator Fast Pass
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Click any seeded academic persona to immediately sign in and evaluate their personalized permissions, quota rules, and review queues:
          </p>

          <div className="space-y-2.5">
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.role}
                type="button"
                onClick={() => handleQuickDemo(demo)}
                disabled={isSubmitting}
                className="w-full p-3 rounded-xl bg-surface-950/70 hover:bg-brand-600/10 border border-slate-800 hover:border-brand-500/40 text-left transition-all group flex items-start space-x-3 cursor-pointer"
              >
                <span className="text-xl p-1 bg-surface-900 rounded-lg border border-slate-800">
                  {demo.avatar}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors truncate">
                      {demo.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-800 text-slate-300 border border-slate-700">
                      {demo.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {demo.department} • {demo.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Tokens refresh automatically with RFC 6819 breach rotation.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;

