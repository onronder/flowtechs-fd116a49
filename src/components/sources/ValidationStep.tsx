
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { saveSource, SourceData, SourceType } from "@/utils/sourceSaveUtils";
import SourceInfoDisplay from "./SourceInfoDisplay";
import SourceValidationDetails from "./SourceValidationDetails";
import { supabase } from "@/integrations/supabase/client";

interface ValidationStepProps {
  sourceData: SourceData;
  onBack: () => void;
  existingId?: string;
}

export default function ValidationStep({ sourceData, onBack, existingId }: ValidationStepProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log("=== SAVING SOURCE START ===");
      
      // 1. Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log("Auth user data:", userData);
      console.log("Auth user error:", userError);
      
      // Use a fallback ID for development if needed
      const effectiveUserId = userData?.user?.id || "00000000-0000-0000-0000-000000000000";
      console.log("Using user ID:", effectiveUserId);
      
      // 2. Prepare source record
      const sourceRecord = {
        name: sourceData.name,
        description: sourceData.description || null,
        source_type: sourceData.type as SourceType,
        config: sourceData.credentials,
        user_id: effectiveUserId,
        is_active: true,
        last_validated_at: new Date().toISOString()
      };
      
      console.log("Source record to save:", {
        ...sourceRecord,
        config: { ...sourceRecord.config, accessToken: "REDACTED" }
      });
      
      // 3. Insert into database
      console.log("Executing insert...");
      
      if (existingId) {
        // Update existing source
        const { data, error } = await supabase
          .from("sources")
          .update({
            name: sourceRecord.name,
            description: sourceRecord.description,
            config: sourceRecord.config,
            updated_at: new Date().toISOString(),
            last_validated_at: sourceRecord.last_validated_at,
          })
          .eq("id", existingId)
          .select();
        
        console.log("Update response data:", data);
        console.log("Update response error:", error);
        
        if (error) throw error;
        
        console.log("=== UPDATING SOURCE COMPLETE ===");
        
        toast({
          title: "Source updated",
          description: "Your source has been updated successfully."
        });
      } else {
        // Create new source
        const { data, error } = await supabase
          .from("sources")
          .insert(sourceRecord)
          .select();
        
        console.log("Insert response data:", data);
        console.log("Insert response error:", error);
        
        if (error) throw error;
        
        console.log("=== SAVING SOURCE COMPLETE ===");
        
        toast({
          title: "Source created",
          description: "Your source has been created successfully."
        });
      }
      
      navigate("/sources");
    } catch (error) {
      console.error("Error saving source:", error);
      toast({
        title: "Error",
        description: `Failed to ${existingId ? 'update' : 'create'} the source: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const checkRlsPolicies = async () => {
    try {
      console.log("=== CHECKING RLS POLICIES ===");
      
      // Try to read from the table first
      const { data: readData, error: readError } = await supabase
        .from('sources')
        .select('id')
        .limit(1);
        
      console.log("Read test:", { data: readData, error: readError });
      
      // Try to create a minimal record
      const { data: insertData, error: insertError } = await supabase
        .from('sources')
        .insert({
          name: 'Test',
          source_type: 'shopify',
          config: {},
          user_id: '00000000-0000-0000-0000-000000000000'
        })
        .select();
        
      console.log("Insert test:", { data: insertData, error: insertError });
      
      console.log("=== RLS CHECK COMPLETE ===");
      
      toast({
        title: "RLS Check Complete",
        description: "Check console for results",
      });
    } catch (e) {
      console.error("RLS check error:", e);
      toast({
        title: "RLS Check Error",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
        <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">
          Connection Successful!
        </h3>
        <p className="text-sm text-muted-foreground">
          Your source has been validated successfully.
        </p>
      </div>

      <div className="space-y-4">
        <SourceInfoDisplay
          sourceType={sourceData.type}
          name={sourceData.name}
          description={sourceData.description}
        />

        <SourceValidationDetails
          sourceType={sourceData.type}
          validationResult={sourceData.validationResult}
          credentials={sourceData.credentials}
        />
      </div>

      <div className="flex justify-between pt-4">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" variant="outline" onClick={checkRlsPolicies}>
            Check RLS
          </Button>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {existingId ? "Updating..." : "Creating..."}
            </>
          ) : (
            existingId ? "Update Source" : "Create Source"
          )}
        </Button>
      </div>
    </div>
  );
}
