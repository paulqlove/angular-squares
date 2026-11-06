export interface ScheduledGame {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamFull: string;
  awayTeamFull: string;
  network: string;
}

export interface ScheduleData {
  teams: Record<string, ScheduledGame[]>;
  thanksgiving: ScheduledGame[];
}

export function formatKickoff(date: string): string {
  return `${new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  })} ET`;
}
