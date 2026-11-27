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
        <article className="flex flex-col justify-between rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-6 transition-colors">
          <div>
            <h3 className="text-base font-semibold text-[var(--sg-text-primary)]">
              Spatial Gravity Mobility
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sg-text-muted)]">
              Multi-district coupling uses Haversine transit distances (6,371 km) and population
              scaling to compute row-stochastic commuter weights linking all metropolitan zones.
            </p>
          </div>
          <div className="mt-4 space-y-1.5 rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-3.5 font-mono text-[13px] text-[var(--sg-text-primary)]">
            <div>
              G<sub>ij</sub> = (N<sub>i</sub>
              <sup>0.6</sup> · N<sub>j</sub>
              <sup>0.6</sup>) / (d<sub>ij</sub> + 2.0)<sup>1.5</sup>
            </div>
            <div className="text-[var(--sg-teal)]">
              W<sub>ij</sub> = m<sub>out</sub> · G<sub>ij</sub> / &Sigma;<sub>k&ne;i</sub> G
              <sub>ik</sub>
            </div>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-6 transition-colors">
          <div>
            <h3 className="text-base font-semibold text-[var(--sg-text-primary)]">
              Compartmental ODE Solver
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sg-text-muted)]">
              {isVector
                ? 'Vector SEIR-SEI dynamics with thermal and rainfall incubation modifiers evaluated over typed Float64Array buffers.'
                : 'Direct-contact SEIR transmission evaluated across contiguous typed Float64Array buffers with exact mass conservation.'}
            </p>
          </div>
          <div className="mt-4 space-y-1.5 rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-3.5 font-mono text-[13px] text-[var(--sg-text-primary)]">
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
            <div className="text-[var(--sg-teal)]">
              RK4 · &Delta;t = {params.dt}d · {params.horizonDays}d Horizon
            </div>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-6 transition-colors">
          <div>
            <h3 className="text-base font-semibold text-[var(--sg-text-primary)]">
              Two-Stage Constrained Optimizer
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sg-text-muted)]">
              Stage 1 generates receding-horizon seeds weighted by hub centrality and hospital risk;
              Stage 2 runs checkpointed coordinate swaps under the hard ICU safety guardrail.
            </p>
          </div>
          <div className="mt-4 space-y-1.5 rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-3.5 font-mono text-[13px] text-[var(--sg-text-primary)]">
            <div>
              min J(U) = &Sigma; [ 25·max(0, ICU<sub>t</sub> - C<sub>i</sub>) + I<sub>t</sub> ]
            </div>
            <div className="text-[var(--sg-teal)]">
              Cap: {EPIDEMIC_CONSTANTS.optimizer.maxSwapEvaluations} swaps · Quota K=
              {output.weeklyQuotaK}/wk
            </div>
          </div>
        </article>
      </section>

      {/* Clean Execution Pipeline & Synthetic Benchmark Scope */}
      <section
        aria-label="Runtime pipeline and benchmark scope"
        className="rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-6 transition-colors"
      >
        <h3 className="text-xs font-semibold tracking-wider text-[var(--sg-text-muted)] uppercase">
          Runtime Execution Pipeline
        </h3>

        <ol className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {PIPELINE_STEPS.map((step, idx) => (
            <li key={step.num} className="flex items-center gap-2.5 text-sm">
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                  idx === PIPELINE_STEPS.length - 1
                    ? 'bg-[var(--sg-teal-fill)] text-[var(--sg-teal-fill-ink)]'
                    : 'border border-[var(--sg-border-control)] bg-[var(--sg-inset)] text-[var(--sg-text-secondary)]'
                }`}
              >
                {step.num}
              </span>
              <span
                className={
                  idx === PIPELINE_STEPS.length - 1
                    ? 'font-semibold text-[var(--sg-teal)]'
                    : 'font-medium text-[var(--sg-text-primary)]'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-5 border-t border-[var(--sg-border-subtle)] pt-4 text-sm leading-relaxed text-[var(--sg-text-muted)]">
          <strong className="font-semibold text-[var(--sg-text-primary)]">Benchmark Scope:</strong>{' '}
          Metro Tropica (18), Harbor Corridor (16), Highland Ring (16), and Monsoon Delta (18) are
          calibrated urban topologies anchored to land coordinates for reproducible research, while
          Custom City Search projects a normalized 18-ward urban density grid using live Open-Meteo
          weather, not clinical directives.
        </p>
      </section>
    </div>
  );
}
