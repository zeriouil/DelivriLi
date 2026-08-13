'use client';

import React, { useState } from 'react';
import { UtensilsCrossed, LayoutDashboard, UtensilsCrossed as MenuIcon, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Live Orders', icon: LayoutDashboard },
  { href: '/admin', label: 'Menu Items',  icon: MenuIcon },
  { href: '/admin', label: 'Settings',    icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-100 font-[Outfit]">

      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-16' : 'w-56'}`}>
        {/* Brand */}
        <div className={`h-16 flex items-center border-b border-white/10 px-4 gap-3 flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="font-black text-sm tracking-tight whitespace-nowrap">
              QuickMenu <span className="text-emerald-400">Admin</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-white/10 py-4 px-2 space-y-1 flex-shrink-0`}>
          <button
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-white hover:bg-white/10 transition ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div>
            <h1 className="font-black text-slate-900 text-lg">Live Orders</h1>
            <p className="text-slate-400 text-xs">Real-time order management dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center shadow">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
