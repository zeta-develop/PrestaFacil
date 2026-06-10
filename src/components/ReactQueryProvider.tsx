"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState } from "react";

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours caching
            staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
            retry: 2,
            refetchOnWindowFocus: true,
            networkMode: "offlineFirst",
          },
        },
      })
  );

  if (typeof window === "undefined") {
    // Render standard provider on server
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  // Render persistent provider on client
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: "PRESTA_FACIL_CACHE_V1",
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
