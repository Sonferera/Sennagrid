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
          <h2 className="text-base font-medium text-slate-100">Workspace Initialized</h2>
          <p className="mt-2 text-sm text-slate-300">
            Phase 1 foundation is active. Core engine contracts, gravity mobility matrix, and
            climate modulation modules are verified in Vitest. Simulator map, solver, and optimizer
            views are scheduled next.
          </p>
        </section>
      </main>
    </div>
  );
}
