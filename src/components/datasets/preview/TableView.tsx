
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface TableViewProps {
  data: any[];
  columns?: Array<{ key: string; label: string }>;
}

export default function TableView({ data, columns }: TableViewProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Add detailed validation and error handling for data
  if (!data) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No data received from the server.
        </AlertDescription>
      </Alert>
    );
  }

  if (!Array.isArray(data)) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Invalid data format. Expected an array but received {typeof data}.
          {typeof data === 'object' && data !== null && (
            <div className="mt-2 p-2 text-xs bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-32">
              {JSON.stringify(data, null, 2)}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data to display</div>;
  }

  // Check if data contains valid objects
  for (let i = 0; i < Math.min(data.length, 3); i++) {
    if (typeof data[i] !== 'object' || data[i] === null) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid row format at index {i}. Expected object but received {typeof data[i]}.
            <div className="mt-2 p-2 text-xs bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-32">
              {JSON.stringify(data.slice(0, 3), null, 2)}
            </div>
          </AlertDescription>
        </Alert>
      );
    }
  }

  // Use columns if provided, otherwise derive from first data item
  const tableColumns = columns?.length 
    ? columns 
    : Object.keys(data[0]).map(key => ({ key, label: key }));

  const toggleRow = (rowIndex: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowIndex]: !prev[rowIndex]
    }));
  };

  return (
    <div className="overflow-auto max-h-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            {tableColumns.map(col => (
              <th key={col.key} className="px-4 py-2 text-left font-medium text-sm sticky top-0 bg-muted">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
              {tableColumns.map(col => {
                const value = row[col.key];
                const isExpandable = typeof value === 'object' && value !== null;
                
                return (
                  <td key={col.key} className="px-4 py-2 text-sm border-t">
                    {isExpandable ? (
                      <div>
                        <button 
                          onClick={() => toggleRow(i)}
                          className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {expandedRows[i] ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                          {Array.isArray(value) 
                            ? `Array (${value.length})` 
                            : `Object (${Object.keys(value).length})`}
                        </button>
                        
                        {expandedRows[i] && (
                          <pre className="mt-2 p-2 text-xs bg-gray-50 dark:bg-gray-800 overflow-auto max-h-40 rounded">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        )}
                      </div>
                    ) : (
                      formatCellValue(value)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCellValue(value: any) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }
  
  if (typeof value === 'object') {
    try {
      return (
        <span className="text-blue-600 dark:text-blue-400">
          {JSON.stringify(value).substring(0, 50)}
          {JSON.stringify(value).length > 50 ? '...' : ''}
        </span>
      );
    } catch (err) {
      return <span className="text-red-600 dark:text-red-400">[Circular Object]</span>;
    }
  }
  
  if (typeof value === 'boolean') {
    return <span className="text-purple-600 dark:text-purple-400">{value.toString()}</span>;
  }
  
  if (typeof value === 'number') {
    return <span className="text-amber-600 dark:text-amber-400">{value}</span>;
  }
  
  // Handle potentially large string values
  if (typeof value === 'string' && value.length > 100) {
    return (
      <span title={value}>
        {value.substring(0, 100)}...
      </span>
    );
  }
  
  return value.toString();
}
