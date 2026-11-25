import type { OptimizationOutput } from '@sennagrid/engine';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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
  type RadarChartDatum,
} from '../../lib/viewModels';

interface EpidemicChartsProps {
  output: OptimizationOutput | null;
  currentDay: number;
  onSelectDay: (day: number) => void;
}

interface CustomLineTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DailyChartPoint }>;
  mode: 'infections' | 'icu_total' | 'icu_overflow';
}

function CustomLineTooltip({ active, payload, mode }: CustomLineTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-slate-300 bg-white/98 p-2.5 font-mono text-xs tabular-nums shadow-lg">
      <div className="mb-1.5 font-sans font-bold text-[#0f172a]">
        Day {point.day} (Week {point.week})
      </div>
      {mode === 'infections' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-[#be123c]">
            <span>Reactive Baseline</span>
            <span className="font-semibold">{formatInt(point.reactiveActive)} cases</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#0f766e]">
            <span>SennaGrid Optimized</span>
            <span className="font-semibold">{formatInt(point.sennagridActive)} cases</span>
          </div>
        </div>
      ) : mode === 'icu_overflow' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-[#be123c]">
            <span>Reactive Overflow</span>
            <span className="font-semibold">{formatFixed(point.reactiveOverflow, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#0f766e]">
            <span>SennaGrid Overflow</span>
            <span className="font-semibold">{formatFixed(point.sennagridOverflow, 1)} beds</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-[#be123c]">
            <span>Reactive ICU Demand</span>
            <span className="font-semibold">{formatFixed(point.reactiveIcu, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#0f766e]">
            <span>SennaGrid ICU Demand</span>
            <span className="font-semibold">{formatFixed(point.sennagridIcu, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-1 text-slate-600">
            <span>Aggregate City Beds</span>
            <span>{point.totalIcuCapacity} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#be123c]">
            <span>District Breach (Reactive)</span>
            <span>{formatFixed(point.reactiveOverflow, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[#0f766e]">
            <span>District Breach (SennaGrid)</span>
            <span>{formatFixed(point.sennagridOverflow, 1)} beds</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface CustomRadarTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: RadarChartDatum }>;
}

function CustomRadarTooltip({ active, payload }: CustomRadarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="max-w-xs rounded-lg border border-slate-300 bg-white/98 p-2.5 text-xs shadow-lg">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bold text-[#0f172a]">{item.axis}</span>
        <span className="font-mono font-semibold tabular-nums text-[#0f766e]">
          {item.score.toFixed(1)} / 100
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-slate-600">{item.description}</p>
    </div>
  );
}

export function EpidemicCharts({ output, currentDay, onSelectDay }: EpidemicChartsProps) {
  const [icuChartMode, setIcuChartMode] = useState<'overflow' | 'total'>('overflow');

  const dailySeries = useMemo(() => (output ? buildDailyChartSeries(output) : []), [output]);
  const radarSeries = useMemo(() => (output ? buildRadarSeries(output) : []), [output]);

  if (!output || dailySeries.length === 0) {
    return (
      <section
        aria-label="Epidemic trajectory charts"
        className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-2xs"
      >
        No simulation curves available yet.
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

  const hasAnyOverflow =
    output.reactive.peakIcuOverflow > 0.05 || output.sennagrid.peakIcuOverflow > 0.05;
  const effectiveIcuMode = hasAnyOverflow ? icuChartMode : 'total';

  const maxTotalIcuVal = Math.max(
    output.totalIcuCapacity * 1.08,
    output.reactive.peakIcuDemand * 1.1,
    output.sennagrid.peakIcuDemand * 1.1,
    10,
  );

  return (
    <section
      aria-label="Epidemic trajectory and strategy scorecard"
      className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-12"
    >
      {/* Chart 1: ICU Hospital Pressure (Overflow Beds vs Aggregate Demand) */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs min-[1180px]:col-span-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0f172a]">
              {effectiveIcuMode === 'overflow'
                ? 'Daily Hospital ICU Overflow (Breach Beds)'
                : 'City-Wide ICU Demand vs Total Beds'}
            </h2>
            <p className="text-xs text-slate-500">
              {effectiveIcuMode === 'overflow'
                ? 'Sum of excess ICU patients in wards exceeding local bed capacity'
                : `Aggregate demand across all wards (city total: ${output.totalIcuCapacity} beds)`}
            </p>
          </div>

          <div
            role="group"
            aria-label="ICU chart metric"
            className="inline-flex rounded-lg border border-slate-400 bg-slate-100 p-0.5 text-[11px] font-semibold"
          >
            <button
              type="button"
              aria-pressed={effectiveIcuMode === 'overflow'}
              onClick={() => setIcuChartMode('overflow')}
              className={`min-h-[36px] rounded-md px-2 py-0.5 transition-all min-[720px]:min-h-[26px] ${
                effectiveIcuMode === 'overflow'
                  ? 'bg-white text-[#0f766e] shadow-2xs ring-1 ring-slate-300'
                  : 'text-slate-600 hover:text-[#0f172a]'
              }`}
            >
              Overflow
            </button>
            <button
              type="button"
              aria-pressed={effectiveIcuMode === 'total'}
              onClick={() => setIcuChartMode('total')}
              className={`min-h-[36px] rounded-md px-2 py-0.5 transition-all min-[720px]:min-h-[26px] ${
                effectiveIcuMode === 'total'
                  ? 'bg-white text-[#0f766e] shadow-2xs ring-1 ring-slate-300'
                  : 'text-slate-600 hover:text-[#0f172a]'
              }`}
            >
              City Total
            </button>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {effectiveIcuMode === 'overflow' ? (
              <AreaChart
                data={dailySeries}
                margin={{ top: 8, right: 10, left: -8, bottom: 2 }}
                onClick={handleChartClick}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v: number) => `D${v}`}
                />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} width={44} />
                <Tooltip content={<CustomLineTooltip mode="icu_overflow" />} />
                <ReferenceLine x={currentDay} stroke="#0f172a" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="reactiveOverflow"
                  name="Reactive Overflow"
                  stroke="#e11d48"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  fill="#fecdd3"
                  fillOpacity={0.5}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="sennagridOverflow"
                  name="SennaGrid Overflow"
                  stroke="#0f766e"
                  strokeWidth={2.25}
                  fill="#99f6e4"
                  fillOpacity={0.45}
                  isAnimationActive={false}
                />
              </AreaChart>
            ) : (
              <AreaChart
                data={dailySeries}
                margin={{ top: 8, right: 10, left: -8, bottom: 2 }}
                onClick={handleChartClick}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v: number) => `D${v}`}
                />
                <YAxis
                  stroke="#64748b"
                  domain={[0, Math.ceil(maxTotalIcuVal)]}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  width={44}
                />
                <Tooltip content={<CustomLineTooltip mode="icu_total" />} />
                <ReferenceLine
                  y={output.totalIcuCapacity}
                  stroke="#be123c"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                />
                <ReferenceLine x={currentDay} stroke="#0f172a" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="reactiveIcu"
                  name="Reactive ICU Demand"
                  stroke="#e11d48"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  fill="#ffe4e6"
                  fillOpacity={0.4}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="sennagridIcu"
                  name="SennaGrid ICU Demand"
                  stroke="#0f766e"
                  strokeWidth={2.25}
                  fill="#ccfbf1"
                  fillOpacity={0.45}
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </article>

      {/* Chart 2: Active Infections Trajectory */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs min-[1180px]:col-span-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0f172a]">Active Infections Trajectory</h2>
            <p className="text-xs text-slate-500">Click chart to scrub day playhead</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[#be123c]">
              <span className="h-0.5 w-3.5 border-t-2 border-dashed border-[#e11d48]" aria-hidden="true" />
              Reactive
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#0f766e]">
              <span className="h-0.5 w-3.5 bg-[#0f766e]" aria-hidden="true" />
              SennaGrid
            </span>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailySeries}
              margin={{ top: 8, right: 10, left: -4, bottom: 2 }}
              onClick={handleChartClick}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v: number) => `D${v}`}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11 }}
                width={48}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
                }
              />
              <Tooltip content={<CustomLineTooltip mode="infections" />} />
              <ReferenceLine x={currentDay} stroke="#0f172a" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="reactiveActive"
                name="Reactive Baseline"
                stroke="#e11d48"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="#ffe4e6"
                fillOpacity={0.35}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="sennagridActive"
                name="SennaGrid Optimized"
                stroke="#0f766e"
                strokeWidth={2.25}
                fill="#ccfbf1"
                fillOpacity={0.4}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Chart 3: 5-Axis Strategy Scorecard (Radar + Explicit Numeric Bars) */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs min-[1180px]:col-span-4">
        <div className="mb-2">
          <h2 className="text-sm font-bold text-[#0f172a]">5-Axis Strategy Scorecard (0–100)</h2>
          <p className="text-xs text-slate-500">
            Engine-normalized SennaGrid gain relative to Reactive Baseline
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-12">
          <div className="h-52 w-full sm:col-span-7">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarSeries} cx="50%" cy="50%" outerRadius="68%">
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: '#475569', fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tickCount={3}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <Tooltip content={<CustomRadarTooltip />} />
                <Radar
                  name="SennaGrid Score"
                  dataKey="score"
                  stroke="#0f766e"
                  strokeWidth={2}
                  fill="#0d9488"
                  fillOpacity={0.25}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 sm:col-span-5">
            {radarSeries.map((item) => (
              <div key={item.key} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-slate-700">{item.axis}</span>
                  <span className="font-mono font-semibold tabular-nums text-[#0f766e]">
                    {item.score.toFixed(0)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0d9488]"
                    style={{ width: `${Math.max(item.score > 0 ? 5 : 0, item.score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
