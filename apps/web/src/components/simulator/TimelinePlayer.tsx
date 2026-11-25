import type { OptimizationOutput } from '@sennagrid/engine';
import { Pause, Play } from 'lucide-react';
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
  onJumpToPeak,
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
    <div
      aria-label="Simulation timeline playback"
      data-tour="timeline-player"
      className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-white px-5 py-3 min-[720px]:flex-nowrap"
    >
      {/* Play / Pause Circular Button */}
      <button
        type="button"
        onClick={onTogglePlaying}
        aria-label={isPlaying ? 'Pause outbreak replay' : 'Play outbreak replay'}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-white transition-colors hover:bg-[#115e59] min-[720px]:h-8 min-[720px]:w-8"
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        ) : (
          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />
        )}
      </button>

      {/* Monospace Day Readout */}
      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-[#0f172a]">
        Day {meta.day} / {meta.maxDay}
      </span>

      {/* Minimalist Scrubber */}
      <div className="min-w-[140px] flex-1">
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
          className="sg-range -my-2.5"
          aria-valuetext={`Day ${meta.day} of ${meta.maxDay}, ${meta.weekLabel}`}
        />
      </div>

      {/* Peak Surge Jump + Speed Selector */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onJumpToPeak}
          title={`Jump to Reactive Peak Surge (Day ${crisisDay})`}
          className="min-h-[44px] rounded-md px-2 text-xs font-medium text-[#0f172a] transition-colors hover:bg-slate-100 min-[720px]:min-h-[28px]"
        >
          Jump: <span className="font-semibold text-[#be123c]">Peak (D{crisisDay})</span>
        </button>

        <span aria-hidden="true" className="h-3.5 w-px bg-slate-200" />

        <div role="group" aria-label="Playback speed" className="flex items-center gap-1">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              aria-pressed={playbackSpeed === speed}
              onClick={() => onSetPlaybackSpeed(speed)}
              className={`min-h-[44px] min-w-[44px] rounded px-1.5 font-mono text-xs tabular-nums transition-colors min-[720px]:min-h-[26px] min-[720px]:min-w-[28px] ${
                playbackSpeed === speed
                  ? 'font-bold text-[#0f172a] underline decoration-[#0f766e] decoration-2 underline-offset-4'
                  : 'text-slate-600 hover:text-[#0f172a]'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
