"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UtensilsCrossed,
  LayoutDashboard,
  UtensilsCrossed as MenuIcon,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Loader2
} from "lucide-react";
import Link from "next/link";

export default function RestaurantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { restaurantId: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState("DelivriLi");

  const NAV_ITEMS = [
    { href: `/admin/${params.restaurantId}/orders`, label: "Live Orders", icon: LayoutDashboard },
    { href: `/admin/${params.restaurantId}/menu`, label: "Menu Items", icon: MenuIcon },
    { href: `/admin/${params.restaurantId}/settings`, label: "Settings", icon: Settings },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Verify ownership and get restaurant name
      const { data: rest } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("id", params.restaurantId)
        .eq("owner_id", user.id)
        .single();

      if (!rest) {
        router.replace("/login");
        return;
      }

      setRestaurantName(rest.name);
      setLoading(false);
    };

    checkAuth();
  }, [params.restaurantId, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#32B260] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F9FA] font-[Outfit]">
      {/* ── Mobile Topbar ──────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#32B260] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xs">DL</span>
          </div>
          <span className="font-black text-sm tracking-tight text-slate-900 truncate max-w-[150px]">
            {restaurantName}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Mobile Menu Overlay ──────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-40 flex flex-col border-t border-slate-100">
          <nav className="flex-1 py-4 px-4 space-y-2 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#EAF6ED] text-[#32B260]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex-shrink-0 ${
          collapsed ? "w-20" : "w-64"
        } sticky top-0 h-screen overflow-y-auto z-30`}
      >
        {/* Brand */}
        <div
          className={`h-16 flex items-center border-b border-slate-100 px-4 gap-3 flex-shrink-0 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-9 h-9 bg-[#32B260] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white font-black text-sm">DL</span>
          </div>
          {!collapsed && (
            <span className="font-black text-slate-900 text-sm tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {restaurantName}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 space-y-2 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#EAF6ED] text-[#32B260]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-[#32B260]" : ""}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 py-4 px-3 space-y-2 flex-shrink-0">
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sign out" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Page content */}
        <main className="flex-1 bg-[#F8F9FA]">{children}</main>
      </div>
    </div>
  );
}
