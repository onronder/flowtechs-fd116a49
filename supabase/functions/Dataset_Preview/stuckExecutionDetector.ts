
/**
 * Checks if an execution appears to be stuck
 */
export function checkForStuckExecution(execution: any, checkStatus = false): {
  isStuck: boolean;
  execution: any;
} {
  // Only check for stuck executions if explicitly requested
  if (!checkStatus) {
    return { isStuck: false, execution };
  }
  
  // If status is already completed or failed, it's not stuck
  if (execution.status === 'completed' || execution.status === 'failed') {
    return { isStuck: false, execution };
  }
  
  // If not running or pending, it's not stuck
  if (execution.status !== 'running' && execution.status !== 'pending') {
    return { isStuck: false, execution };
  }
  
  // Check if the execution has been running for too long
  if (execution.start_time) {
    const startTime = new Date(execution.start_time).getTime();
    const now = new Date().getTime();
    const runningTimeMs = now - startTime;
    
    console.log(`Execution ${execution.id} running for ${runningTimeMs}ms`);
    
    // If running for more than 10 minutes, consider it stuck
    if (runningTimeMs > 10 * 60 * 1000) {
      console.log(`Execution ${execution.id} appears to be stuck (running > 10 minutes)`);
      return {
        isStuck: true,
        execution: {
          id: execution.id,
          startTime: execution.start_time,
          endTime: null,
        }
      };
    }
  }
  
  return { isStuck: false, execution };
}
