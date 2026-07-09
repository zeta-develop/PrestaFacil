import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export function useAuth() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 1000 * 60 * 30, // Session is generally stable, cache for 30 min
  });
}
