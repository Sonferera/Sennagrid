import {
  optimizeResourceAllocation,
  type WorkerResponse,
  type WorkerRunRequest,
} from '@sennagrid/engine';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<WorkerRunRequest>) => {
  const msg = event.data;
  if (!msg || msg.type !== 'RUN_OPTIMIZATION') {
    return;
  }

  try {
    const result = optimizeResourceAllocation(msg.districts, msg.params, msg.climate);
    const response: WorkerResponse = {
      type: 'OPTIMIZATION_RESULT',
      requestId: msg.requestId,
      result,
    };
    workerScope.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      type: 'OPTIMIZATION_ERROR',
      requestId: msg.requestId,
      error: err instanceof Error ? err.message : 'Unexpected optimization worker failure',
    };
    workerScope.postMessage(response);
  }
};
