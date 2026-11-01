export interface LegacyMoneySnapshot {
  gameId: string;
  pricePerSquare: number;
  venmoUsername: string;
  paidPlayers: string[];
  playerStats: { [name: string]: { squares: number; total: number } };
  playerColors: { [name: string]: string };
  winners: { [quarter: string]: string };
  scores: { [quarter: string]: { home: number; away: number } };
  totalPot: number;
  quarterPayouts: { [quarter: string]: number };
  isLocked: boolean;
  canEdit: boolean;
  homeTeam: string;
  awayTeam: string;
}
