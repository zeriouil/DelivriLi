"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import {
  Store, ArrowRight, Loader2, MapPin, Phone, Building2,
  Image as ImageIcon, AlignLeft, Mail, Lock, Eye, EyeOff
} from "lucide-react";
import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";
import { Particles } from "@/components/ui/particles";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ShineBorder } from "@/components/ui/shine-border";
import { SparklesText } from "@/components/ui/sparkles-text";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    password: "",
    confirmPassword: "",
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
    setFormData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name || !formData.slug || !formData.phone_number || !formData.email) {
        throw new Error("Please fill in all required fields.");
      }
      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      // Check if slug already exists
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", formData.slug)
        .single();

      if (existing) {
        throw new Error("This restaurant URL is already taken. Please choose another name or modify the URL.");
      }

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Failed to create account. Please try again.");

      const restaurantId = uuidv4();

      // Insert restaurant row linked to auth user
      const { error: insertError } = await supabase.from("restaurants").insert({
        id: restaurantId,
        slug: formData.slug,
        name: formData.name,
        email: formData.email,
        owner_id: authData.user.id,
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

      // Redirect to pending approval page
      router.push(`/pending/${restaurantId}`);
    } catch (err: any) {
      setError(err.message || "An error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef2f2] relative overflow-hidden flex flex-col">
      <Particles className="absolute inset-0" quantity={40} color="#dc2626" size={0.4} />

      <header className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-red-100 px-4 h-16 flex items-center shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">DL</span>
          </div>
          <span className="font-black text-xl text-red-950 tracking-tight font-heading">DelivriLi</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-12 relative z-10">
        <BlurFade className="w-full max-w-lg">
          <div className="relative bg-white rounded-3xl shadow-xl border border-red-100 w-full overflow-hidden">
            <ShineBorder shineColor={["#dc2626", "#eab308", "#991b1b"]} borderWidth={2} />
            <div className="bg-gradient-to-br from-red-950 via-red-800 to-red-600 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <SparklesText className="text-2xl font-heading text-white mb-2" colors={{ first: "#facc15", second: "#fff" }} sparklesCount={6}>
                Partner with DelivriLi
              </SparklesText>
              <p className="text-red-100 font-medium text-sm">
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
                {/* Restaurant Name */}
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-1.5">Restaurant Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Building2 className="w-5 h-5 text-red-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" required value={formData.name} onChange={handleNameChange}
                      className="w-full pl-10 pr-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                      placeholder="e.g. Burger Palace" />
                  </div>
                </div>

                {/* Store URL */}
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-1.5">Store URL</label>
                  <div className="flex bg-red-50/50 border border-red-100 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-600/20 focus-within:border-red-600 transition-all">
                    <span className="px-3 py-3 bg-red-50 text-red-400 font-medium text-sm border-r border-red-100 flex-shrink-0">delivrili.com/</span>
                    <input type="text" required value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-3 py-3 bg-transparent outline-none font-medium text-red-950" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-red-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="tel" required value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                      placeholder="+212 6..." />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-red-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="email" required value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                      placeholder="restaurant@example.com" />
                  </div>
                </div>

                {/* Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-red-950 mb-1.5">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-red-300 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-10 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                        placeholder="Min. 6 chars"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-300 hover:text-red-600 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-red-950 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-red-300 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-10 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                        placeholder="Repeat password"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-300 hover:text-red-600 transition-colors">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-1.5">Address</label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 text-red-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                      placeholder="City, Street..." />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-1.5">Description</label>
                  <div className="relative">
                    <AlignLeft className="w-5 h-5 text-red-300 absolute left-3 top-3" />
                    <textarea rows={3} value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                      placeholder="Tell customers about your restaurant..." />
                  </div>
                </div>

                {/* Image URLs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-red-950 mb-1.5">Logo Image URL</label>
                    <div className="relative">
                      <ImageIcon className="w-5 h-5 text-red-300 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="url" value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                        placeholder="https://..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-red-950 mb-1.5">Cover Image URL</label>
                    <div className="relative">
                      <ImageIcon className="w-5 h-5 text-red-300 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="url" value={formData.cover_image_url}
                        onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950"
                        placeholder="https://..." />
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-red-950 mb-1.5">Delivery Fee (DH)</label>
                    <input type="number" min="0" value={formData.delivery_fee}
                      onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                      className="w-full px-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-red-950 mb-1.5">Min. Order (DH)</label>
                    <input type="number" min="0" value={formData.min_order_amount}
                      onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                      className="w-full px-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium text-red-950" />
                  </div>
                </div>

                <ShimmerButton type="submit" disabled={loading} background="rgb(220, 38, 38)" shimmerColor="#facc15"
                  className="w-full mt-6 py-4 rounded-xl font-black text-lg disabled:opacity-70 disabled:pointer-events-none">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Creating Account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Create Restaurant <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </ShimmerButton>

                <p className="text-center text-sm text-red-400 font-medium">
                  Already have an account?{" "}
                  <Link href="/login" className="text-red-600 font-bold hover:underline">Sign in</Link>
                </p>
              </form>
            </div>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
