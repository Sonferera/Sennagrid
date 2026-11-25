import { EPIDEMIC_CONSTANTS, type OptimizationOutput } from '@sennagrid/engine';
import { AlertTriangle, Cpu, Network, Sigma } from 'lucide-react';
import { PolicyGatesPanel } from './PolicyGatesPanel';

interface MethodologyViewProps {
  output: OptimizationOutput;
}

export function MethodologyView({ output }: MethodologyViewProps) {
  const { params, climate, weeklyQuotaK, districts } = output;
  const isVector = params.diseaseMode === 'vector_seir_sei';
  const effectiveEfficacy =
    params.interventionEfficacy ??
    (isVector ? EPIDEMIC_CONSTANTS.vector.etaVec : EPIDEMIC_CONSTANTS.direct.etaInt);

  return (
    <div className="space-y-4">
      {/* Live Policy Gates Verification */}
      <PolicyGatesPanel gates={output.gates} />

      {/* Mathematical Models & Optimization Specification */}
      <section
        aria-label="Mathematical methodology"
        className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-3"
      >
        {/* Card 1: Spatial Gravity Mobility Coupling */}
        <article className="rounded-lg border border-slate-800 bg-[#0f172a] p-4">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-100">
              1. Spatial Gravity Mobility Coupling
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Pairwise district distances use great-circle Haversine kilometers (Earth radius 6,371
            km) to build a row-stochastic commuter coupling matrix W and population-weighted
            incoming Hub Centrality index.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-slate-700 bg-[#162033] p-3 font-mono text-[11px] leading-relaxed text-slate-200">
{`G_ij = (N_i^0.6 * N_j^0.6) / (d_ij + 2.0)^1.5
W_ii = 1 - m_out
W_ij = m_out * G_ij / sum_{k != i}(G_ik)
HubIndex_i = sum_{j != i}(W_ji * N_j / N_avg)`}
          </pre>
          <p className="mt-2.5 font-mono text-[11px] tabular-nums text-slate-400">
            Active run: N = {districts.length} districts, m_out ={' '}
            {(params.mobilityOutflow * 100).toFixed(0)}%.
          </p>
        </article>

        {/* Card 2: Compartmental Epidemic Dynamics */}
        <article className="rounded-lg border border-slate-800 bg-[#0f172a] p-4">
          <div className="flex items-center gap-2">
            <Sigma className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-100">
              2. Compartmental Dynamics (RK4)
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Integrated via fixed-step 4th-order Runge-Kutta (dt = {params.dt} days,{' '}
            {params.horizonDays}-day horizon, 92 daily snapshots) with conservation-preserving
            clamping on Float64Array buffers.
          </p>
          {isVector ? (
            <pre className="mt-3 overflow-x-auto rounded-md border border-slate-700 bg-[#162033] p-3 font-mono text-[11px] leading-relaxed text-slate-200">
{`Mode: Vector-Borne SEIR-SEI (7*N state)
phi_T(T) = max(0.15, exp(-((T - 29.0)^2)/(2*6.5^2)))
phi_R(R) = 0.75 + 0.65 * R / (R + 25.0)
m_eff_i(t) = m0 * phi_R * (1 - eta_vec * u_i(w))
b0=0.50, beta_vh=0.40, beta_hv=0.40, m0=1.60`}
            </pre>
          ) : (
            <pre className="mt-3 overflow-x-auto rounded-md border border-slate-700 bg-[#162033] p-3 font-mono text-[11px] leading-relaxed text-slate-200">
{`Mode: Direct-Contact SEIR (4*N state)
lambda_h_i = beta0 * (1 - eta_int * u_i(w))
             * sum_j(W_ij * I_j / N_j)
beta0=0.42, sigma_h=1/4.0, gamma_h=1/6.5`}
            </pre>
          )}
          <p className="mt-2.5 font-mono text-[11px] tabular-nums text-slate-400">
            Active run: ICU rate {(params.icuRate * 100).toFixed(2)}%, efficacy{' '}
            {Math.round(effectiveEfficacy * 100)}%, climate source{' '}
            {climate.source === 'open_meteo' ? 'Open-Meteo' : 'Fallback'}.
          </p>
        </article>

        {/* Card 3: Constrained Resource Optimizer */}
        <article className="rounded-lg border border-slate-800 bg-[#0f172a] p-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-100">
              3. Stage 1 &amp; Stage 2 Optimizer
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Subject to weekly budget quota sum_i u_i(w) &lt;= K, Stage 1 evaluates receding-horizon
            predictive seeds, and Stage 2 runs bounded multi-pass 2-week block swaps and 1-week
            swaps from cached weekly checkpoints.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-slate-700 bg-[#162033] p-3 font-mono text-[11px] leading-relaxed text-slate-200">
{`J(U) = sum_{t=0..91} sum_i (
  25.0 * max(0, H_i(t) - C_ICU_i) + 1.0 * I_i(t)
)
Acceptance: ICU-overflow-first, cost tie-break
Guardrail: overflow <= Reactive & collapse <= Reactive`}
          </pre>
          <p className="mt-2.5 font-mono text-[11px] tabular-nums text-slate-400">
            Active run: K = {weeklyQuotaK}/wk, max {EPIDEMIC_CONSTANTS.optimizer.maxSwapEvaluations}{' '}
            swaps, {EPIDEMIC_CONSTANTS.optimizer.timeBudgetMs} ms guard.
          </p>
        </article>
      </section>

      {/* Limitations & Synthetic Benchmark Disclaimer */}
      <section
        aria-label="Limitations and synthetic benchmark disclaimer"
        className="rounded-lg border border-amber-500/40 bg-[#162033] p-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <div className="space-y-1.5 text-xs leading-relaxed text-slate-300">
            <h3 className="text-sm font-semibold text-amber-300">
              Model Assumptions &amp; Synthetic Benchmark Disclaimer
            </h3>
            <p>
              <strong>Metro Tropica</strong> (18 districts) and <strong>Harbor Corridor</strong> (16
              districts) are calibrated synthetic urban benchmarks anchored to real WGS84
              coordinates so Open-Meteo climate modulation and MapLibre basemaps operate
              authentically without external data silos.
            </p>
            <p>
              SennaGrid is built for public health decision-support research, resource-allocation
              education, and scenario comparison. Simulation outputs depend directly on model
              assumptions and user-configured parameters, and are{' '}
              <strong className="text-slate-100">not real-time clinical directives</strong>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
