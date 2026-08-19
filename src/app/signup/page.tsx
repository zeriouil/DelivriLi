"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { Store, ArrowRight, Loader2, MapPin, Phone, Building2, Image as ImageIcon, AlignLeft } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    phone_number: "",
    address: "",
    description: "",
    logo_url: "",
    cover_image_url: "",
    delivery_fee: "15",
    min_order_amount: "50",
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name), // auto-generate slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Basic validation
      if (!formData.name || !formData.slug || !formData.phone_number) {
        throw new Error("Please fill in all required fields.");
      }

      // Check if slug exists
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", formData.slug)
        .single();

      if (existing) {
        throw new Error("This restaurant URL is already taken. Please choose another name or modify the URL.");
      }

      // Generate a new UUID for the restaurant
      const restaurantId = uuidv4();

      const { error: insertError } = await supabase.from("restaurants").insert({
        id: restaurantId,
        slug: formData.slug,
        name: formData.name,
        description: formData.description,
        logo_url: formData.logo_url,
        cover_image_url: formData.cover_image_url,
        phone_number: formData.phone_number,
        address: formData.address,
        currency_code: "MAD",
        currency_symbol: "DH",
        delivery_fee: parseFloat(formData.delivery_fee) || 0,
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        is_active: false, // Pending admin approval
      });

      if (insertError) throw insertError;

      // Redirect to the new restaurant's menu dashboard
      router.push(`/admin/${restaurantId}/menu`);
    } catch (err: any) {
      setError(err.message || "An error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-[Outfit] flex flex-col">
      <header className="bg-white border-b border-slate-100 px-4 h-16 flex items-center shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">DL</span>
          </div>
          <span className="font-black text-xl text-slate-900 tracking-tight">DelivriLi</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 w-full max-w-lg overflow-hidden">
          <div className="bg-indigo-600 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-2">Partner with DelivriLi</h2>
            <p className="text-indigo-100 font-medium text-sm">
              Create your digital menu and start receiving orders in minutes.
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold mb-6 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Restaurant Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleNameChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-slate-700"
                    placeholder="e.g. Burger Palace"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Store URL</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600/20 focus-within:border-indigo-600 transition-all">
                  <span className="px-3 py-3 bg-slate-100 text-slate-500 font-medium text-sm border-r border-slate-200 flex-shrink-0">
                    delivrili.com/
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-3 bg-transparent outline-none font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-slate-700"
                    placeholder="+212 6..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Address</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-slate-700"
                    placeholder="City, Street..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <div className="relative">
                  <AlignLeft className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-slate-700"
                    placeholder="Tell customers about your restaurant..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Logo Image URL</label>
                  <div className="relative">
                    <ImageIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-slate-700"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Cover Image URL</label>
                  <div className="relative">
                    <ImageIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-slate-700"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Delivery Fee (DH)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.delivery_fee}
                    onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Min. Order (DH)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Restaurant
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
