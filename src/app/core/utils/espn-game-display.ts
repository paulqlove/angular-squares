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
