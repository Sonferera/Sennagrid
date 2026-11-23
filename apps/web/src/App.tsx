import { DEFAULT_SIMULATION_PARAMS } from '@sennagrid/engine';

export default function App() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">SennaGrid</h1>
        <p className="text-sm text-slate-400">
          Spatial Epidemic Digital Twin and Constrained Resource Optimizer
        </p>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-lg border border-slate-800 bg-[#0f172a] p-6">
          <h2 className="text-base font-medium text-slate-100">Monorepo Workspace Ready</h2>
          <p className="mt-2 text-sm text-slate-300">
            Connected to <code className="font-mono text-cyan-400">@sennagrid/engine</code> with
            default horizon{' '}
            <span className="font-mono tabular-nums text-slate-100">
              {DEFAULT_SIMULATION_PARAMS.horizonDays} days
            </span>{' '}
            and weekly budget ratio{' '}
            <span className="font-mono tabular-nums text-slate-100">
              {Math.round(DEFAULT_SIMULATION_PARAMS.budgetRatio * 100)}%
            </span>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
