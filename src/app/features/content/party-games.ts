/** Content and card logic for /super-bowl-party-games. Every game is played for points and bragging rights. */

export interface PropQuestion {
  question: string;
  options: string[];
}

export interface PartyFaq {
  question: string;
  answer: string;
}

/** Fun, all-ages picks anyone can make before kickoff. One point for each right answer. */
export const PROP_QUESTIONS: PropQuestion[] = [
  { question: 'Coin toss: heads or tails?', options: ['Heads', 'Tails'] },
  { question: 'Who wins the coin toss?', options: ['Away team', 'Home team'] },
  { question: 'Does the national anthem run longer than 2 minutes?', options: ['Yes', 'No'] },
  { question: 'First score of the game', options: ['Touchdown', 'Field goal', 'Safety'] },
  { question: 'Which team scores first?', options: ['Away team', 'Home team'] },
  { question: 'Is there a score in the first 5 minutes of the game clock?', options: ['Yes', 'No'] },
  { question: 'First commercial after kickoff is for', options: ['Food or drink', 'A car', 'A movie or show', 'Something else'] },
  { question: 'How many commercials have a dog in them?', options: ['0 or 1', '2 or 3', '4 or more'] },
  { question: 'Does the halftime headliner change outfits?', options: ['Yes', 'No'] },
  { question: 'Is there a surprise guest at halftime?', options: ['Yes', 'No'] },
  { question: 'Fireworks during the halftime show?', options: ['Yes', 'No'] },
  { question: 'Does a kicker miss a field goal or extra point?', options: ['Yes', 'No'] },
  { question: 'Longest touchdown of the game', options: ['Under 40 yards', '40 yards or more'] },
  { question: 'Does the game go to overtime?', options: ['Yes', 'No'] },
  { question: 'Color of the drink poured on the winning coach', options: ['Orange', 'Yellow or green', 'Blue', 'Purple', 'Clear', 'No pour'] }
];

/** Things that show up in big-game commercials. A card uses 24 of them around a free center square. */
export const BINGO_ITEMS: string[] = [
  'A dog',
  'A cat',
  'A horse',
  'A talking animal',
  'A baby',
  'A grandparent',
  'A celebrity cameo',
  'Two celebrities together',
  'An athlete in a suit',
  'A movie trailer',
  'A robot',
  'A phone app',
  'A QR code',
  'A car on a mountain road',
  'A song from the 80s or 90s',
  'Slow motion',
  'Someone falls down',
  'A dance move',
  'A superhero',
  'Outer space',
  'A beach',
  'Snow',
  'Pizza',
  'Chips crunch up close',
  'A burger',
  'A delivery at the door',
  'A family dinner',
  'Black and white footage',
  'A countdown',
  'A sequel to an old ad',
  'A tearjerker',
  'A pun in the last line',
  'Someone talks to the camera',
  'A cowboy',
  'A game show',
  'A choir or big group singing'
];

export const BINGO_FREE = 'Free';

/** Cards printed at once. Different on every sheet, so nobody shares a card. */
export const PRINT_CARD_COUNT = 6;

export const PARTY_FAQS: PartyFaq[] = [
  {
    question: 'What are the best Super Bowl party games?',
    answer: 'Super Bowl squares is the classic, because it takes a minute to learn and stays live all game. Add a prop sheet before kickoff and commercial bingo for guests who are there for the ads.'
  },
  {
    question: 'What are some easy Super Bowl party ideas?',
    answer: 'Put a squares board on the TV, hand out a prop sheet as guests arrive and leave bingo cards by the snacks. A snack draft and an ad ballot give non-fans something to root for. Each one takes a few minutes to set up and costs nothing.'
  },
  {
    question: 'What can people who don’t watch football play?',
    answer: 'Commercial bingo and the halftime picks need no football at all. Squares works too: the score picks the winner, so nobody has to follow the plays.'
  },
  {
    question: 'How do you play a Super Bowl prop sheet?',
    answer: 'Everyone circles one answer per question before kickoff. Each right answer is worth a point. Most points at the end wins, and the total score guess breaks a tie.'
  },
  {
    question: 'How does Super Bowl commercial bingo work?',
    answer: 'Each guest gets a different card. Mark a square when an ad shows that thing. Five in a row across, down or corner to corner wins. The center square is free.'
  },
  {
    question: 'What Super Bowl games work for kids?',
    answer: 'Commercial bingo and the prop sheet are all ages, and younger kids can mark bingo squares with stickers. For squares, a 25-square board gives each kid several squares, so everyone has a chance every quarter.'
  },
  {
    question: 'Do these games cost anything?',
    answer: 'No. The prop sheet, bingo cards and the online squares board are free. QuarterScore never collects, holds, or pays out money, so play for points and bragging rights.'
  }
];

/** A bingo card for one seed: 25 cells, row by row, with the free square in the middle. Same seed, same card. */
export function bingoCard(seed: number): string[] {
  const items = shuffle(BINGO_ITEMS, seed).slice(0, 24);
  return [...items.slice(0, 12), BINGO_FREE, ...items.slice(12)];
}

/** A fresh seed for a new card. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Fisher-Yates with a small seeded generator (mulberry32), so the server and browser draw the same first card. */
function shuffle<T>(list: T[], seed: number): T[] {
  const next = mulberry32(seed);
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
