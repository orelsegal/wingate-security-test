import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Single source of truth for "is the signed-in user the System Owner".
 *  UX gating only — real enforcement lives in the DB RPCs/policies. */
export const useIsSystemOwner = () => {
  return useQuery({
    queryKey: ["is-system-owner"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      const { data, error } = await (supabase.rpc as any)("is_system_owner", { _user_id: session.user.id });
      if (error) throw error;
      return !!data;
    },
  });
};
