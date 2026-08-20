"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AdminIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace("/login");
        return;
      }

      // Find the restaurant owned by this user
      const { data: rest } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (rest) {
        router.replace(`/admin/${rest.id}/menu`);
      } else {
        // Logged in but no restaurant? Something is wrong or they are just a customer.
        await supabase.auth.signOut();
        router.replace("/login");
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
      <p className="text-slate-500 font-medium animate-pulse">Loading your dashboard...</p>
    </div>
  );
}
