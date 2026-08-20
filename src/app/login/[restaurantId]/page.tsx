"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2, Store, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";
import { Particles } from "@/components/ui/particles";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ShineBorder } from "@/components/ui/shine-border";

export default function RestaurantLoginPage({ params }: { params: { restaurantId: string } }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [nameFetched, setNameFetched] = useState(false);

  // Fetch restaurant name on first focus / mount
  const fetchName = async () => {
    if (nameFetched) return;
    setNameFetched(true);
    const { data } = await supabase
      .from("restaurants")
      .select("name, is_active")
      .eq("id", params.restaurantId)
      .single();
    if (data) {
      setRestaurantName(data.name);
      if (!data.is_active) {
        setError("Your restaurant is pending approval. Please wait for our team to review your application.");
      }
    } else {
      setError("Restaurant not found. Please check your link.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("restaurants")
        .select("id, name, is_active, access_pin")
        .eq("id", params.restaurantId)
        .single();

      if (dbError || !data) throw new Error("Restaurant not found.");
      if (!data.is_active) throw new Error("Your restaurant is still pending approval.");
      if (data.access_pin !== pin) throw new Error("Incorrect PIN. Please try again.");

      // Store auth token in sessionStorage
      sessionStorage.setItem(`auth_${params.restaurantId}`, "true");
      sessionStorage.setItem("active_restaurant_id", params.restaurantId);

      router.push(`/admin/${params.restaurantId}/menu`);
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
              {restaurantName ? (
                <p className="text-red-200 text-sm font-medium flex items-center justify-center gap-1.5">
                  <Store className="w-4 h-4" /> {restaurantName}
                </p>
              ) : (
                <p className="text-red-300 text-sm font-medium">Dashboard Access</p>
              )}
            </div>

            <div className="p-8">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold mb-6 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6" onFocus={fetchName}>
                <div>
                  <label className="block text-sm font-bold text-red-950 mb-3 text-center">
                    Enter your 4-digit PIN
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-red-300 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      id="pin-input"
                      type={showPin ? "text" : "password"}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      className="w-full pl-12 pr-12 py-4 bg-red-50/50 border-2 border-red-100 rounded-2xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all font-black text-red-950 text-3xl tracking-[1rem] text-center"
                      placeholder="••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-red-300 hover:text-red-600 transition-colors"
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* PIN dots indicator */}
                  <div className="flex justify-center gap-3 mt-4">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${
                          i < pin.length ? "bg-red-600 scale-110" : "bg-red-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <ShimmerButton
                  type="submit"
                  disabled={loading || pin.length !== 4}
                  background="rgb(220, 38, 38)"
                  shimmerColor="#facc15"
                  className="w-full py-4 rounded-xl font-black text-base disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
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
