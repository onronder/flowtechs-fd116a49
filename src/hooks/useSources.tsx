
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
      
      // First, fetch all sources without trying to count related entities
      const { data: sourcesData, error: sourcesError } = await supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (sourcesError) throw sourcesError;
      
      if (!sourcesData) {
        setSources([]);
        return;
      }
      
      // Fetch dataset counts separately using a count query
      const getDatasetCounts = async () => {
        const countsPromises = sourcesData.map(async (source) => {
          const { count, error } = await supabase
            .from("user_datasets")
            .select("*", { count: "exact", head: true })
            .eq("source_id", source.id);
          
          return {
            sourceId: source.id,
            count: count || 0,
            error
          };
        });
        
        return Promise.all(countsPromises);
      };
      
      // Get dataset counts for all sources
      const datasetCounts = await getDatasetCounts();
      
      // Create a map of source ID to dataset count
      const datasetCountMap = datasetCounts.reduce((acc, item) => {
        acc[item.sourceId] = item.count;
        return acc;
      }, {} as Record<string, number>);
      
      // Construct the final sources with counts
      const sourcesWithCounts = sourcesData.map(source => ({
        ...source,
        datasets_count: datasetCountMap[source.id] || 0,
        jobs_count: 0 // Default to 0 for now as the dataset_job_queue table isn't correctly linked
      }));
      
      // Cast the returned data to our Source type
      setSources(sourcesWithCounts as Source[]);
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
