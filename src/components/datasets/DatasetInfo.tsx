
import { CalendarClock, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DatasetInfoProps {
  sourceName?: string;
  lastExecutionTime?: string;
  rowCount?: number | null;
  schedule?: {
    id: string;
    type: string;
    next_run_time?: string;
    is_active: boolean;
  };
}

export default function DatasetInfo({ sourceName, lastExecutionTime, rowCount, schedule }: DatasetInfoProps) {
  return (
    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
      {sourceName && (
        <div className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          <span>Source: {sourceName}</span>
        </div>
      )}
      
      {lastExecutionTime && (
        <div className="flex items-center gap-1">
          <span className="text-xs">
            Last executed: {formatDistanceToNow(new Date(lastExecutionTime), { addSuffix: true })}
            {rowCount !== undefined && rowCount !== null && ` • ${rowCount.toLocaleString()} rows`}
          </span>
        </div>
      )}
      
      {schedule && (
        <div className="flex items-center gap-1">
          <CalendarClock className="h-3 w-3" />
          <span className="text-xs">
            {schedule.is_active ? 'Scheduled' : 'Schedule paused'}: {formatScheduleType(schedule.type)}
            {schedule.next_run_time && ` • Next run: ${formatDistanceToNow(new Date(schedule.next_run_time), { addSuffix: true })}`}
          </span>
        </div>
      )}
    </div>
  );
}

function formatScheduleType(type: string): string {
  switch (type) {
    case 'once': return 'One-time';
    case 'hourly': return 'Hourly';
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'custom': return 'Custom';
    default: return type;
  }
}
