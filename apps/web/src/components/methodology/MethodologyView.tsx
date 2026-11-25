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
      <PolicyGatesPanel gates={output.gates} />

      <section
        aria-label="Mathematical methodology"
        className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-3"
      >
        {/* Card 1: Spatial Gravity Mobility Coupling */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-[#0f766e]">
              <Network className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold text-[#0f172a]">
              1. Spatial Gravity Mobility Matrix
            </h3>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
            Pairwise Haversine distances (Earth radius 6,371 km) generate a row-stochastic commuter
            coupling matrix <em>W</em> and an incoming population-weighted Hub Centrality score:
          </p>

          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-[#0f172a]">
            <div>
              G<sub>ij</sub> = (N<sub>i</sub>
              <sup>0.6</sup> · N<sub>j</sub>
              <sup>0.6</sup>) / (d<sub>ij</sub> + 2.0)<sup>1.5</sup>
            </div>
            <div>
              W<sub>ii</sub> = 1 - m<sub>out</sub>, &nbsp; W<sub>ij</sub> = m<sub>out</sub> · G
              <sub>ij</sub> / &Sigma;<sub>k&ne;i</sub> G<sub>ik</sub>
            </div>
            <div>
              HubIndex<sub>i</sub> = &Sigma;<sub>j&ne;i</sub> W<sub>ji</sub> · (N<sub>j</sub> / N
              <sub>avg</sub>)
            </div>
          </div>

          <p className="mt-3 font-mono text-[11px] tabular-nums text-slate-500">
            Active configuration: {districts.length} districts, daily outflow{' '}
            {Math.round(params.mobilityOutflow * 100)}%.
          </p>
        </article>

        {/* Card 2: Compartmental Dynamics */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-[#0f766e]">
              <Sigma className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold text-[#0f172a]">
              2. Compartmental ODE Integrator (RK4)
            </h3>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
            Integrated via 4th-order Runge-Kutta (&Delta;t = {params.dt} days, {params.horizonDays}
            -day horizon, 92 daily snapshots) over vectorized Float64Array buffers with exact mass
            conservation.
          </p>

          {isVector ? (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-[#0f172a]">
              <div className="font-sans text-[11px] font-bold text-[#0f766e]">
                Vector-Borne SEIR-SEI (Dengue)
              </div>
              <div>
                &phi;<sub>T</sub>(T) = max(0.15, exp(-(T - 29)<sup>2</sup> / 84.5))
              </div>
              <div>
                &phi;<sub>R</sub>(R) = 0.75 + 0.65 · R / (R + 25)
              </div>
              <div>
                m<sub>eff,i</sub>(t) = m<sub>0</sub> · &phi;<sub>R</sub> · (1 - &eta; · u<sub>i</sub>
                (w))
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-[#0f172a]">
              <div className="font-sans text-[11px] font-bold text-[#0f766e]">
                Direct-Contact SEIR (Respiratory)
              </div>
              <div>
                &lambda;<sub>h,i</sub> = &beta;<sub>0</sub> · (1 - &eta; · u<sub>i</sub>(w)) ·
                &Sigma;<sub>j</sub> W<sub>ij</sub> (I<sub>j</sub> / N<sub>j</sub>)
              </div>
              <div>
                &beta;<sub>0</sub> = 0.42, &nbsp; &sigma;<sub>h</sub> = 1/4.0d, &nbsp; &gamma;
                <sub>h</sub> = 1/6.5d
              </div>
            </div>
          )}

          <p className="mt-3 font-mono text-[11px] tabular-nums text-slate-500">
            ICU rate {(params.icuRate * 100).toFixed(2)}% · Efficacy{' '}
            {Math.round(effectiveEfficacy * 100)}% · Climate:{' '}
            {climate.source === 'open_meteo' ? 'Live Open-Meteo' : 'Seasonal Benchmark'}.
          </p>
        </article>

        {/* Card 3: Constrained Resource Optimizer */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-[#0f766e]">
              <Cpu className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold text-[#0f172a]">
              3. Two-Stage Constrained Optimizer
            </h3>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
            Under strict weekly quota &Sigma;<sub>i</sub> u<sub>i</sub>(w) &le; K, Stage 1 builds
            14–28d lookahead seeds and Stage 2 executes checkpointed multi-pass 2-week and 1-week
            district swaps.
          </p>

          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-[#0f172a]">
            <div>
              J(U) = &Sigma;<sub>t,i</sub> [ 25.0 · max(0, H<sub>i</sub>(t) - C<sub>ICU,i</sub>) + I
              <sub>i</sub>(t) ]
            </div>
            <div className="font-sans text-[11px] text-slate-600">
              <strong>ICU-First Rule:</strong> Lower total ICU overflow wins first; objective cost
              breaks ties under the Hospital Safety Guardrail.
            </div>
          </div>

          <p className="mt-3 font-mono text-[11px] tabular-nums text-slate-500">
            Quota K = {weeklyQuotaK}/wk · Cap {EPIDEMIC_CONSTANTS.optimizer.maxSwapEvaluations} swaps
            ({EPIDEMIC_CONSTANTS.optimizer.timeBudgetMs} ms guard).
          </p>
        </article>
      </section>

      <section
        aria-label="Limitations and synthetic benchmark disclaimer"
        className="rounded-xl border border-amber-300 bg-amber-50/70 p-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#b45309]" aria-hidden="true" />
          <div className="space-y-1 text-xs leading-relaxed text-slate-700">
            <h3 className="text-sm font-bold text-[#92400e]">
              Model Scope &amp; Synthetic Benchmark Note
            </h3>
            <p>
              <strong>Metro Tropica</strong> (18 wards) and <strong>Harbor Corridor</strong> (16
              wards) are calibrated synthetic urban benchmarks anchored to real geographic
              coordinates for authentic weather modulation and cartographic context. Outputs support
              planning research and scenario exploration, and are{' '}
              <strong>not real-time clinical directives</strong>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
