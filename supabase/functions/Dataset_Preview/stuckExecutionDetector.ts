
/**
 * Checks if an execution may be stuck
 */
export function checkForStuckExecution(execution: any, checkStatus: boolean = false) {
  // Only check if explicitly requested and execution is in pending/running state
  if (checkStatus && 
      (execution.status === 'pending' || execution.status === 'running') && 
      execution.start_time) {
    const startTime = new Date(execution.start_time).getTime();
    const currentTime = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    
    // If the execution has been running for more than 15 minutes, it might be stuck
    if (currentTime - startTime > fifteenMinutes) {
      console.log(`Execution appears to be stuck (running for over 15 minutes)`);
      return {
        isStuck: true,
        status: 'stuck',
        execution: {
          id: execution.id,
          startTime: execution.start_time,
          status: execution.status
        }
      };
    }
  }
  
  return { isStuck: false };
}
