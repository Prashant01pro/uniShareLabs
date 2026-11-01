import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Microscope,
  Bell,
  CheckCheck,
  Trash2,
  Menu,
  X,
  Compass,
  CalendarCheck,
  ClipboardCheck,
  AlertOctagon,
  FileCheck,
  Layers,
  Circle,
  ExternalLink,
  LogIn,
  UserPlus,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { RoleSwitcher } from './RoleSwitcher';

export const Navbar: React.FC = () => {
  const { activeRole, currentUser, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  } = useSocket();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isManagerOrAdmin =
    activeRole === 'LAB_MANAGER' ||
    activeRole === 'RESOURCE_OWNER' ||
    activeRole === 'ADMIN';

  const navLinks = [
    { label: 'Home', href: '/', icon: Sparkles },
    { label: 'Catalog', href: '/resources', icon: Compass },
    { label: 'My Bookings', href: '/bookings', icon: CalendarCheck },
    { label: 'Handover & Return', href: '/inspections', icon: ClipboardCheck },
    { label: 'Incidents', href: '/incidents', icon: AlertOctagon },
    { label: 'Audit Ledger', href: '/audit', icon: FileCheck },
    ...(isManagerOrAdmin
      ? [{ label: 'Review Queue', href: '/review', icon: Layers }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-surface-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="p-2 bg-brand-600/20 border border-brand-500/30 rounded-xl text-brand-400 group-hover:scale-105 transition-transform">
                <Microscope className="w-5 h-5 text-brand-400" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold text-white tracking-tight leading-none">
                    UniShare Labs
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono rounded bg-brand-950 border border-brand-800/80 text-brand-300">
                    ACADEMIC
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Research Resource Platform
                </span>
              </div>
            </Link>

            
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-surface-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <div
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-surface-900 border border-slate-800 text-[11px] font-mono text-slate-400"
              title={isConnected ? 'Socket.IO Real-time Connected' : 'Reconnecting...'}
            >
              <Circle
                className={`w-2 h-2 fill-current ${
                  isConnected
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-amber-400 animate-ping'
                }`}
              />
              <span className="text-[10px] uppercase">
                {isConnected ? 'LIVE' : 'SYNCING'}
              </span>
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-800/80 border border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-surface-950 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                          title="Mark all as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Read all</span>
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllNotifications}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title="Clear all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No real-time notifications received yet
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`p-2.5 rounded-xl border transition-colors cursor-pointer text-left ${
                            notif.read
                              ? 'bg-surface-950/40 border-slate-800/60 opacity-75'
                              : 'bg-surface-800/60 border-brand-500/20 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-semibold text-white">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <RoleSwitcher />

            <div className="hidden sm:flex items-center space-x-1.5 pl-1 border-l border-slate-800">
              {currentUser ? (
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
                  title="Sign out of current account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1">
                  <Link
                    to="/login"
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-800 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-800 border border-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-surface-950/95 px-4 pt-3 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                    : 'text-slate-300 hover:bg-surface-900 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
            {currentUser ? (
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({currentUser.name})</span>
              </button>
            ) : (
              <div className="w-full grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  className="flex items-center justify-center space-x-1 py-2 text-xs font-medium text-slate-300 bg-surface-900 border border-slate-800 rounded-xl"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center space-x-1 py-2 text-xs font-medium text-white bg-brand-600 rounded-xl"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
