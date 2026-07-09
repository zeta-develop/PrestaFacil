"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AutoUpdater } from "./AutoUpdater";
import { useQueryClient } from "@tanstack/react-query";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      // getUser() is more secure as it revalidates the session with the server
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        queryClient.clear();
        router.replace("/login");
      } else {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Limpiar caché únicamente en inicio o cierre de sesión explícitos
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        queryClient.clear();
      }
      
      if (!session) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <AutoUpdater />
      {children}
    </>
  );
}
