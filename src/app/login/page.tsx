"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2, Mail, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";
import { Particles } from "@/components/ui/particles";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ShineBorder } from "@/components/ui/shine-border";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Login failed. Please try again.");

      // Find the restaurant owned by this user
      const { data: restaurant, error: restError } = await supabase
        .from("restaurants")
        .select("id, is_active")
        .eq("owner_id", authData.user.id)
        .single();

      if (restError || !restaurant) {
        await supabase.auth.signOut();
        throw new Error("No restaurant found for this account. Please sign up first.");
      }

      // Redirect to admin dashboard (Menu)
      router.push(`/admin/${restaurant.id}/menu`);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef2f2] relative overflow-hidden flex flex-col">
      <Particles className="absolute inset-0" quantity={35} color="#dc2626" size={0.35} />

      <header className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-red-100 px-4 h-16 flex items-center shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">DL</span>
          </div>
          <span className="font-black text-xl text-red-950 tracking-tight font-heading">DelivriLi</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <BlurFade className="w-full max-w-sm">
          <div className="relative bg-white rounded-3xl shadow-xl border border-red-100 overflow-hidden">
            <ShineBorder shineColor={["#dc2626", "#eab308", "#991b1b"]} borderWidth={2} />

            {/* Header */}
            <div className="bg-gradient-to-br from-red-950 via-red-800 to-red-600 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-xl font-heading font-bold text-white mb-1">Restaurant Login</h1>
              <p className="text-red-300 text-sm font-medium">Dashboard Access</p>
            </div>

            <div className="p-8">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold mb-6 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-red-300 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-red-50/50 border-2 border-red-100 rounded-2xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all font-medium text-red-950"
                      placeholder="restaurant@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-red-300 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 bg-red-50/50 border-2 border-red-100 rounded-2xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all font-medium text-red-950"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-red-300 hover:text-red-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <ShimmerButton
                  type="submit"
                  disabled={loading || !email || !password}
                  background="rgb(220, 38, 38)"
                  shimmerColor="#facc15"
                  className="w-full py-4 rounded-xl font-black text-base disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Access Dashboard <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </ShimmerButton>
              </form>

              <p className="mt-6 text-center text-xs text-red-300 font-medium">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-red-600 font-bold hover:underline">
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
