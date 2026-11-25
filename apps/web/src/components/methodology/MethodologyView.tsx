import { EPIDEMIC_CONSTANTS, type OptimizationOutput } from '@sennagrid/engine';
import { PolicyGatesPanel } from './PolicyGatesPanel';

interface MethodologyViewProps {
  output: OptimizationOutput;
}

const PIPELINE_STEPS = [
  { num: 1, label: 'Geometry & Beds' },
  { num: 2, label: 'Gravity Kernel W_ij' },
  { num: 3, label: 'RK4 Trajectory' },
  { num: 4, label: 'Policy Gates (1–5)' },
  { num: 5, label: '13-Week Dispatch' },
] as const;

export function MethodologyView({ output }: MethodologyViewProps) {
  const { params } = output;
  const isVector = params.diseaseMode === 'vector_seir_sei';

  return (
    <div className="space-y-6">
      <PolicyGatesPanel gates={output.gates} />

      {/* 3 Clean Mathematical Model Cards */}
      <section
        aria-label="Mathematical methodology"
        className="grid grid-cols-1 gap-5 lg:grid-cols-3"
      >
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Spatial Gravity Mobility</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Multi-district coupling uses Haversine transit distances (6,371 km) and population
              scaling to compute row-stochastic commuter weights linking all metropolitan zones.
            </p>
          </div>
          <div className="mt-4 space-y-1 rounded-lg border border-slate-200/80 bg-[#f8fafc] p-3 font-mono text-xs text-[#0f172a]">
            <div>
              G<sub>ij</sub> = (N<sub>i</sub>
              <sup>0.6</sup> · N<sub>j</sub>
              <sup>0.6</sup>) / (d<sub>ij</sub> + 2.0)<sup>1.5</sup>
            </div>
            <div>
              W<sub>ij</sub> = m<sub>out</sub> · G<sub>ij</sub> / &Sigma;<sub>k&ne;i</sub> G
              <sub>ik</sub>
            </div>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Compartmental ODE Solver</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {isVector
                ? 'Vector SEIR-SEI dynamics with thermal and rainfall incubation modifiers evaluated over typed Float64Array buffers.'
                : 'Direct-contact SEIR transmission evaluated across contiguous typed Float64Array buffers with exact mass conservation.'}
            </p>
          </div>
          <div className="mt-4 space-y-1 rounded-lg border border-slate-200/80 bg-[#f8fafc] p-3 font-mono text-xs text-[#0f172a]">
            {isVector ? (
              <div>
                m<sub>eff,i</sub>(t) = m<sub>0</sub> · &phi;<sub>R</sub> · (1 - &eta; · u<sub>i</sub>
                (w))
              </div>
            ) : (
              <div>
                &lambda;<sub>h,i</sub> = &beta;<sub>0</sub> · (1 - &eta; · u<sub>i</sub>(w)) ·
                &Sigma;<sub>j</sub> W<sub>ij</sub> (I<sub>j</sub> / N<sub>j</sub>)
              </div>
            )}
            <div>
              RK4 · &Delta;t = {params.dt}d · {params.horizonDays}d Horizon
            </div>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a]">
              Two-Stage Constrained Optimizer
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Stage 1 generates receding-horizon seeds weighted by hub centrality and hospital risk;
              Stage 2 runs checkpointed coordinate swaps under the hard ICU safety guardrail.
            </p>
          </div>
          <div className="mt-4 space-y-1 rounded-lg border border-slate-200/80 bg-[#f8fafc] p-3 font-mono text-xs text-[#0f172a]">
            <div>
              min J(U) = &Sigma; [ 25·max(0, ICU<sub>t</sub> - C<sub>i</sub>) + I<sub>t</sub> ]
            </div>
            <div>
              Cap: {EPIDEMIC_CONSTANTS.optimizer.maxSwapEvaluations} swaps · Quota K=
              {output.weeklyQuotaK}/wk
            </div>
          </div>
        </article>
      </section>

      {/* Clean Execution Pipeline & Synthetic Benchmark Scope */}
      <section
        aria-label="Runtime pipeline and benchmark scope"
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h3 className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
          Runtime Execution Pipeline
        </h3>

        <ol className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {PIPELINE_STEPS.map((step, idx) => (
            <li key={step.num} className="flex items-center gap-2.5 text-xs">
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold ${
                  idx === PIPELINE_STEPS.length - 1
                    ? 'bg-[#0f766e] text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {step.num}
              </span>
              <span
                className={
                  idx === PIPELINE_STEPS.length - 1
                    ? 'font-semibold text-[#0f766e]'
                    : 'font-medium text-[#0f172a]'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-600">
          <strong className="font-semibold text-[#0f172a]">Benchmark Scope:</strong> Metro Tropica
          (18 districts) and Harbor Corridor (16 districts) are calibrated synthetic urban
          topologies anchored to real coordinates for reproducible research and resource allocation
          study, not clinical directives.
        </p>
      </section>
    </div>
  );
}
