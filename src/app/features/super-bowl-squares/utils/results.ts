import type { BoardScores } from './board-math';
import { NFL_TEAMS } from '../../content/teams-data';
import { buildInitials } from './initials.utils';

type Quarter = keyof BoardScores;
type Score = BoardScores[Quarter];

/** One line of the Winners list on the winners picture. */
export interface ResultRow {
  /** "Q1", "Q2", "Q3" or "FINAL". */
  label: string;
  /** The quarter's winner, or null when the winning square was empty. */
  name: string | null;
  /** Badge text, unique among the winners ("JE" for Jess). Empty when there is no winner. */
  initials: string;
  /** "Square 7-3": the away score's last digit, then the home score's. Null when the quarter has no score. */
  square: string | null;
  /** The score at the end of the quarter. */
  score: Score | null;
}

/** Everything the winners picture shows. */
export interface ResultsSummary {
  title: string;
  /** Month and day, upper-cased: "NOV 26". */
  date: string;
  awayTeam: string;
  homeTeam: string;
  away: number;
  home: number;
  rows: ResultRow[];
}

const QUARTERS: { key: Quarter; label: string }[] = [
  { key: 'q1', label: 'Q1' },
  { key: 'q2', label: 'Q2' },
  { key: 'q3', label: 'Q3' },
  { key: 'q4', label: 'FINAL' }
];

/** "NOV 26" from an ISO date or a timestamp. Empty when there is no valid date. */
export function resultsDate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

/**
 * The team's short name for the picture. Linked boards already store ESPN's code ("KC"), which passes through. A custom
 * board where the host typed an NFL team in full ("Kansas City Chiefs") gets its code from our team table. Anything else,
 * a nickname alone included ("Eagles" may be a school), keeps the name as typed, and the picture cuts it to fit.
 */
export function shortTeamName(team: string): string {
  const typed = team.trim();
  const key = typed.toLowerCase().replace(/\s+/g, ' ');
  const nfl = NFL_TEAMS.find(t => key === `${t.city} ${t.name}`.toLowerCase());
  return nfl?.abbreviation ?? typed;
}

/** The winners picture's content from the board's final scores (each quarter's running total) and its winners. */
export function buildResults(game: {
  name: string;
  awayTeam: string;
  homeTeam: string;
  date: string | number | null | undefined;
  scores: Partial<Record<Quarter, Score>>;
  winners: Record<string, string>;
}): ResultsSummary {
  const names = QUARTERS.map(q => game.winners[q.key]).filter((n): n is string => !!n);
  const initials = buildInitials(names);
  const final = game.scores.q4 ?? { home: 0, away: 0 };
  return {
    title: game.name.trim() || 'Football Squares',
    date: resultsDate(game.date),
    awayTeam: shortTeamName(game.awayTeam) || 'Away team',
    homeTeam: shortTeamName(game.homeTeam) || 'Home team',
    away: final.away,
    home: final.home,
    rows: QUARTERS.map(({ key, label }) => {
      const name = game.winners[key]?.trim() || null;
      const score = game.scores[key] ?? null;
      return {
        label,
        name,
        initials: name ? initials.get(name) ?? '' : '',
        square: score ? `Square ${score.away % 10}-${score.home % 10}` : null,
        score
      };
    })
  };
}
