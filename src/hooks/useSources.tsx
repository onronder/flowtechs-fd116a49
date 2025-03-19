
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Source {
  id: string;
  name: string;
  description?: string;
  source_type: string;
  config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_validated_at: string | null;
  user_id: string;
  datasets_count?: number;
  jobs_count?: number;
}

export function useSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSources = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setSources(data || []);
    } catch (error) {
      console.error("Error fetching sources:", error);
      toast({
        title: "Error",
        description: "Failed to load sources. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return {
    sources,
    loading,
    fetchSources
  };
}
