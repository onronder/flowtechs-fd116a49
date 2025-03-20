
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { fetchSourceSchema } from "@/api/sourceApi";

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
      
      // Log for debugging
      console.log("Saving source data:", {
        ...sourceData,
        credentials: { 
          ...sourceData.credentials, 
          accessToken: sourceData.credentials?.accessToken ? "REDACTED" : undefined,
          apiKey: sourceData.credentials?.apiKey ? "REDACTED" : undefined,
          password: sourceData.credentials?.password ? "REDACTED" : undefined,
          consumerSecret: sourceData.credentials?.consumerSecret ? "REDACTED" : undefined
        }
      });

      const userData = await supabase.auth.getUser();
      
      if (!userData.data.user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to create a source.",
          variant: "destructive",
        });
        return;
      }

      // Create source record with proper typing
      const sourceRecord = {
        name: sourceData.name,
        description: sourceData.description || null,
        source_type: sourceData.type as SourceType,
        config: sourceData.credentials,
        user_id: userData.data.user.id,
        is_active: true,
        last_validated_at: new Date().toISOString()
      };

      console.log("Inserting source record:", {
        ...sourceRecord,
        config: { 
          ...sourceRecord.config, 
          accessToken: sourceRecord.config?.accessToken ? "REDACTED" : undefined,
          apiKey: sourceRecord.config?.apiKey ? "REDACTED" : undefined,
          password: sourceRecord.config?.password ? "REDACTED" : undefined,
          consumerSecret: sourceRecord.config?.consumerSecret ? "REDACTED" : undefined 
        }
      });

      let sourceId;
      
      if (existingId) {
        // Update existing source
        const { data: updateData, error: updateError } = await supabase
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
        
        if (updateError) {
          console.error("Error updating source:", updateError);
          throw updateError;
        }
        
        sourceId = existingId;
        console.log("Source updated successfully:", updateData);
      } else {
        // Create new source
        const { data: insertData, error: insertError } = await supabase
          .from("sources")
          .insert(sourceRecord)
          .select();
        
        if (insertError) {
          console.error("Error inserting source:", insertError);
          throw insertError;
        }
        
        sourceId = insertData?.[0]?.id;
        console.log("Source created successfully, ID:", sourceId, "Data:", insertData);
      }

      // If this is a Shopify source, fetch and cache the schema
      if (sourceData.type === "shopify" && sourceId) {
        console.log("Fetching schema for Shopify source:", sourceId);
        try {
          const schemaResult = await fetchSourceSchema(sourceId, true);
          console.log("Schema fetch result:", schemaResult);
        } catch (schemaError) {
          console.error("Error fetching schema:", schemaError);
          // Continue anyway - don't block source creation if schema fetch fails
        }
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
        description: `Failed to ${existingId ? 'update' : 'create'} the source. Please try again. Error: ${error.message || "Unknown error"}`,
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

        {/* Render Shopify specific info if available */}
        {sourceData.type === "shopify" && sourceData.validationResult?.shopInfo && (
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-1">Shopify Shop Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Shop Name:</div>
              <div>{sourceData.validationResult.shopInfo.name}</div>
              <div className="font-medium">Plan:</div>
              <div>{sourceData.validationResult.shopInfo.plan?.displayName || "N/A"}</div>
              <div className="font-medium">API Version:</div>
              <div>{sourceData.credentials.api_version}</div>
            </div>
          </div>
        )}

        {/* Render WooCommerce specific info if available */}
        {sourceData.type === "woocommerce" && sourceData.validationResult?.shopInfo && (
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-1">WooCommerce Site Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Site URL:</div>
              <div>{sourceData.validationResult.shopInfo.name}</div>
              <div className="font-medium">Connection Status:</div>
              <div>{sourceData.validationResult.shopInfo.connectionStatus}</div>
              <div className="font-medium">API Version:</div>
              <div>{sourceData.credentials.api_version || "v3"}</div>
            </div>
          </div>
        )}

        {/* Render FTP/SFTP specific info if available */}
        {sourceData.type === "ftp_sftp" && sourceData.validationResult?.connectionInfo && (
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-1">FTP/SFTP Connection Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Host:</div>
              <div>{sourceData.validationResult.connectionInfo.host}</div>
              <div className="font-medium">Protocol:</div>
              <div>{sourceData.validationResult.connectionInfo.protocol}</div>
              <div className="font-medium">Status:</div>
              <div>{sourceData.validationResult.connectionInfo.connectionStatus}</div>
            </div>
          </div>
        )}

        {/* Render Custom API specific info if available */}
        {sourceData.type === "custom_api" && sourceData.validationResult?.apiInfo && (
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-1">Custom API Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Base URL:</div>
              <div>{sourceData.validationResult.apiInfo.baseUrl}</div>
              <div className="font-medium">Status:</div>
              <div>{sourceData.validationResult.apiInfo.connectionStatus}</div>
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
