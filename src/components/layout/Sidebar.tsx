import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  CreditCard,
  QrCode,
  ScanLine,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';
import { APP_CONFIG } from '../../lib/constants';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Batches', path: '/batches', icon: Layers },
    { label: 'Cards', path: '/cards', icon: CreditCard },
    { label: 'QR Generator', path: '/qr-generator', icon: QrCode },
    { label: 'Scanner', path: '/scanner', icon: ScanLine },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-brand-500/20">
          <QrCode className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base text-white tracking-tight leading-none block">CardSync</span>
          <span className="text-[10px] text-brand-400 font-medium tracking-wide uppercase">CRM Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Dynamic URL badge info */}
      <div className="p-4 border-t border-slate-800">
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Dynamic Domain
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono border border-emerald-800/50">
              Active
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 truncate">
            {APP_CONFIG.dynamicBaseUrl}
          </p>
          <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
            <span>Phase 1 Frontend MVP</span>
            <span className="text-slate-400">v{APP_CONFIG.version}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
