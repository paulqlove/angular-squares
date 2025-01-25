export const SQUARES_PROBABILITIES: { [key: string]: number } = {
  "0,0": 2.0, "0,1": 0.9, "0,2": 0.7, "0,3": 2.8, "0,4": 2.4, "0,5": 1.1, "0,6": 1.9, "0,7": 3.4, "0,8": 1.0, "0,9": 1.0,
  "1,0": 0.8, "1,1": 0.9, "1,2": 0.5, "1,3": 1.2, "1,4": 1.9, "1,5": 0.4, "1,6": 0.7, "1,7": 1.3, "1,8": 1.0, "1,9": 0.5,
  "2,0": 0.7, "2,1": 0.5, "2,2": 0.0, "2,3": 0.5, "2,4": 0.6, "2,5": 0.4, "2,6": 0.5, "2,7": 0.8, "2,8": 0.6, "2,9": 0.5,
  "3,0": 2.7, "3,1": 1.1, "3,2": 0.5, "3,3": 1.1, "3,4": 1.0, "3,5": 0.5, "3,6": 1.6, "3,7": 2.4, "3,8": 0.7, "3,9": 0.8,
  "4,0": 2.3, "4,1": 1.9, "4,2": 0.5, "4,3": 0.9, "4,4": 0.8, "4,5": 0.4, "4,6": 1.2, "4,7": 2.9, "4,8": 0.9, "4,9": 0.6,
  "5,0": 1.0, "5,1": 0.4, "5,2": 0.3, "5,3": 0.5, "5,4": 0.3, "5,5": 0.1, "5,6": 0.6, "5,7": 0.6, "5,8": 0.5, "5,9": 0.2,
  "6,0": 1.9, "6,1": 0.8, "6,2": 0.6, "6,3": 1.6, "6,4": 1.3, "6,5": 0.6, "6,6": 0.9, "6,7": 1.1, "6,8": 0.6, "6,9": 0.7,
  "7,0": 3.5, "7,1": 1.4, "7,2": 0.8, "7,3": 2.3, "7,4": 2.9, "7,5": 0.7, "7,6": 1.1, "7,7": 1.8, "7,8": 0.7, "7,9": 1.1,
  "8,0": 0.9, "8,1": 1.4, "8,2": 0.5, "8,3": 0.7, "8,4": 0.9, "8,5": 0.5, "8,6": 0.5, "8,7": 0.6, "8,8": 0.3, "8,9": 0.3,
  "9,0": 1.0, "9,1": 0.5, "9,2": 0.5, "9,3": 0.8, "9,4": 0.6, "9,5": 0.2, "9,6": 0.7, "9,7": 1.0, "9,8": 0.3, "9,9": 0.5
};

export function calculateWinProbability(
  squares: [number, number][], 
  homeNumbers: (number | null)[],
  awayNumbers: (number | null)[]
): number | null {
  // Return null if numbers aren't randomized
  if (homeNumbers.some(n => n === null) || awayNumbers.some(n => n === null)) {
    return null;
  }

  try {
    // Map coordinates to actual numbers after randomization
    const mappedCoords = squares.map(([row, col]) => {
      const awayNum = awayNumbers[row];
      const homeNum = homeNumbers[col];
      if (awayNum === null || homeNum === null) throw new Error('Invalid numbers');
      return [awayNum, homeNum];
    });

    // Sum probabilities
    const totalProbability = mappedCoords.reduce((sum, [away, home]) => {
      const key = `${away},${home}`;
      const prob = SQUARES_PROBABILITIES[key];
      if (typeof prob !== 'number') throw new Error(`Invalid probability for ${key}`);
      return sum + prob;
    }, 0);

    return Number(totalProbability.toFixed(1));
  } catch (error) {
    console.error('Error calculating probability:', error);
    return null;
  }
} 