"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Spinner } from "@/components/ui";

export default function RootPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? "/home" : "/login");
  }, [session, loading, router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <Spinner className="h-6 w-6" />
        <p className="text-sm">Loading Party Day…</p>
      </div>
    </main>
  );
}
