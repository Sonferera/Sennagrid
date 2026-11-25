import type { OptimizationOutput } from '@sennagrid/engine';
import {
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Flame,
  Pause,
  Play,
  Thermometer,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { findReactivePeakIcuDay, getTimelineMeta } from '../../lib/viewModels';
import type { PlaybackSpeed } from '../../store/useSimulationStore';

interface TimelinePlayerProps {
  output: OptimizationOutput;
  currentDay: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  onSetCurrentDay: (day: number) => void;
  onStepDay: (delta: number) => void;
  onJumpToPeak: () => void;
  onTogglePlaying: () => void;
  onSetPlaying: (playing: boolean) => void;
  onSetPlaybackSpeed: (speed: PlaybackSpeed) => void;
}

const SPEEDS: readonly PlaybackSpeed[] = [1, 2, 4];

export function TimelinePlayer({
  output,
  currentDay,
  isPlaying,
  playbackSpeed,
  onSetCurrentDay,
  onStepDay,
  onJumpToPeak,
  onTogglePlaying,
  onSetPlaying,
  onSetPlaybackSpeed,
}: TimelinePlayerProps) {
  const meta = getTimelineMeta(output, currentDay);
  const peakDay = findReactivePeakIcuDay(output);
  const dayRef = useRef(meta.day);
  dayRef.current = meta.day;

  useEffect(() => {
    if (!isPlaying) return;

    const daysPerSecond = 6 * playbackSpeed;
    const msPerDay = 1000 / daysPerSecond;
    let lastTick = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - lastTick;
      if (elapsed >= msPerDay) {
        const steps = Math.max(1, Math.floor(elapsed / msPerDay));
        lastTick = now - (elapsed % msPerDay);
        const nextDay = Math.min(meta.maxDay, dayRef.current + steps);
        onSetCurrentDay(nextDay);
        if (nextDay >= meta.maxDay) {
          onSetPlaying(false);
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackSpeed, meta.maxDay, onSetCurrentDay, onSetPlaying]);

  return (
    <section
      aria-label="Simulation timeline playback"
      data-tour="timeline-player"
      className="rounded-lg border border-slate-800 bg-[#0f172a] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlaying}
            aria-label={isPlaying ? 'Pause simulation playback' : 'Play simulation playback'}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md bg-cyan-400 px-3.5 py-2 text-xs font-semibold text-[#04111a] transition-colors hover:bg-cyan-300"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            )}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => onStepDay(-1)}
            disabled={meta.day <= 0}
            aria-label="Previous day"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-500 bg-[#162033] text-slate-200 transition-colors hover:border-slate-400 hover:text-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onStepDay(1)}
            disabled={meta.day >= meta.maxDay}
            aria-label="Next day"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-500 bg-[#162033] text-slate-200 transition-colors hover:border-slate-400 hover:text-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onJumpToPeak}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-rose-400/60 bg-[#3b111c] px-3 py-2 text-xs font-medium text-[#fda4af] transition-colors hover:brightness-110"
          >
            <Flame className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Jump to Peak (Day {peakDay})</span>
          </button>

          {/* Playback Speed Toggle */}
          <div
            role="group"
            aria-label="Playback speed"
            className="inline-flex items-center gap-1 rounded-md border border-slate-500 bg-[#162033] p-1"
          >
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                aria-pressed={playbackSpeed === speed}
                onClick={() => onSetPlaybackSpeed(speed)}
                className={`min-h-[44px] min-w-[44px] rounded px-2 font-mono text-xs font-medium tabular-nums transition-colors min-[720px]:min-h-[36px] min-[720px]:min-w-[40px] ${
                  playbackSpeed === speed
                    ? 'bg-cyan-400/20 text-cyan-300 ring-1 ring-inset ring-cyan-400/60'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Day Counter & Climate Readout */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums">
          <span className="rounded border border-slate-700 bg-[#162033] px-2.5 py-1.5 font-semibold text-slate-100">
            Day {meta.day} / {meta.maxDay}{' '}
            <span className="font-normal text-cyan-300">({meta.weekLabel})</span>
          </span>

          {output.params.diseaseMode === 'vector_seir_sei' && meta.climatePoint && (
            <div className="flex items-center gap-3 text-slate-300">
              <span className="inline-flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                {meta.climatePoint.temperatureC.toFixed(1)} C
              </span>
              <span className="inline-flex items-center gap-1">
                <CloudRain className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                7d Rain: {meta.climatePoint.rollingRain7dMm.toFixed(1)} mm
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="mt-2">
        <label htmlFor="sg-timeline-scrubber" className="sr-only">
          Simulation day scrubber from Day 0 to Day {meta.maxDay}
        </label>
        <input
          id="sg-timeline-scrubber"
          type="range"
          min={0}
          max={meta.maxDay}
          step={1}
          value={meta.day}
          onChange={(e) => onSetCurrentDay(Number(e.target.value))}
          className="sg-range"
          aria-valuetext={`Day ${meta.day} of ${meta.maxDay}, ${meta.weekLabel}`}
        />
        <div className="flex justify-between font-mono text-[11px] tabular-nums text-slate-400">
          <span>Day 0 (Week 1)</span>
          <span>Day {Math.round(meta.maxDay / 2)}</span>
          <span>Day {meta.maxDay} (End of Week {meta.totalWeeks})</span>
        </div>
      </div>
    </section>
  );
}
