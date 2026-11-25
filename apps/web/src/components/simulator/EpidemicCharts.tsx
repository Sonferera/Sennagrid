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

interface EpidemicChartsProps {
  output: OptimizationOutput | null;
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs tabular-nums shadow-md">
      <div className="mb-1 font-sans font-semibold text-[#0f172a]">
        Day {point.day} (W{point.week})
      </div>
      {mode === 'overflow' ? (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-4 text-[#be123c]">
            <span>Without SennaGrid</span>
            <span className="font-semibold">{formatFixed(point.reactiveOverflow, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#0f766e]">
            <span>With SennaGrid</span>
            <span className="font-semibold">{formatFixed(point.sennagridOverflow, 1)} beds</span>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-4 text-[#be123c]">
            <span>Without SennaGrid</span>
            <span className="font-semibold">{formatInt(point.reactiveActive)} cases</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#0f766e]">
            <span>With SennaGrid</span>
            <span className="font-semibold">{formatInt(point.sennagridActive)} cases</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function EpidemicCharts({ output, currentDay, onSelectDay }: EpidemicChartsProps) {
  const [chartTab, setChartTab] = useState<'overflow' | 'infections'>('overflow');

  const dailySeries = useMemo(() => (output ? buildDailyChartSeries(output) : []), [output]);
  const strategyBars = useMemo(() => (output ? buildRadarSeries(output) : []), [output]);

  if (!output || dailySeries.length === 0) {
    return (
      <section
        aria-label="Epidemic trajectory and fit"
        className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-600"
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
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="grid grid-cols-1 gap-8 min-[960px]:grid-cols-12 min-[960px]:items-start">
        {/* Left: Clean OWID Trajectory Chart */}
        <article className="min-[960px]:col-span-7">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#0f172a]">
                {chartTab === 'overflow' ? 'ICU Overflow Trajectory' : 'Active Infections Trajectory'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                {chartTab === 'overflow'
                  ? 'Day 0 to Day 91 excess ICU beds above local ward capacity'
                  : 'Day 0 to Day 91 city-wide active cases (click chart to jump day)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 text-[#be123c]">
                  <span
                    className="h-0.5 w-3 border-t-2 border-dashed border-[#e11d48]"
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
                <span className="inline-flex items-center gap-1.5 text-[#0f766e]">
                  <span className="h-0.5 w-3 bg-[#0f766e]" aria-hidden="true" />
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
                className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-medium"
              >
                <button
                  type="button"
                  aria-pressed={chartTab === 'overflow'}
                  onClick={() => setChartTab('overflow')}
                  className={`min-h-[44px] rounded px-2 py-0.5 transition-all min-[720px]:min-h-[24px] ${
                    chartTab === 'overflow'
                      ? 'bg-white font-semibold text-[#0f172a] shadow-2xs'
                      : 'text-slate-600 hover:text-[#0f172a]'
                  }`}
                >
                  Overflow
                </button>
                <button
                  type="button"
                  aria-pressed={chartTab === 'infections'}
                  onClick={() => setChartTab('infections')}
                  className={`min-h-[44px] rounded px-2 py-0.5 transition-all min-[720px]:min-h-[24px] ${
                    chartTab === 'infections'
                      ? 'bg-white font-semibold text-[#0f172a] shadow-2xs'
                      : 'text-slate-600 hover:text-[#0f172a]'
                  }`}
                >
                  Cases
                </button>
              </div>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === 'overflow' ? (
                <AreaChart
                  data={dailySeries}
                  margin={{ top: 6, right: 12, left: -12, bottom: 2 }}
                  onClick={handleChartClick}
                >
                  <CartesianGrid horizontal vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="day"
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    ticks={[0, 30, 60, 91]}
                    tickFormatter={(v: number) => `Day ${v}`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    width={42}
                  />
                  <Tooltip content={<CustomLineTooltip mode="overflow" />} />
                  <ReferenceLine x={currentDay} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="reactiveOverflow"
                    stroke="#e11d48"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fill="#ffe4e6"
                    fillOpacity={0.25}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="sennagridOverflow"
                    stroke="#0f766e"
                    strokeWidth={2.25}
                    fill="#ccfbf1"
                    fillOpacity={0.3}
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <AreaChart
                  data={dailySeries}
                  margin={{ top: 6, right: 12, left: -6, bottom: 2 }}
                  onClick={handleChartClick}
                >
                  <CartesianGrid horizontal vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="day"
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    ticks={[0, 30, 60, 91]}
                    tickFormatter={(v: number) => `Day ${v}`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    width={48}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
                    }
                  />
                  <Tooltip content={<CustomLineTooltip mode="infections" />} />
                  <ReferenceLine x={currentDay} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="reactiveActive"
                    stroke="#e11d48"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fill="#ffe4e6"
                    fillOpacity={0.22}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="sennagridActive"
                    stroke="#0f766e"
                    strokeWidth={2.25}
                    fill="#ccfbf1"
                    fillOpacity={0.28}
                    isAnimationActive={false}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </article>

        {/* Right: Clean 5-Bar Strategy Fit */}
        <article className="min-[960px]:col-span-5">
          <h2 className="mb-4 text-sm font-semibold text-[#0f172a]">
            Strategy Fit (vs Reactive Baseline)
          </h2>
          <div className="space-y-3.5">
            {strategyBars.map((item) => {
              const displayScore =
                item.score >= 10 || item.score === 0
                  ? Math.round(item.score)
                  : item.score.toFixed(1);
              const isTradeoffZero =
                item.key === 'casesControl' && output.impactSummary.casesAverted < 0;

              return (
                <div key={item.key} title={item.description}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-700">{item.axis}</span>
                    <span className="font-mono font-semibold tabular-nums text-[#0f172a]">
                      {isTradeoffZero ? (
                        <span className="font-normal text-[#b45309]">
                          0 (+{Math.abs(output.impactSummary.casesAvertedPct).toFixed(2)}% trade-off)
                        </span>
                      ) : (
                        displayScore
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#0f766e]"
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
