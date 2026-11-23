import type {
  ClimateSeries,
  DistrictProperties,
  OptimizationOutput,
  SimulationParams,
  WorkerResponse,
  WorkerRunRequest,
} from '@sennagrid/engine';

export interface OptimizerWorkerClient {
  run: (
    districts: DistrictProperties[],
    params: SimulationParams,
    climate: ClimateSeries,
  ) => Promise<OptimizationOutput | null>;
  terminate: () => void;
}

/**
 * Wraps the native ESM optimizer worker with request-ID staleness protection
 * so rapid slider updates resolve older in-flight runs as null instead of overwriting state.
 */
export function createOptimizerWorkerClient(): OptimizerWorkerClient {
  const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), {
    type: 'module',
  });

  let latestRequestId = 0;
  let pendingResolve: ((value: OptimizationOutput | null) => void) | null = null;
  let pendingReject: ((reason: Error) => void) | null = null;

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data;
    if (!msg || msg.requestId !== latestRequestId) {
      return;
    }

    const resolve = pendingResolve;
    const reject = pendingReject;
    pendingResolve = null;
    pendingReject = null;

    if (msg.type === 'OPTIMIZATION_RESULT') {
      resolve?.(msg.result);
    } else {
      reject?.(new Error(msg.error));
    }
  };

  worker.onerror = (event) => {
    const reject = pendingReject;
    pendingResolve = null;
    pendingReject = null;
    reject?.(new Error(event.message || 'Optimizer worker runtime error'));
  };

  return {
    run(districts, params, climate) {
      if (pendingResolve) {
        pendingResolve(null);
        pendingResolve = null;
        pendingReject = null;
      }

      const requestId = ++latestRequestId;
      const payload: WorkerRunRequest = {
        type: 'RUN_OPTIMIZATION',
        requestId,
        params,
        districts,
        climate,
      };

      return new Promise<OptimizationOutput | null>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
        worker.postMessage(payload);
      });
    },
    terminate() {
      if (pendingResolve) {
        pendingResolve(null);
        pendingResolve = null;
        pendingReject = null;
      }
      worker.terminate();
    },
  };
}
