import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Compass,
  CalendarCheck,
  Layers,
  Clock,
  AlertOctagon,
  FileCheck,
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import { RoleSwitcher } from './components/common/RoleSwitcher';

import ResourceCatalog from './features/catalog/ResourceCatalog';
import BookingsList from './features/bookings/BookingsList';
import ReviewQueue from './features/management/ReviewQueue';
import WaitlistManager from './features/management/WaitlistManager';
import DisputeCenter from './features/audit/DisputeCenter';
import AuditLedgerView from './features/audit/AuditLedgerView';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import UniShareLanding from './features/home/UniShareLanding';

export type ConsoleTab =
  | 'catalog'
  | 'bookings'
  | 'reviews'
  | 'waitlist'
  | 'disputes'
  | 'audit';

interface TabDefinition {
  id: ConsoleTab;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}

const CONSOLE_TABS: TabDefinition[] = [
  {
    id: 'catalog',
    label: 'Equipment Catalog',
    path: '/resources',
    icon: Compass,
    description: 'Search, Filter, 7-Gate Eligibility & Booking',
  },
  {
    id: 'bookings',
    label: 'My Bookings',
    path: '/bookings',
    icon: CalendarCheck,
    description: 'PIN Reveal, Check-In, Return & Condition Diffing',
  },
  {
    id: 'reviews',
    label: 'Review Queue',
    path: '/review',
    icon: Layers,
    badge: '48h SLA',
    description: 'Manager Review, Trust Validation & Delegation',
  },
  {
    id: 'waitlist',
    label: 'Fairness Waitlist',
    path: '/waitlist',
    icon: Clock,
    badge: 'F-Score',
    description: 'Anti-Monopolization Fair Queue & 2h Offer Acceptance',
  },
  {
    id: 'disputes',
    label: 'Dispute Resolution',
    path: '/incidents',
    icon: AlertOctagon,
    description: 'Evidence Diffing, Defense Filing & Adjudication',
  },
  {
    id: 'audit',
    label: 'SHA-256 Audit Ledger',
    path: '/audit',
    icon: FileCheck,
    badge: 'Immutable',
    description: 'Append-Only Cryptographic Chain & Verification',
  },
];

const ROUTE_TO_TAB: Record<string, ConsoleTab> = {
  '/': 'catalog',
  '/resources': 'catalog',
  '/catalog': 'catalog',
  '/bookings': 'bookings',
  '/inspections': 'bookings',
  '/review': 'reviews',
  '/reviews': 'reviews',
  '/waitlist': 'waitlist',
  '/incidents': 'disputes',
  '/disputes': 'disputes',
  '/audit': 'audit',
};

const TAB_TO_ROUTE: Record<ConsoleTab, string> = {
  catalog: '/resources',
  bookings: '/bookings',
  reviews: '/review',
  waitlist: '/waitlist',
  disputes: '/incidents',
  audit: '/audit',
};

interface AppContentProps {
  controlledTab?: ConsoleTab;
  onTabChange?: (tab: ConsoleTab) => void;
}

const AppContent: React.FC<AppContentProps> = ({
  controlledTab,
  onTabChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState<ConsoleTab>(() => {
    if (controlledTab) return controlledTab;
    const path = location.pathname;
    return ROUTE_TO_TAB[path] || 'catalog';
  });

  useEffect(() => {
    if (controlledTab) {
      setActiveTab(controlledTab);
      return;
    }

    const currentPath = location.pathname;
    const matchedTab = Object.entries(ROUTE_TO_TAB).find(([route]) =>
      route === '/' ? currentPath === '/' : currentPath.startsWith(route)
    );

    if (matchedTab) {
      setActiveTab(matchedTab[1]);
    }
  }, [location.pathname, controlledTab]);

  const handleSelectTab = (tabId: ConsoleTab) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
    const targetRoute = TAB_TO_ROUTE[tabId] || '/resources';
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  const isHomeRoute = location.pathname === '/' || location.pathname === '/home';

  if (isHomeRoute) {
    return <UniShareLanding />;
  }

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col antialiased selection:bg-brand-600 selection:text-white">
      
      <Navbar {...({ activeTab, setActiveTab: handleSelectTab } as any)} />

      
      {!isAuthRoute && (
        <nav
          aria-label="Lifecycle Consoles"
          className="w-full bg-surface-900/60 border-b border-slate-800/80 backdrop-blur-md sticky top-16 z-30"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between overflow-x-auto py-2.5 no-scrollbar gap-1 sm:gap-2">
              {CONSOLE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    title={tab.description}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 border ${
                      isActive
                        ? 'bg-brand-600/20 text-brand-300 border-brand-500/40 shadow-sm shadow-brand-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/60 border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-brand-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase ${
                          isActive
                            ? 'bg-brand-500/30 text-brand-200 border border-brand-500/40'
                            : 'bg-surface-800 text-slate-400 border border-slate-700/60'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<UniShareLanding />} />
          <Route path="/home" element={<UniShareLanding />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/resources" element={<ResourceCatalog userRole={activeRole} />} />
          <Route path="/catalog" element={<ResourceCatalog userRole={activeRole} />} />
          <Route path="/bookings" element={<BookingsList />} />
          <Route path="/inspections" element={<BookingsList />} />
          <Route path="/review" element={<ReviewQueue />} />
          <Route path="/reviews" element={<ReviewQueue />} />
          <Route path="/waitlist" element={<WaitlistManager />} />
          <Route path="/incidents" element={<DisputeCenter />} />
          <Route path="/disputes" element={<DisputeCenter />} />
          <Route path="/audit" element={<AuditLedgerView />} />
          <Route path="*" element={<Navigate to="/resources" replace />} />
        </Routes>
      </main>

      <aside
        aria-label="Demo Persona Quick Switcher"
        className="fixed bottom-6 right-6 z-50 print:hidden"
      >
        <div className="bg-surface-900/95 backdrop-blur-xl p-2 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center space-x-2.5 ring-1 ring-white/10 hover:border-brand-500/50 transition-colors">
          <div className="hidden sm:flex flex-col text-right pl-2 pr-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Demo Persona
            </span>
            <span className="text-xs font-semibold text-white">1-Click Switch</span>
          </div>
          <RoleSwitcher />
        </div>
      </aside>

      <Footer />
    </div>
  );
};

export interface AppProps {
  initialTab?: ConsoleTab;
  activeTab?: ConsoleTab;
  setActiveTab?: (tab: ConsoleTab) => void;
}

export default function App({ initialTab, activeTab, setActiveTab }: AppProps = {}) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppContent controlledTab={activeTab || initialTab} onTabChange={setActiveTab} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
