
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

// Define the Source type based on the database types
export interface Source {
  id: string;
  name: string;
  description?: string | null;
  source_type: Database["public"]["Enums"]["source_type"];
  config: Record<string, any>;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  last_validated_at: string | null;
  user_id: string;
  datasets_count: number;
  jobs_count: number;
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
        .select(`
          *,
          datasets_count:user_datasets(count),
          jobs_count:dataset_job_queue(count)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Process the counts from the aggregation
      const sourcesWithCounts = data?.map(source => ({
        ...source,
        datasets_count: Array.isArray(source.datasets_count) && source.datasets_count[0] ? 
          Number(source.datasets_count[0].count) || 0 : 0,
        jobs_count: Array.isArray(source.jobs_count) && source.jobs_count[0] ? 
          Number(source.jobs_count[0].count) || 0 : 0
      }));
      
      // Cast the returned data to our Source type
      setSources(sourcesWithCounts as unknown as Source[]);
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
