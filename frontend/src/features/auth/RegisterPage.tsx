import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Microscope,
  Lock,
  Mail,
  User,
  Building,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { UserRole } from '../../types';

const ACADEMIC_DEPARTMENTS = [
  'Materials Science & Engineering',
  'Physics & Applied Physics',
  'Mechanical Engineering',
  'Electrical & Computer Engineering',
  'Biochemistry & Molecular Biology',
  'Chemical Engineering',
  'Nanotechnology & Quantum Engineering',
  'Central Administration',
];

const ROLE_OPTIONS: { role: UserRole; title: string; desc: string; icon: string }[] = [
  {
    role: 'STUDENT',
    title: 'Student Researcher',
    desc: 'Undergraduate or graduate researcher (10h weekly quota limit)',
    icon: '👨‍🎓',
  },
  {
    role: 'RESEARCHER',
    title: 'Staff / Postdoctoral Researcher',
    desc: 'Certified researcher eligible for high-hazard equipment (25h quota)',
    icon: '🔬',
  },
  {
    role: 'RESOURCE_OWNER',
    title: 'Lab Director / Principal Investigator',
    desc: 'Custodians listing and managing laboratory instruments (40h quota)',
    icon: '⚙️',
  },
  {
    role: 'LAB_MANAGER',
    title: 'Laboratory Facilities Manager',
    desc: 'Responsible for reservation reviews, SLA approvals, and safety inspections',
    icon: '📋',
  },
];

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(ACADEMIC_DEPARTMENTS[0]);
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !department) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage(
        'Password must be at least 8 characters with uppercase, lowercase, digit, and special symbol.'
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        department,
      });

      await login(email.trim().toLowerCase(), password);
      navigate('/resources');
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please verify that this institutional email is not already registered.';
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-surface-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-mono mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>INSTITUTIONAL REGISTRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Register Academic Account
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Join the UniShare Labs network to reserve specialized testing devices, cleanrooms, and fabrication facilities.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jordan Hayes"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-950/80 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="j.hayes@university.edu"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-950/80 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          </div>

          
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Academic Department / Faculty
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Building className="w-4 h-4" />
              </div>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-surface-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
              >
                {ACADEMIC_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-surface-900 text-white">
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Select Your Academic Role & Authorization Scope
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => (
                <div
                  key={opt.role}
                  onClick={() => setRole(opt.role)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    role === opt.role
                      ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm'
                      : 'bg-surface-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-xs font-bold">{opt.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Account Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters (e.g., SecurePass123!)"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-surface-950/80 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <span
                className={`flex items-center space-x-1 ${
                  hasMinLength ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>8+ Characters</span>
              </span>
              <span
                className={`flex items-center space-x-1 ${
                  hasUpper && hasLower ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Upper & Lower</span>
              </span>
              <span
                className={`flex items-center space-x-1 ${
                  hasDigit ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>At least 1 Digit</span>
              </span>
              <span
                className={`flex items-center space-x-1 ${
                  hasSpecial ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Special Symbol</span>
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isPasswordValid}
            className="w-full mt-4 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all shadow-lg shadow-brand-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Registering Account...</span>
              </div>
            ) : (
              <>
                <span>Complete Registration & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <span>Already registered with UniShare Labs?</span>{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            Sign In to your account →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

