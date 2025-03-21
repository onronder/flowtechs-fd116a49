
import React from "react";
import { useNavigate } from "react-router-dom";
import CreateSourceStepper from "@/components/sources/CreateSourceStepper";

export default function AddSource() {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate("/sources");
  };

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Add New Data Source</h1>
        <p className="text-muted-foreground">Connect to a new data source</p>
      </div>

      <CreateSourceStepper onCancel={handleCancel} />
    </div>
  );
}
