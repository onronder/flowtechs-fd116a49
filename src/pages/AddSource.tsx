
import React from "react";
import { useNavigate } from "react-router-dom";
import CreateSourceStepper from "@/components/sources/CreateSourceStepper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AddSource() {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate("/sources");
  };

  return (
    <div className="h-full">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-4" 
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add New Data Source</h1>
          <p className="text-muted-foreground">Connect to a new data source</p>
        </div>
      </div>

      <CreateSourceStepper onCancel={handleCancel} />
    </div>
  );
}
