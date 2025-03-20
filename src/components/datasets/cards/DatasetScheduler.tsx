
import { useToast } from "@/hooks/use-toast";
import { DatasetSchedule } from "@/api/datasets/datasetsApiTypes";

interface DatasetSchedulerProps {
  datasetId: string;
  onRefresh: () => void;
}

export default function DatasetScheduler({ datasetId, onRefresh }: DatasetSchedulerProps) {
  const { toast } = useToast();

  async function handleScheduleHourly() {
    try {
      // Use the correct type for DatasetSchedule
      const scheduleConfig: DatasetSchedule = { 
        type: "hourly",
        minute: 0 
      };
      
      await import('@/api/datasets/datasetSchedulingApi').then(module => {
        return module.scheduleDatasetExecution(datasetId, scheduleConfig);
      });
      
      toast({
        title: "Dataset Scheduled",
        description: "This dataset will run automatically every hour.",
      });
      onRefresh();
    } catch (error) {
      console.error("Error scheduling dataset:", error);
      toast({
        title: "Error",
        description: "Failed to schedule the dataset. Please try again.",
        variant: "destructive"
      });
    }
  }

  return { handleScheduleHourly };
}
