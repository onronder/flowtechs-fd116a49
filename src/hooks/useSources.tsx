
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { fetchUserSources } from "@/api/sourceApi";

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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the refactored API function to fetch sources with counts
      const sourcesData = await fetchUserSources();
      
      // Add the missing properties for compatibility with the Source type
      const sourcesWithCounts = sourcesData.map(source => ({
        ...source,
        datasets_count: 0, // Default value as it's not provided by the API
        jobs_count: 0 // Default value as it's not provided by the API
      }));
      
      // Now we can safely cast to our Source type
      setSources(sourcesWithCounts as Source[]);
    } catch (error) {
      console.error("Error fetching sources:", error);
      setError("Failed to load sources. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load sources. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  return {
    sources,
    loading,
    error,
    fetchSources
  };
}
