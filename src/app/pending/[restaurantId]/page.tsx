"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Clock, CheckCircle2, Loader2, Store, ArrowRight } from "lucide-react";
import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";
import { Particles } from "@/components/ui/particles";
import { ShineBorder } from "@/components/ui/shine-border";
import { BorderBeam } from "@/components/ui/border-beam";

export default function PendingApprovalPage({ params }: { params: { restaurantId: string } }) {
  const router = useRouter();
  const [approved, setApproved] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [dots, setDots] = useState(".");

  // Animate waiting dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? "." : d + ".");
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Poll Supabase every 20s to check if approved
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("name, is_active")
        .eq("id", params.restaurantId)
        .single();

      if (!data) return;
      setRestaurantName(data.name);

      if (data.is_active) {
        setApproved(true);
        setTimeout(() => {
          router.push(`/login/${params.restaurantId}`);
        }, 2500);
      }
    };

    check(); // immediate first check
    const interval = setInterval(check, 20000);
    return () => clearInterval(interval);
  }, [params.restaurantId, router]);

  return (
    <div className="min-h-screen bg-[#fef2f2] relative overflow-hidden flex flex-col">
      <Particles className="absolute inset-0" quantity={30} color="#dc2626" size={0.3} />

      <header className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-red-100 px-4 h-16 flex items-center shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">DL</span>
          </div>
          <span className="font-black text-xl text-red-950 tracking-tight font-heading">DelivriLi</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <BlurFade className="w-full max-w-md">
          <div className="relative bg-white rounded-3xl shadow-xl border border-red-100 overflow-hidden text-center">
            <ShineBorder shineColor={["#dc2626", "#eab308", "#991b1b"]} borderWidth={2} />
            <BorderBeam colorFrom="#facc15" colorTo="#dc2626" size={80} duration={8} />

            <div className="p-10">
              {!approved ? (
                <>
                  {/* Animated waiting icon */}
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center">
                      <Clock className="w-10 h-10 text-amber-500" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-400 animate-spin" />
                  </div>

                  <h1 className="text-2xl font-heading font-bold text-red-950 mb-3">
                    Application Under Review
                  </h1>
                  {restaurantName && (
                    <p className="text-red-400 font-semibold text-sm mb-2">
                      <Store className="w-4 h-4 inline mr-1 -mt-0.5" />
                      {restaurantName}
                    </p>
                  )}
                  <p className="text-red-900/60 text-base leading-relaxed mb-8">
                    Our team is reviewing your application. You&apos;ll receive a{" "}
                    <span className="font-bold text-green-600">WhatsApp message</span> with your dashboard
                    link and PIN once approved.
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-left space-y-3">
                    {[
                      { done: true,  text: "Application submitted" },
                      { done: false, text: `DelivriLi team reviewing${dots}` },
                      { done: false, text: "WhatsApp confirmation sent" },
                      { done: false, text: "Dashboard access granted" },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm font-semibold">
                        {step.done ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            i === 1 ? "border-amber-400 bg-amber-100" : "border-red-200"
                          }`}>
                            {i === 1 && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                          </div>
                        )}
                        <span className={step.done ? "text-green-700" : i === 1 ? "text-amber-700" : "text-red-300"}>
                          {step.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-red-300 font-medium">
                    This page checks automatically — no need to refresh.
                  </p>
                </>
              ) : (
                <>
                  {/* Approved state */}
                  <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-50 border-4 border-green-300 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <h1 className="text-2xl font-heading font-bold text-green-700 mb-3">
                    🎉 You&apos;re Approved!
                  </h1>
                  <p className="text-red-900/60 mb-6">
                    Redirecting you to your dashboard login{dots}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Opening your dashboard</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-red-400 font-medium hover:text-red-700 transition-colors flex items-center justify-center gap-1">
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to home
            </Link>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
