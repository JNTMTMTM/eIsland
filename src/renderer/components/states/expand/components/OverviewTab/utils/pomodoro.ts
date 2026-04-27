import type { PomodoroPhase } from './types';

export function advancePomodoroPhase(
  phase: PomodoroPhase,
  count: number,
): { nextPhase: PomodoroPhase; nextCount: number } {
  if (phase === 'work') {
    const nextCount = count + 1;
    const nextPhase: PomodoroPhase = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    return { nextPhase, nextCount };
  }
  return { nextPhase: 'work', nextCount: count };
}

export function getPomodoroTimeline(
  phase: PomodoroPhase,
  count: number,
): { prev: PomodoroPhase | null; next: PomodoroPhase } {
  if (phase === 'work') {
    const prev: PomodoroPhase | null = count === 0 ? null : count % 4 === 0 ? 'longBreak' : 'shortBreak';
    const nextCount = count + 1;
    const next: PomodoroPhase = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    return { prev, next };
  }
  return { prev: 'work', next: 'work' };
}

export function fmtPomodoroTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
