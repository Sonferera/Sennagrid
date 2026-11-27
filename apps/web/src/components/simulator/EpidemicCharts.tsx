import type { OptimizationOutput } from '@sennagrid/engine';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildDailyChartSeries,
  buildRadarSeries,
  formatFixed,
  formatInt,
  type DailyChartPoint,
} from '../../lib/viewModels';
import type { ThemeMode } from '../../store/useSimulationStore';

interface EpidemicChartsProps {
  output: OptimizationOutput | null;
  theme: ThemeMode;
  currentDay: number;
  onSelectDay: (day: number) => void;
}

interface CustomLineTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DailyChartPoint }>;
  mode: 'overflow' | 'infections';
}

function CustomLineTooltip({ active, payload, mode }: CustomLineTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-surface)] px-3 py-2 font-mono text-[13px] tabular-nums shadow-md">
      <div className="mb-1 font-sans font-semibold text-[var(--sg-text-primary)]">
        Day {point.day} (W{point.week})
      </div>
      {mode === 'overflow' ? (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-4 text-[var(--sg-rose)]">
            <span>Without SennaGrid</span>
            <span className="font-semibold">{formatFixed(point.reactiveOverflow, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[var(--sg-teal)]">
            <span>With SennaGrid</span>
            <span className="font-semibold">{formatFixed(point.sennagridOverflow, 1)} beds</span>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-4 text-[var(--sg-rose)]">
            <span>Without SennaGrid</span>
            <span className="font-semibold">{formatInt(point.reactiveActive)} cases</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[var(--sg-teal)]">
            <span>With SennaGrid</span>
            <span className="font-semibold">{formatInt(point.sennagridActive)} cases</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function EpidemicCharts({ output, theme, currentDay, onSelectDay }: EpidemicChartsProps) {
  const [chartTab, setChartTab] = useState<'overflow' | 'infections'>('overflow');

  const dailySeries = useMemo(() => (output ? buildDailyChartSeries(output) : []), [output]);
  const strategyBars = useMemo(() => (output ? buildRadarSeries(output) : []), [output]);

  const palette =
    theme === 'dark'
      ? {
          grid: '#2c2925',
          axis: '#3d3933',
          tick: '#a8a29e',
          ref: '#756e65',
          reactiveStroke: '#fb7185',
          reactiveFill: '#fb7185',
          reactiveOpacity: 0.18,
          optStroke: '#2dd4bf',
          optFill: '#2dd4bf',
          optOpacity: 0.2,
        }
      : {
          grid: '#eae4d8',
          axis: '#d6d0c4',
          tick: '#57534e',
          ref: '#8c857b',
          reactiveStroke: '#e11d48',
          reactiveFill: '#fac8d1',
          reactiveOpacity: 0.28,
          optStroke: '#0f766e',
          optFill: '#cbe8e2',
          optOpacity: 0.34,
        };

  if (!output || dailySeries.length === 0) {
    return (
      <section
        aria-label="Epidemic trajectory and fit"
        className="rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-6 text-center text-sm text-[var(--sg-text-muted)]"
      >
        No simulation trajectory available yet.
      </section>
    );
  }

  const handleChartClick = (state: { activeLabel?: string | number } | null | undefined) => {
    const raw = state?.activeLabel;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      onSelectDay(raw);
    } else if (typeof raw === 'string' && raw.trim() !== '') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        onSelectDay(parsed);
      }
    }
  };

  return (
    <section
      aria-label="Epidemic overflow trajectory and strategy fit"
      data-tour="epidemic-charts"
      className="scroll-mt-20 rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-5 transition-colors sm:p-6"
    >
      <div className="grid grid-cols-1 gap-8 min-[960px]:grid-cols-12 min-[960px]:items-start">
        {/* Left: Clean Trajectory Chart */}
        <article className="min-w-0 min-[960px]:col-span-7">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--sg-text-primary)]">
                {chartTab === 'overflow' ? 'ICU Overflow Trajectory' : 'Active Infections Trajectory'}
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--sg-text-muted)]">
                {chartTab === 'overflow'
                  ? 'Day 0 to Day 91 excess ICU beds above local ward capacity'
                  : 'Day 0 to Day 91 city-wide active cases (click chart to jump day)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 text-[13px] font-medium">
                <span className="inline-flex items-center gap-1.5 text-[var(--sg-rose)]">
                  <span
                    className="h-0.5 w-3 border-t-2 border-dashed border-[var(--sg-rose)]"
                    aria-hidden="true"
                  />
                  <span>
                    Reactive:{' '}
                    <strong className="font-mono tabular-nums">
                      {chartTab === 'overflow'
                        ? `+${formatFixed(output.reactive.peakIcuOverflow, 1)}`
                        : formatInt(output.reactive.peakActiveInfections)}
                    </strong>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[var(--sg-teal)]">
                  <span className="h-0.5 w-3 bg-[var(--sg-teal)]" aria-hidden="true" />
                  <span>
                    SennaGrid:{' '}
                    <strong className="font-mono tabular-nums">
                      {chartTab === 'overflow'
                        ? formatFixed(output.sennagrid.peakIcuOverflow, 1)
                        : formatInt(output.sennagrid.peakActiveInfections)}
                    </strong>
                  </span>
                </span>
              </div>

              <div
                role="group"
                aria-label="Trajectory chart view"
                className="inline-flex rounded-md border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-0.5 text-xs font-medium"
              >
                <button
                  type="button"
                  aria-pressed={chartTab === 'overflow'}
                  onClick={() => setChartTab('overflow')}
                  className={`min-h-[44px] rounded px-2.5 py-0.5 transition-all min-[720px]:min-h-[26px] ${
                    chartTab === 'overflow'
                      ? 'bg-[var(--sg-surface)] font-semibold text-[var(--sg-text-primary)] shadow-2xs ring-1 ring-[var(--sg-border-control)]/40'
                      : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
                  }`}
                >
                  Overflow
                </button>
                <button
                  type="button"
                  aria-pressed={chartTab === 'infections'}
                  onClick={() => setChartTab('infections')}
                  className={`min-h-[44px] rounded px-2.5 py-0.5 transition-all min-[720px]:min-h-[26px] ${
                    chartTab === 'infections'
                      ? 'bg-[var(--sg-surface)] font-semibold text-[var(--sg-text-primary)] shadow-2xs ring-1 ring-[var(--sg-border-control)]/40'
                      : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
                  }`}
                >
                  Cases
                </button>
              </div>
            </div>
          </div>

          <div className="h-56 w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {chartTab === 'overflow' ? (
                <AreaChart
                  data={dailySeries}
                  margin={{ top: 6, right: 12, left: 0, bottom: 2 }}
                  onClick={handleChartClick}
                >
                  <CartesianGrid horizontal vertical={false} stroke={palette.grid} />
                  <XAxis
                    dataKey="day"
                    axisLine={{ stroke: palette.axis }}
                    tickLine={false}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    ticks={[0, 30, 60, 91]}
                    tickFormatter={(v: number) => `Day ${v}`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    width={46}
                    tickFormatter={(v: number) =>
                      v >= 1000
                        ? `${(v / 1000).toFixed(1)}k`
                        : Number.isInteger(v)
                          ? String(v)
                          : v.toFixed(1)
                    }
                  />
                  <Tooltip content={<CustomLineTooltip mode="overflow" />} />
                  <ReferenceLine x={currentDay} stroke={palette.ref} strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="reactiveOverflow"
                    stroke={palette.reactiveStroke}
                    strokeWidth={2.2}
                    strokeDasharray="5 4"
                    fill={palette.reactiveFill}
                    fillOpacity={palette.reactiveOpacity}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="sennagridOverflow"
                    stroke={palette.optStroke}
                    strokeWidth={2.4}
                    fill={palette.optFill}
                    fillOpacity={palette.optOpacity}
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <AreaChart
                  data={dailySeries}
                  margin={{ top: 6, right: 12, left: -4, bottom: 2 }}
                  onClick={handleChartClick}
                >
                  <CartesianGrid horizontal vertical={false} stroke={palette.grid} />
                  <XAxis
                    dataKey="day"
                    axisLine={{ stroke: palette.axis }}
                    tickLine={false}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    ticks={[0, 30, 60, 91]}
                    tickFormatter={(v: number) => `Day ${v}`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    width={50}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
                    }
                  />
                  <Tooltip content={<CustomLineTooltip mode="infections" />} />
                  <ReferenceLine x={currentDay} stroke={palette.ref} strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="reactiveActive"
                    stroke={palette.reactiveStroke}
                    strokeWidth={2.2}
                    strokeDasharray="5 4"
                    fill={palette.reactiveFill}
                    fillOpacity={palette.reactiveOpacity}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="sennagridActive"
                    stroke={palette.optStroke}
                    strokeWidth={2.4}
                    fill={palette.optFill}
                    fillOpacity={palette.optOpacity}
                    isAnimationActive={false}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </article>

        {/* Right: Clean 5-Bar Strategy Fit */}
        <article className="min-w-0 min-[960px]:col-span-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--sg-text-primary)]">
            Strategy Fit (vs Reactive Baseline)
          </h2>
          <div className="space-y-4">
            {strategyBars.map((item) => {
              const displayScore =
                item.score >= 10 || item.score === 0
                  ? Math.round(item.score)
                  : item.score.toFixed(1);
              const isTradeoffZero =
                item.key === 'casesControl' && output.impactSummary.casesAverted < 0;

              return (
                <div key={item.key} title={item.description}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[14px]">
                    <span className="font-medium text-[var(--sg-text-secondary)]">{item.axis}</span>
                    <span className="font-mono font-semibold tabular-nums text-[var(--sg-text-primary)]">
                      {isTradeoffZero ? (
                        <span className="text-[13px] font-medium text-[var(--sg-amber)]">
                          0 (+{Math.abs(output.impactSummary.casesAvertedPct).toFixed(2)}% trade-off)
                        </span>
                      ) : (
                        displayScore
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--sg-inset)]">
                    <div
                      className="h-full rounded-full bg-[var(--sg-teal)]"
                      style={{
                        width: `${item.score > 0 ? Math.min(100, Math.max(1.5, item.score)) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
