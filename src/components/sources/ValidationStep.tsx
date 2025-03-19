
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Define source type to match database enum
type SourceType = "shopify" | "woocommerce" | "ftp_sftp" | "custom_api";

interface ValidationStepProps {
  sourceData: {
    type: string;
    name: string;
    description: string;
    credentials: any;
    validationResult: any;
  };
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

      const userData = await supabase.auth.getUser();
      
      if (!userData.data.user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to create a source.",
          variant: "destructive",
        });
        return;
      }

      // Create source config with proper typing
      const sourceConfig = {
        source_type: sourceData.type as SourceType,
        name: sourceData.name,
        description: sourceData.description,
        config: sourceData.credentials,
        user_id: userData.data.user.id,
        is_active: true,
        last_validated_at: new Date().toISOString(),
      };

      let response;
      
      if (existingId) {
        // Update existing source
        response = await supabase
          .from("sources")
          .update({
            name: sourceConfig.name,
            description: sourceConfig.description,
            config: sourceConfig.config,
            updated_at: new Date().toISOString(),
            last_validated_at: sourceConfig.last_validated_at,
          })
          .eq("id", existingId);
      } else {
        // Create new source
        response = await supabase
          .from("sources")
          .insert(sourceConfig);
      }

      if (response.error) {
        throw response.error;
      }

      toast({
        title: existingId ? "Source updated" : "Source created",
        description: existingId 
          ? "Your source has been updated successfully."
          : "Your source has been created successfully.",
      });

      navigate("/sources");
    } catch (error) {
      console.error("Error saving source:", error);
      toast({
        title: "Error",
        description: `Failed to ${existingId ? 'update' : 'create'} the source. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSourceTypeName = (type: string) => {
    switch (type) {
      case "shopify": return "Shopify";
      case "woocommerce": return "WooCommerce";
      case "ftp_sftp": return "FTP/SFTP";
      case "custom_api": return "Custom API";
      default: return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
        <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">
          Connection Successful!
        </h3>
        <p className="text-sm text-muted-foreground">
          Your {getSourceTypeName(sourceData.type)} source has been validated successfully.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-1">Source Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Type:</div>
            <div>{getSourceTypeName(sourceData.type)}</div>
            <div className="font-medium">Name:</div>
            <div>{sourceData.name}</div>
            {sourceData.description && (
              <>
                <div className="font-medium">Description:</div>
                <div>{sourceData.description}</div>
              </>
            )}
          </div>
        </div>

        {sourceData.type === "shopify" && sourceData.validationResult?.shopInfo && (
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-1">Shopify Shop Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Shop Name:</div>
              <div>{sourceData.validationResult.shopInfo.name}</div>
              <div className="font-medium">Plan:</div>
              <div>{sourceData.validationResult.shopInfo.plan.displayName}</div>
              <div className="font-medium">API Version:</div>
              <div>{sourceData.credentials.api_version}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
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
