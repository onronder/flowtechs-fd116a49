import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchUserDatasets,
  deleteDataset,
  resetStuckExecutions,
} from "@/api/datasetsApi";
import DatasetActions from "@/components/datasets/DatasetActions";
import NewDatasetModal from "@/components/datasets/NewDatasetModal";
import DatasetPreviewModal from "@/components/datasets/DatasetPreviewModal";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateDatasetExecutionFlow } from "@/api/datasets/execution/migrationHelper";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Datasets() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<Record<string, boolean>>({});
  const [errorState, setErrorState] = useState<Record<string, boolean>>({});
  const [lastExecutionTimes, setLastExecutionTimes] = useState<Record<string, string | null>>({});
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchUserDatasets();
      setDatasets(data);

      const initialExecutionTimes: Record<string, string | null> = {};
      const initialRunningStates: Record<string, boolean> = {};
      const initialErrorStates: Record<string, boolean> = {};

      data.forEach(dataset => {
        initialExecutionTimes[dataset.id] = dataset.last_execution_time || null;
        
        const isDatasetRunning = dataset.last_execution_id && !dataset.last_execution_time;
        initialRunningStates[dataset.id] = isDatasetRunning;
        
        initialErrorStates[dataset.id] = false;
      });

      setLastExecutionTimes(initialExecutionTimes);
      setIsRunning(initialRunningStates);
      setErrorState(initialErrorStates);
    } catch (error) {
      console.error("Error fetching datasets:", error);
      toast({
        title: "Error",
        description: "Failed to load datasets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDatasets();

    /*
    const migrateDatasets = async () => {
      try {
        const result = await updateDatasetExecutionFlow();
        if (result && result.updated > 0) {
          console.log(`Migrated ${result.updated} datasets to the direct API execution flow`);
          fetchDatasets();
        }
      } catch (error) {
        console.error("Error migrating datasets:", error);
      }
    };

    migrateDatasets();
    */
  }, [fetchDatasets]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDatasetCreated = () => {
    fetchDatasets();
  };

  const handleViewPreview = (datasetId: string, executionId: string) => {
    toast({
      title: "Legacy Feature",
      description: "Dataset preview is currently under maintenance. New implementation coming soon.",
      variant: "default",
    });
  };

  const handleClosePreviewModal = () => {
    setIsPreviewModalOpen(false);
    setSelectedDatasetId(null);
    setSelectedExecutionId(null);
  };

  const handleRunDataset = (datasetId: string) => {
    toast({
      title: "Legacy Feature",
      description: "Dataset execution is currently under maintenance. New implementation coming soon.",
      variant: "default",
    });
  };

  const handleExecutionStarted = (datasetId: string, executionId: string) => {
    setLastExecutionTimes(prev => ({ ...prev, [datasetId]: new Date().toISOString() }));
    setIsRunning(prev => ({ ...prev, [datasetId]: true }));
    setErrorState(prev => ({ ...prev, [datasetId]: false }));
    fetchDatasets();
  };

  const handleScheduleDataset = (datasetId: string) => {
    navigate(`/datasets/${datasetId}/schedule`);
  };

  const handleDeleteDataset = async (datasetId: string) => {
    try {
      await deleteDataset(datasetId);
      setDatasets(prev => prev.filter(dataset => dataset.id !== datasetId));
      toast({
        title: "Dataset Deleted",
        description: "The dataset has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting dataset:", error);
      toast({
        title: "Error",
        description: "Failed to delete the dataset. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshList = () => {
    fetchDatasets();
  };

  const handleResetStuckExecutions = async () => {
    toast({
      title: "Legacy Feature",
      description: "Reset functionality is currently under maintenance. New implementation coming soon.",
      variant: "default",
    });
  };

  return (
    <div className="h-full space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Datasets</h1>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" disabled={true}>
                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                  Reset Stuck Executions
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Legacy system under cleanup</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" onClick={handleOpenModal}>
            <Plus className="h-4 w-4 mr-2" />
            New Dataset
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="relative overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Last Executed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell className="text-right"><Skeleton /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : datasets.length > 0 ? (
        <ScrollArea>
          <div className="relative overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Executed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map(dataset => (
                  <TableRow key={dataset.id}>
                    <TableCell className="font-medium">{dataset.name}</TableCell>
                    <TableCell>{dataset.dataset_type}</TableCell>
                    <TableCell>{dataset.source?.source_type}</TableCell>
                    <TableCell>
                      {lastExecutionTimes[dataset.id] ? (
                        format(new Date(lastExecutionTimes[dataset.id]!), "MMM dd, yyyy hh:mm a")
                      ) : (
                        "Never"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-block">
                              <DatasetActions
                                datasetId={dataset.id}
                                datasetName={dataset.name}
                                lastExecutionId={dataset.last_execution_id}
                                isRunning={isRunning[dataset.id] || false}
                                errorState={errorState[dataset.id] || false}
                                schedule={dataset.schedule}
                                onViewPreview={() => handleViewPreview(dataset.id, dataset.last_execution_id)}
                                onRunDataset={() => handleRunDataset(dataset.id)}
                                onExecutionStarted={(executionId) => handleExecutionStarted(dataset.id, executionId)}
                                onScheduleDataset={() => handleScheduleDataset(dataset.id)}
                                onDeleteDataset={() => handleDeleteDataset(dataset.id)}
                                onRefresh={handleRefreshList}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Legacy execution system under cleanup</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold mb-4">No Datasets Created Yet</h2>
          <p className="text-muted-foreground mb-6">
            Get started by creating your first dataset.
          </p>
          <Button size="sm" onClick={handleOpenModal}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Dataset
          </Button>
        </div>
      )}

      <NewDatasetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDatasetCreated={handleDatasetCreated}
      />

      {/*
      {selectedDatasetId && selectedExecutionId && (
        <DatasetPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={handleClosePreviewModal}
          title={datasets.find(d => d.id === selectedDatasetId)?.name || "Dataset"}
          executionId={selectedExecutionId}
          datasetType={datasets.find(d => d.id === selectedDatasetId)?.dataset_type}
          templateName={datasets.find(d => d.id === selectedDatasetId)?.template_name}
          children={<></>}
        />
      )}
      */}
    </div>
  );
}
