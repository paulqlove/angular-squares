import type { EspnGame } from '../services/espn.service';

export function gameStatusClass(status: string): string {
  switch (status) {
    case 'in': return 'bg-qs-live-fill text-qs-tile';
    case 'post': return 'bg-qs-ok-soft text-qs-ok';
    default: return 'bg-qs-panel-2 text-qs-muted';
  }
}

export function gameStatusText(game: EspnGame): string {
  if (game.status === 'pre') return 'Upcoming';
  if (game.status === 'in') return `LIVE - Q${game.period} ${game.clock}`;
  return 'Final';
}

export function formatGameDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/** Kickoff time for the game picker: "7:30 PM". */
export function formatGameTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Kickoff day for the game picker: "Today", "Tomorrow", or "Thu, Nov 12". */
export function formatGameDay(isoDate: string, now: Date = new Date()): string {
  const day = new Date(isoDate);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(day) - start(now)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
