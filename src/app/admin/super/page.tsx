"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Restaurant } from "@/types";
import { ShieldCheck, Loader2, CheckCircle, XCircle, Store, Eye, EyeOff, MessageCircle, Copy, Check } from "lucide-react";
import Link from "next/link";
import { generateApprovalWhatsAppUrl } from "@/lib/whatsapp";

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

  // Hardcoded simple PIN for prototype
  const SUPER_SECRET_PIN = "1234";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === SUPER_SECRET_PIN) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect passcode");
      setPasscode("");
    }
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setRestaurants(data);
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) {
      fetchRestaurants();
    }
  }, [authenticated]);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("restaurants")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    
    if (!error) {
      fetchRestaurants();
      // If approving, send WhatsApp notification
      if (!currentStatus) {
        const restaurant = restaurants.find(r => r.id === id);
        if (restaurant) {
          const waUrl = generateApprovalWhatsAppUrl(restaurant, BASE_URL);
          window.open(waUrl, "_blank");
        }
      }
    } else {
      alert("Error updating status. Make sure you ran the updated SQL script!");
    }
  };

  const updateFee = async (id: string, field: 'delivery_fee' | 'delivery_fee_per_km', value: number) => {
    const { error } = await supabase
      .from("restaurants")
      .update({ [field]: value })
      .eq("id", id);
    
    if (error) {
      alert("Error saving fee setting");
    } else {
      // Silently update local state to reflect the change
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    }
  };

  const copyLoginLink = (id: string) => {
    navigator.clipboard.writeText(`${BASE_URL}/login/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-[Outfit] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">Super Admin</h1>
          <p className="text-sm text-slate-500 mb-6">Enter PIN to access the control panel</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="PIN"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full text-center tracking-widest px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-bold text-lg"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold transition-colors">
              Access Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-[Outfit] pb-20">
      <header className="bg-slate-900 text-white px-6 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h1 className="font-black text-xl tracking-tight">Super Admin Panel</h1>
        </div>
        <Link href="/" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
          Exit
        </Link>
      </header>

      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Manage Restaurants</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Approve or suspend restaurants on the marketplace.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm">
            Total: {restaurants.length}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Restaurant</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">PIN</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Fees</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {restaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            {restaurant.logo_url ? (
                              <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Store className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{restaurant.name}</p>
                            <p className="text-xs text-slate-500 font-medium">/{restaurant.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">{restaurant.phone_number}</p>
                        {restaurant.email && <p className="text-xs text-slate-400">{restaurant.email}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-sm tracking-widest">
                          {restaurant.access_pin ?? <span className="text-slate-400 italic text-xs font-sans">not set</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 w-32">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 w-8">BASE</span>
                            <input 
                              type="number" 
                              defaultValue={restaurant.delivery_fee} 
                              onBlur={(e) => updateFee(restaurant.id, 'delivery_fee', parseFloat(e.target.value) || 0)}
                              className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 w-8">/KM</span>
                            <input 
                              type="number" 
                              defaultValue={restaurant.delivery_fee_per_km} 
                              onBlur={(e) => updateFee(restaurant.id, 'delivery_fee_per_km', parseFloat(e.target.value) || 0)}
                              className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {restaurant.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5" /> LIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            <Loader2 className="w-3.5 h-3.5" /> PENDING
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Copy login link */}
                          <button
                            onClick={() => copyLoginLink(restaurant.id)}
                            title="Copy login link"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                          >
                            {copiedId === restaurant.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === restaurant.id ? "Copied!" : "Link"}
                          </button>

                          {restaurant.is_active ? (
                            <button
                              onClick={() => toggleStatus(restaurant.id, restaurant.is_active)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded-xl text-sm font-bold transition-colors"
                            >
                              <EyeOff className="w-4 h-4" /> Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleStatus(restaurant.id, restaurant.is_active)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-green-600/20"
                            >
                              <MessageCircle className="w-4 h-4" /> Approve + Notify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {restaurants.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                        No restaurants found on the platform.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
