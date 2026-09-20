import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  ScanLine,
  QrCode,
  LogOut,
  User,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface TopbarProps {
  onToggleMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { info } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    info('Logged out', 'You have been signed out of admin session');
    navigate('/login');
  };

  // Extract human readable title from route
  const path = location.pathname;
  let pageTitle = 'Dashboard';
  if (path.startsWith('/clients')) pageTitle = 'Clients Management';
  else if (path.startsWith('/batches')) pageTitle = 'Card Batches';
  else if (path.startsWith('/cards/') && path.length > 7) pageTitle = 'Card Details';
  else if (path.startsWith('/cards')) pageTitle = 'Cards Inventory';
  else if (path.startsWith('/qr-generator')) pageTitle = 'QR Generator';
  else if (path.startsWith('/scanner')) pageTitle = 'NFC / QR Scanner';
  else if (path.startsWith('/analytics')) pageTitle = 'Analytics & Reports';
  else if (path.startsWith('/settings')) pageTitle = 'System Settings';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current Route Breadcrumb / Title */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admin</span>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800">{pageTitle}</span>
        </div>
      </div>

      {/* Right Action Icons & User Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Tools */}
        <button
          onClick={() => navigate('/scanner')}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition-colors"
          title="Open Card Scanner"
        >
          <ScanLine className="w-3.5 h-3.5 text-brand-600" />
          <span>Test Scanner</span>
        </button>

        <button
          onClick={() => navigate('/qr-generator')}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition-colors"
          title="Generate QR Codes"
        >
          <QrCode className="w-3.5 h-3.5 text-brand-600" />
          <span>QR Tool</span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden md:block" />

        {/* User Profile Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-brand-400 border border-slate-700 flex items-center justify-center font-bold text-xs shadow-inner">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1">
                {user?.name || 'Administrator'}
                <Shield className="w-3 h-3 text-brand-600" />
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">{user?.role || 'Super Admin'}</div>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">
                  {user?.role}
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Admin Profile & Settings
                </button>
              </div>
              <div className="border-t border-slate-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
