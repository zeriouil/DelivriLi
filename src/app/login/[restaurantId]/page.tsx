"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This route is kept for backwards compatibility.
// All logins now go through the generic /login page.
export default function LegacyLoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
