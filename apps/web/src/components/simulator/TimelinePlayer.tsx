import type { OptimizationOutput } from '@sennagrid/engine';
import {
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Thermometer,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { findCrisisFocusDay, getTimelineMeta } from '../../lib/viewModels';
import type { PlaybackSpeed } from '../../store/useSimulationStore';

interface TimelinePlayerProps {
  output: OptimizationOutput;
  currentDay: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  onSetCurrentDay: (day: number) => void;
  onStepDay: (delta: number) => void;
  onJumpToPeak: () => void;
  onPlayFromStart: () => void;
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
  onPlayFromStart,
  onTogglePlaying,
  onSetPlaying,
  onSetPlaybackSpeed,
}: TimelinePlayerProps) {
  const meta = getTimelineMeta(output, currentDay);
  const crisisDay = findCrisisFocusDay(output);
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
      className="rounded-b-xl border border-t-0 border-slate-200 bg-white px-4 py-3 shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlaying}
            aria-label={isPlaying ? 'Pause simulation playback' : 'Play simulation playback'}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg bg-[#0f766e] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d9488] min-[720px]:min-h-[34px]"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            )}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={onPlayFromStart}
            title="Replay outbreak from Day 0"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-500 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 min-[720px]:min-h-[34px]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Replay D0</span>
          </button>

          <button
            type="button"
            onClick={() => onStepDay(-1)}
            disabled={meta.day <= 0}
            aria-label="Previous day"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-500 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 min-[720px]:min-h-[34px] min-[720px]:min-w-[34px]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onStepDay(1)}
            disabled={meta.day >= meta.maxDay}
            aria-label="Next day"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-500 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 min-[720px]:min-h-[34px] min-[720px]:min-w-[34px]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onJumpToPeak}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-[#9f1239] transition-colors hover:bg-rose-100 min-[720px]:min-h-[34px]"
          >
            <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Peak Surge (Day {crisisDay})</span>
          </button>

          <div
            role="group"
            aria-label="Playback speed"
            className="inline-flex items-center gap-0.5 rounded-lg border border-slate-500 bg-slate-100 p-0.5"
          >
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                aria-pressed={playbackSpeed === speed}
                onClick={() => onSetPlaybackSpeed(speed)}
                className={`min-h-[44px] min-w-[44px] rounded-md px-2 font-mono text-xs font-semibold tabular-nums transition-all min-[720px]:min-h-[28px] min-[720px]:min-w-[36px] ${
                  playbackSpeed === speed
                    ? 'bg-white text-[#0f766e] shadow-2xs ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-[#0f172a]'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Active Day & Climate Badges */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs tabular-nums">
          <span className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 font-semibold text-[#0f172a]">
            Day {meta.day}/{meta.maxDay}{' '}
            <span className="font-normal text-[#0f766e]">({meta.weekLabel})</span>
          </span>

          {output.params.diseaseMode === 'vector_seir_sei' && meta.climatePoint && (
            <div className="flex items-center gap-2.5 text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-[#b45309]" aria-hidden="true" />
                {meta.climatePoint.temperatureC.toFixed(1)}°C
              </span>
              <span className="inline-flex items-center gap-1">
                <CloudRain className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
                7d Rain {meta.climatePoint.rollingRain7dMm.toFixed(0)} mm
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrubber Slider */}
      <div className="mt-1">
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
          className="sg-range -my-1.5"
          aria-valuetext={`Day ${meta.day} of ${meta.maxDay}, ${meta.weekLabel}`}
        />
        <div className="flex justify-between font-mono text-[10px] tabular-nums text-slate-500">
          <span>Day 0 (Week 1)</span>
          <span>Peak Surge: Day {crisisDay}</span>
          <span>Day {meta.maxDay} (End Week {meta.totalWeeks})</span>
        </div>
      </div>
    </section>
  );
}
