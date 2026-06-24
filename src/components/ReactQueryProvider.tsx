"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours caching in memory
            staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
            retry: 2,
            refetchOnWindowFocus: false, // Optimización crítica: Evitar peticiones masivas al enfocar la app en móvil
            networkMode: "always", // CRÍTICO PARA CAPACITOR: Ignorar el estado de red del Webview
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
