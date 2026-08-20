"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Store, Image as ImageIcon, MapPin, Phone, AlignLeft, DollarSign, Save } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function RestaurantSettingsPage({ params }: { params: { restaurantId: string } }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    phone_number: "",
    address: "",
    latitude: 0,
    longitude: 0,
    logo_url: "",
    cover_image_url: "",
    delivery_fee: 0,
    min_order_amount: 0,
  });

  // Dynamic import of MapPin to avoid SSR issues
  const [MapComponent, setMapComponent] = useState<any>(null);
  useEffect(() => {
    import("@/components/MapPin").then((mod) => setMapComponent(() => mod.default));
  }, []);

  useEffect(() => {
    const fetchRestaurant = async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", params.restaurantId)
        .single();

      if (data && !error) {
        setFormData({
          name: data.name || "",
          description: data.description || "",
          phone_number: data.phone_number || "",
          address: data.address || "",
          latitude: data.latitude || 33.5731, // Default Casablanca
          longitude: data.longitude || -7.5898,
          logo_url: data.logo_url || "",
          cover_image_url: data.cover_image_url || "",
          delivery_fee: data.delivery_fee || 0,
          min_order_amount: data.min_order_amount || 0,
        });
      }
      setLoading(false);
    };

    fetchRestaurant();
  }, [params.restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: formData.name,
          description: formData.description,
          phone_number: formData.phone_number,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          logo_url: formData.logo_url,
          cover_image_url: formData.cover_image_url,
          delivery_fee: parseFloat(formData.delivery_fee.toString()),
          min_order_amount: parseFloat(formData.min_order_amount.toString()),
        })
        .eq("id", params.restaurantId);

      if (error) throw error;
      setMessage({ text: "Settings saved successfully!", type: "success" });
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="font-black text-slate-900 text-2xl">Restaurant Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your public profile and delivery rules.</p>
      </header>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-6">
          {/* General Info */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-500" />
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Address</label>
                <div className="relative mb-4">
                  <MapPin className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                    placeholder="Enter street address"
                  />
                </div>
                {MapComponent && (
                  <div className="mt-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Pin Location on Map</label>
                    <MapComponent 
                      initialLat={formData.latitude || 33.5731} 
                      initialLng={formData.longitude || -7.5898} 
                      onChange={(lat: number, lng: number) => setFormData(f => ({ ...f, latitude: lat, longitude: lng }))} 
                    />
                    <p className="text-xs text-slate-500 mt-2">Click anywhere on the map to pin your restaurant's exact location.</p>
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <div className="relative">
                  <AlignLeft className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Media */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-fuchsia-500" />
              Branding & Media
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Logo URL</label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Cover Image URL</label>
                <input
                  type="url"
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Delivery & Fees */}
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Delivery & Fees
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Delivery Fee (DH)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Minimum Order (DH)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-5 border-t border-slate-200 flex justify-end">
          <ShimmerButton
            type="submit"
            disabled={saving}
            background="rgb(79, 70, 229)"
            shimmerColor="#ffffff"
            className="px-8 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Settings
              </span>
            )}
          </ShimmerButton>
        </div>
      </form>
    </div>
  );
}
