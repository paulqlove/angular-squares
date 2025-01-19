import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  Database, 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  update 
} from 'firebase/database';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface GameData {
  selectedSquares: { [key: string]: string };
  squares?: { [key: string]: string | null };
  homeNumbers: (number | null)[];
  awayNumbers: (number | null)[];
  scores: {
    q1: { home: number; away: number };
    q2: { home: number; away: number };
    q3: { home: number; away: number };
    q4: { home: number; away: number };
  };
  winners?: { [key: string]: string };
  playerColors: { [key: string]: string };
  pricePerSquare?: number;
  isRandomized?: boolean;
  isLocked?: boolean;
  homeTeam?: string;
  awayTeam?: string;
}

const firebaseConfig = {
  apiKey: environment.firebase.apiKey,
  authDomain: environment.firebase.authDomain,
  databaseURL: environment.firebase.databaseURL,
  projectId: environment.firebase.projectId,
  storageBucket: environment.firebase.storageBucket,
  messagingSenderId: environment.firebase.messagingSenderId,
  appId: environment.firebase.appId
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private db!: Database;
  private app!: FirebaseApp;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.db = getDatabase(this.app);
    this.initializeGameDocument();
  }

  private async initializeGameDocument() {
    const defaultData: GameData = {
      selectedSquares: {},
      homeNumbers: Array(10).fill(null),
      awayNumbers: Array(10).fill(null),
      scores: {
        q1: { home: 0, away: 0 },
        q2: { home: 0, away: 0 },
        q3: { home: 0, away: 0 },
        q4: { home: 0, away: 0 }
      },
      playerColors: {},
      winners: {},
      isLocked: false
    };

    try {
      const gameRef = ref(this.db, 'games/current');
      await set(gameRef, defaultData);
    } catch (error) {
      console.error('Error initializing game document:', error);
    }
  }

  getGameData(): Observable<GameData> {
    return new Observable(subscriber => {
      const gameRef = ref(this.db, 'games/default-game');
      
      const unsubscribe = onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const data: GameData = {
            selectedSquares: {},
            homeNumbers: rawData.homeNumbers || Array(10).fill(null),
            awayNumbers: rawData.awayNumbers || Array(10).fill(null),
            scores: rawData.scores || {
              q1: { home: 0, away: 0 },
              q2: { home: 0, away: 0 },
              q3: { home: 0, away: 0 },
              q4: { home: 0, away: 0 }
            },
            playerColors: rawData.playerColors || {},
            winners: rawData.winners || {},
            pricePerSquare: rawData.pricePerSquare || 10,
            isRandomized: rawData.isRandomized || false,
            isLocked: rawData.isLocked || false,
            homeTeam: rawData.homeTeam || '',
            awayTeam: rawData.awayTeam || ''
          };

          if (rawData.squares) {
            Object.entries(rawData.squares).forEach(([key, value]) => {
              data.selectedSquares[key] = value as string;
            });
          }

          subscriber.next(data);
        } else {
          this.initializeGameDocument();
        }
      });

      return () => unsubscribe();
    });
  }

  async updateGameData(data: Partial<GameData>): Promise<void> {
    try {
      const gameRef = ref(this.db, 'games/default-game');
      
      const updateData: any = {};
      if (data.selectedSquares) {
        updateData.squares = data.selectedSquares;
      }
      if (data.pricePerSquare) {
        updateData.pricePerSquare = data.pricePerSquare;
      }
      if (data.playerColors) {
        updateData.playerColors = data.playerColors;
      }
      if (data.homeNumbers) {
        updateData.homeNumbers = data.homeNumbers;
      }
      if (data.awayNumbers) {
        updateData.awayNumbers = data.awayNumbers;
      }
      if (data.scores) {
        updateData.scores = data.scores;
      }
      if (data.winners) {
        updateData.winners = data.winners;
      }
      if (data.isRandomized !== undefined) {
        updateData.isRandomized = data.isRandomized;
      }
      if (data.isLocked !== undefined) {
        updateData.isLocked = data.isLocked;
      }
      if (data.homeTeam !== undefined) {
        updateData.homeTeam = data.homeTeam;
      }
      if (data.awayTeam !== undefined) {
        updateData.awayTeam = data.awayTeam;
      }

      await update(gameRef, updateData);
    } catch (error) {
      console.error('Error updating game data:', error);
    }
  }
} 