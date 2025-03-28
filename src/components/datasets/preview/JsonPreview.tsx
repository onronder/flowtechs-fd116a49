
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface JsonPreviewProps {
  data: any;
  initialExpand?: boolean;
  maxHeight?: string;
}

export default function JsonPreview({ data, initialExpand = false, maxHeight = "30rem" }: JsonPreviewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggleNode = (path: string) => {
    setExpanded(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast({
        title: "Copied to clipboard",
        description: "JSON data has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const renderValue = (value: any, path: string, depth: number): JSX.Element => {
    if (value === null) {
      return <span className="text-gray-500">null</span>;
    }

    if (value === undefined) {
      return <span className="text-gray-500">undefined</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-amber-600">{value}</span>;
    }

    if (typeof value === 'string') {
      if (value.length > 100) {
        return <span className="text-green-600">"{value.substring(0, 100)}..."</span>;
      }
      return <span className="text-green-600">"{value}"</span>;
    }

    if (Array.isArray(value)) {
      const isExpanded = expanded[path] ?? initialExpand;
      
      return (
        <div>
          <div className="inline-flex items-center cursor-pointer" onClick={() => toggleNode(path)}>
            {isExpanded ? 
              <ChevronDown className="h-3 w-3 mr-1" /> : 
              <ChevronRight className="h-3 w-3 mr-1" />}
            <span className="text-blue-600">Array({value.length})</span>
          </div>
          
          {isExpanded && (
            <div className="ml-4 border-l border-gray-300 pl-2">
              {value.map((item, i) => (
                <div key={i} className="my-1">
                  <span className="text-gray-500 mr-2">{i}:</span>
                  {renderValue(item, `${path}.${i}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const isExpanded = expanded[path] ?? initialExpand;
      const keys = Object.keys(value);
      
      return (
        <div>
          <div className="inline-flex items-center cursor-pointer" onClick={() => toggleNode(path)}>
            {isExpanded ? 
              <ChevronDown className="h-3 w-3 mr-1" /> : 
              <ChevronRight className="h-3 w-3 mr-1" />}
            <span className="text-blue-600">Object({keys.length})</span>
          </div>
          
          {isExpanded && (
            <div className="ml-4 border-l border-gray-300 pl-2">
              {keys.map(key => (
                <div key={key} className="my-1">
                  <span className="text-gray-800 font-medium mr-2">{key}:</span>
                  {renderValue(value[key], `${path}.${key}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">JSON Data</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyToClipboard}
          className="h-7 px-2"
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copy
        </Button>
      </div>
      
      <div 
        className="font-mono text-xs overflow-auto"
        style={{ maxHeight }}
      >
        {renderValue(data, 'root', 0)}
      </div>
    </div>
  );
}
