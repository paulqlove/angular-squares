export interface NflTeam {
  name: string;
  city: string;
  slug: string;
  abbreviation: string;
  espnId: string;
  conference: 'AFC' | 'NFC';
  division: 'North' | 'South' | 'East' | 'West';
  primaryColor: string;
  secondaryColor: string;
}

export function getTeamLogo(team: NflTeam, size: 500 | 100 = 500): string {
  // ESPN team logos by lowercase abbreviation
  return `https://a.espncdn.com/i/teamlogos/nfl/${size}/${team.abbreviation.toLowerCase()}.png`;
}

export const NFL_TEAMS: NflTeam[] = [
  // AFC East
  { name: 'Bills', city: 'Buffalo', slug: 'buffalo-bills', abbreviation: 'BUF', espnId: '2', conference: 'AFC', division: 'East', primaryColor: '#00338D', secondaryColor: '#C60C30' },
  { name: 'Dolphins', city: 'Miami', slug: 'miami-dolphins', abbreviation: 'MIA', espnId: '15', conference: 'AFC', division: 'East', primaryColor: '#008E97', secondaryColor: '#FC4C02' },
  { name: 'Patriots', city: 'New England', slug: 'new-england-patriots', abbreviation: 'NE', espnId: '17', conference: 'AFC', division: 'East', primaryColor: '#002244', secondaryColor: '#C60C30' },
  { name: 'Jets', city: 'New York', slug: 'new-york-jets', abbreviation: 'NYJ', espnId: '20', conference: 'AFC', division: 'East', primaryColor: '#125740', secondaryColor: '#FFFFFF' },

  // AFC North
  { name: 'Ravens', city: 'Baltimore', slug: 'baltimore-ravens', abbreviation: 'BAL', espnId: '33', conference: 'AFC', division: 'North', primaryColor: '#241773', secondaryColor: '#9E7C0C' },
  { name: 'Bengals', city: 'Cincinnati', slug: 'cincinnati-bengals', abbreviation: 'CIN', espnId: '4', conference: 'AFC', division: 'North', primaryColor: '#FB4F14', secondaryColor: '#000000' },
  { name: 'Browns', city: 'Cleveland', slug: 'cleveland-browns', abbreviation: 'CLE', espnId: '5', conference: 'AFC', division: 'North', primaryColor: '#311D00', secondaryColor: '#FF3C00' },
  { name: 'Steelers', city: 'Pittsburgh', slug: 'pittsburgh-steelers', abbreviation: 'PIT', espnId: '23', conference: 'AFC', division: 'North', primaryColor: '#FFB612', secondaryColor: '#101820' },

  // AFC South
  { name: 'Texans', city: 'Houston', slug: 'houston-texans', abbreviation: 'HOU', espnId: '34', conference: 'AFC', division: 'South', primaryColor: '#03202F', secondaryColor: '#A71930' },
  { name: 'Colts', city: 'Indianapolis', slug: 'indianapolis-colts', abbreviation: 'IND', espnId: '11', conference: 'AFC', division: 'South', primaryColor: '#002C5F', secondaryColor: '#A2AAAD' },
  { name: 'Jaguars', city: 'Jacksonville', slug: 'jacksonville-jaguars', abbreviation: 'JAX', espnId: '30', conference: 'AFC', division: 'South', primaryColor: '#006778', secondaryColor: '#9F792C' },
  { name: 'Titans', city: 'Tennessee', slug: 'tennessee-titans', abbreviation: 'TEN', espnId: '10', conference: 'AFC', division: 'South', primaryColor: '#0C2340', secondaryColor: '#4B92DB' },

  // AFC West
  { name: 'Broncos', city: 'Denver', slug: 'denver-broncos', abbreviation: 'DEN', espnId: '7', conference: 'AFC', division: 'West', primaryColor: '#FB4F14', secondaryColor: '#002244' },
  { name: 'Chiefs', city: 'Kansas City', slug: 'kansas-city-chiefs', abbreviation: 'KC', espnId: '12', conference: 'AFC', division: 'West', primaryColor: '#E31837', secondaryColor: '#FFB81C' },
  { name: 'Raiders', city: 'Las Vegas', slug: 'las-vegas-raiders', abbreviation: 'LV', espnId: '13', conference: 'AFC', division: 'West', primaryColor: '#000000', secondaryColor: '#A5ACAF' },
  { name: 'Chargers', city: 'Los Angeles', slug: 'los-angeles-chargers', abbreviation: 'LAC', espnId: '24', conference: 'AFC', division: 'West', primaryColor: '#0080C6', secondaryColor: '#FFC20E' },

  // NFC East
  { name: 'Cowboys', city: 'Dallas', slug: 'dallas-cowboys', abbreviation: 'DAL', espnId: '6', conference: 'NFC', division: 'East', primaryColor: '#003594', secondaryColor: '#869397' },
  { name: 'Giants', city: 'New York', slug: 'new-york-giants', abbreviation: 'NYG', espnId: '19', conference: 'NFC', division: 'East', primaryColor: '#0B2265', secondaryColor: '#A71930' },
  { name: 'Eagles', city: 'Philadelphia', slug: 'philadelphia-eagles', abbreviation: 'PHI', espnId: '21', conference: 'NFC', division: 'East', primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
  { name: 'Commanders', city: 'Washington', slug: 'washington-commanders', abbreviation: 'WAS', espnId: '28', conference: 'NFC', division: 'East', primaryColor: '#5A1414', secondaryColor: '#FFB612' },

  // NFC North
  { name: 'Bears', city: 'Chicago', slug: 'chicago-bears', abbreviation: 'CHI', espnId: '3', conference: 'NFC', division: 'North', primaryColor: '#0B162A', secondaryColor: '#C83803' },
  { name: 'Lions', city: 'Detroit', slug: 'detroit-lions', abbreviation: 'DET', espnId: '8', conference: 'NFC', division: 'North', primaryColor: '#0076B6', secondaryColor: '#B0B7BC' },
  { name: 'Packers', city: 'Green Bay', slug: 'green-bay-packers', abbreviation: 'GB', espnId: '9', conference: 'NFC', division: 'North', primaryColor: '#203731', secondaryColor: '#FFB612' },
  { name: 'Vikings', city: 'Minnesota', slug: 'minnesota-vikings', abbreviation: 'MIN', espnId: '16', conference: 'NFC', division: 'North', primaryColor: '#4F2683', secondaryColor: '#FFC62F' },

  // NFC South
  { name: 'Falcons', city: 'Atlanta', slug: 'atlanta-falcons', abbreviation: 'ATL', espnId: '1', conference: 'NFC', division: 'South', primaryColor: '#A71930', secondaryColor: '#000000' },
  { name: 'Panthers', city: 'Carolina', slug: 'carolina-panthers', abbreviation: 'CAR', espnId: '29', conference: 'NFC', division: 'South', primaryColor: '#0085CA', secondaryColor: '#101820' },
  { name: 'Saints', city: 'New Orleans', slug: 'new-orleans-saints', abbreviation: 'NO', espnId: '18', conference: 'NFC', division: 'South', primaryColor: '#D3BC8D', secondaryColor: '#101820' },
  { name: 'Buccaneers', city: 'Tampa Bay', slug: 'tampa-bay-buccaneers', abbreviation: 'TB', espnId: '27', conference: 'NFC', division: 'South', primaryColor: '#D50A0A', secondaryColor: '#FF7900' },

  // NFC West
  { name: 'Cardinals', city: 'Arizona', slug: 'arizona-cardinals', abbreviation: 'ARI', espnId: '22', conference: 'NFC', division: 'West', primaryColor: '#97233F', secondaryColor: '#000000' },
  { name: 'Rams', city: 'Los Angeles', slug: 'los-angeles-rams', abbreviation: 'LAR', espnId: '14', conference: 'NFC', division: 'West', primaryColor: '#003594', secondaryColor: '#FFA300' },
  { name: 'Seahawks', city: 'Seattle', slug: 'seattle-seahawks', abbreviation: 'SEA', espnId: '26', conference: 'NFC', division: 'West', primaryColor: '#002244', secondaryColor: '#69BE28' },
  { name: '49ers', city: 'San Francisco', slug: 'san-francisco-49ers', abbreviation: 'SF', espnId: '25', conference: 'NFC', division: 'West', primaryColor: '#AA0000', secondaryColor: '#B3995D' }
];

export function getTeamBySlug(slug: string): NflTeam | undefined {
  return NFL_TEAMS.find(t => t.slug === slug);
}

export function getTeamsByConference(conference: 'AFC' | 'NFC'): NflTeam[] {
  return NFL_TEAMS.filter(t => t.conference === conference);
}

export function getTeamsByDivision(conference: 'AFC' | 'NFC', division: 'North' | 'South' | 'East' | 'West'): NflTeam[] {
  return NFL_TEAMS.filter(t => t.conference === conference && t.division === division);
}
