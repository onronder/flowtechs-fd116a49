
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { testSourceConnection, deleteSource } from "@/utils/sourceUtils";
import { Source } from "@/hooks/useSources";

interface SourceActionsProps {
  source: Source;
  onSourceUpdated: () => void;
  onEdit: (id: string) => void;
}

export default function SourceActions({ source, onSourceUpdated, onEdit }: SourceActionsProps) {
  const [isWorking, setIsWorking] = useState(false);
  const { toast } = useToast();

  const handleTestSource = async () => {
    if (isWorking) return;
    setIsWorking(true);
    
    try {
      const shouldRefresh = await testSourceConnection(source.id, source, toast);
      if (shouldRefresh) {
        onSourceUpdated();
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteSource = async () => {
    if (isWorking) return;
    setIsWorking(true);
    
    try {
      const success = await deleteSource(source.id, toast);
      if (success) {
        onSourceUpdated();
      }
    } finally {
      setIsWorking(false);
    }
  };

  return {
    handleTestSource,
    handleDeleteSource,
    handleEdit: () => onEdit(source.id),
    isWorking
  };
}
