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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-[Outfit]">
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside
        className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out flex-shrink-0 ${
          collapsed ? "w-20" : "w-64"
        } sticky top-0 h-screen overflow-y-auto`}
      >
        {/* Brand */}
        <div
          className={`h-16 flex items-center border-b border-white/10 px-4 gap-3 flex-shrink-0 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white font-black text-sm">DL</span>
          </div>
          {!collapsed && (
            <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
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
                    ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 py-4 px-3 space-y-2 flex-shrink-0">
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sign out" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition ${
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
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-white hover:bg-white/10 transition ${
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
        <main className="flex-1 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
