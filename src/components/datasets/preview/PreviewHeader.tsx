
import { useEffect, useState } from "react";
import { Database, TagIcon } from "lucide-react";

export interface PreviewHeaderProps {
  title: string;
  datasetType?: string;
  templateName?: string;
}

export default function PreviewHeader({ 
  title,
  datasetType,
  templateName
}: PreviewHeaderProps) {
  const [typeLabel, setTypeLabel] = useState<string>("");
  
  useEffect(() => {
    if (!datasetType) {
      setTypeLabel("");
      return;
    }
    
    switch (datasetType.toLowerCase()) {
      case 'predefined':
        setTypeLabel(templateName || 'Predefined Dataset');
        break;
      case 'dependent':
        setTypeLabel(templateName || 'Dependent Dataset');
        break;
      case 'custom':
        setTypeLabel('Custom Query');
        break;
      case 'direct_api':
        setTypeLabel(templateName || 'Direct API');
        break;
      default:
        setTypeLabel(datasetType);
    }
  }, [datasetType, templateName]);
  
  return (
    <div className="p-4 border-b flex items-center justify-between">
      <div className="flex items-center">
        <Database className="h-5 w-5 mr-2 text-primary" />
        <h3 className="text-lg font-medium truncate max-w-md">
          {title}
        </h3>
        
        {typeLabel && (
          <div className="ml-3 px-2 py-1 bg-muted rounded-md text-xs flex items-center">
            <TagIcon className="h-3 w-3 mr-1" />
            {typeLabel}
          </div>
        )}
      </div>
    </div>
  );
}
