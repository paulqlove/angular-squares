export interface GameData {
  selectedSquares: { [key: string]: string };
  homeNumbers: (number | null)[];
  awayNumbers: (number | null)[];
  scores: {
    q1: { home: number; away: number };
    q2: { home: number; away: number };
    q3: { home: number; away: number };
    q4: { home: number; away: number };
  };
  pricePerSquare: number;
  isRandomized: boolean;
  isLocked: boolean;
  homeTeam: string;
  awayTeam: string;
  winners?: { [key: string]: string };
  playerColors?: { [key: string]: string };
  venmoUsername?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  // ... rest of the service implementation
} 