import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useEffect } from "react";

export type Server = Tables<"servers">;

export const useServers = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["servers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servers")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching servers:", error);
        throw error;
      }

      return data;
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("servers-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "servers",
        },
        (payload) => {
          console.log("Realtime update:", payload);
          queryClient.invalidateQueries({ queryKey: ["servers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
