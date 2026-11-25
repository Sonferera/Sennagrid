import type { OptimizationOutput } from '@sennagrid/engine';
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
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
  mode: 'infections' | 'icu';
}

function CustomLineTooltip({ active, payload, mode }: CustomLineTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-md border border-slate-500 bg-[#090d16]/95 p-2.5 font-mono text-xs tabular-nums shadow-lg">
      <div className="mb-1.5 font-semibold text-slate-100">
        Day {point.day} (Week {point.week})
      </div>
      {mode === 'infections' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-rose-300">
            <span>Reactive Baseline</span>
            <span>{formatInt(point.reactiveActive)} cases</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-cyan-300">
            <span>SennaGrid Optimized</span>
            <span>{formatInt(point.sennagridActive)} cases</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-rose-300">
            <span>Reactive ICU Demand</span>
            <span>{formatFixed(point.reactiveIcu, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-cyan-300">
            <span>SennaGrid ICU Demand</span>
            <span>{formatFixed(point.sennagridIcu, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1 text-slate-300">
            <span>City ICU Capacity</span>
            <span>{point.totalIcuCapacity} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-300">
            <span>Local District Overflow (Reactive)</span>
            <span>{formatFixed(point.reactiveOverflow, 1)} beds</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-cyan-300">
            <span>Local District Overflow (SennaGrid)</span>
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
    <div className="max-w-xs rounded-md border border-slate-500 bg-[#090d16]/95 p-2.5 text-xs shadow-lg">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-slate-100">{item.axis}</span>
        <span className="font-mono font-semibold tabular-nums text-cyan-300">
          {item.score.toFixed(1)} / 100
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-slate-300">{item.description}</p>
    </div>
  );
}

export function EpidemicCharts({ output, currentDay, onSelectDay }: EpidemicChartsProps) {
  const dailySeries = useMemo(() => (output ? buildDailyChartSeries(output) : []), [output]);
  const radarSeries = useMemo(() => (output ? buildRadarSeries(output) : []), [output]);

  if (!output || dailySeries.length === 0) {
    return (
      <section
        aria-label="Epidemic trajectory charts"
        className="rounded-lg border border-slate-800 bg-[#0f172a] p-6 text-center text-sm text-slate-400"
      >
        No chart data available yet. Run an optimization to inspect epidemic trajectories and radar
        metrics.
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

  const maxIcuVal = Math.max(
    output.totalIcuCapacity * 1.1,
    output.reactive.peakIcuDemand * 1.1,
    output.sennagrid.peakIcuDemand * 1.1,
    10,
  );

  return (
    <section
      aria-label="Epidemic trajectory and impact charts"
      className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-12"
    >
      {/* Chart A: Active Infections Over Time */}
      <article className="rounded-lg border border-slate-800 bg-[#0f172a] p-4 min-[1180px]:col-span-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Active Infections Over Time</h2>
            <p className="text-xs text-slate-400">Click anywhere on chart to move playhead</p>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-rose-300">
              <span className="h-0.5 w-3 border-t-2 border-dashed border-rose-400" aria-hidden="true" />
              Reactive
            </span>
            <span className="inline-flex items-center gap-1.5 text-cyan-300">
              <span className="h-0.5 w-3 bg-cyan-400" aria-hidden="true" />
              SennaGrid
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailySeries}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              onClick={handleChartClick}
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v: number) => `D${v}`}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={52}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
                }
              />
              <Tooltip content={<CustomLineTooltip mode="infections" />} />
              <ReferenceLine x={currentDay} stroke="#cbd5e1" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="reactiveActive"
                name="Reactive Baseline"
                stroke="#fb7185"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="sennagridActive"
                name="SennaGrid Optimized"
                stroke="#22d3ee"
                strokeWidth={2.25}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Chart B: City-Wide ICU Demand vs Capacity */}
      <article className="rounded-lg border border-slate-800 bg-[#0f172a] p-4 min-[1180px]:col-span-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              City-Wide ICU Demand vs Capacity
            </h2>
            <p className="text-xs text-slate-400">
              Total capacity {output.totalIcuCapacity} beds (local breaches can precede city total)
            </p>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-rose-300">
            Cap: {output.totalIcuCapacity} beds
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailySeries}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              onClick={handleChartClick}
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v: number) => `D${v}`}
              />
              <YAxis
                stroke="#94a3b8"
                domain={[0, Math.ceil(maxIcuVal)]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={48}
              />
              <Tooltip content={<CustomLineTooltip mode="icu" />} />
              <ReferenceLine
                y={output.totalIcuCapacity}
                stroke="#f43f5e"
                strokeDasharray="6 3"
                strokeWidth={1.5}
              />
              <ReferenceLine x={currentDay} stroke="#cbd5e1" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="reactiveIcu"
                name="Reactive ICU Demand"
                stroke="#fb7185"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="sennagridIcu"
                name="SennaGrid ICU Demand"
                stroke="#22d3ee"
                strokeWidth={2.25}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Chart C: 5-Axis Engine-Owned Impact Radar */}
      <article className="rounded-lg border border-slate-800 bg-[#0f172a] p-4 min-[1180px]:col-span-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Impact Radar (0 to 100)</h2>
            <p className="text-xs text-slate-400">
              Engine-normalized SennaGrid performance relative to Reactive Baseline
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarSeries} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: '#cbd5e1', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={5}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip content={<CustomRadarTooltip />} />
              <Radar
                name="SennaGrid Impact"
                dataKey="score"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="#22d3ee"
                fillOpacity={0.26}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {output.impactRadar.casesControl === 0 && output.impactSummary.casesAverted < 0 && (
          <p className="mt-1 text-[11px] text-amber-300">
            Note: Cases Control is 0.0 because ICU-first optimization prioritized preventing hospital
            collapse over minor case differences.
          </p>
        )}
      </article>
    </section>
  );
}
