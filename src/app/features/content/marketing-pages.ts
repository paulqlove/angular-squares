import { BreadcrumbItem } from '../../core/services/seo.service';
import { boardDiagram, DIGITS, PAIRS } from './board-diagram';
import { pageFacts } from './page-facts';
import { SCHEDULE } from './schedule.generated';
import { formatKickoff } from './schedule.model';
import { HOWTO_VIDEOS, HowToVideo } from './howto-videos';

export interface PageSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  html?: string;
  /** A how-to clip at the end of the section. */
  video?: HowToVideo;
  /** A line shown just above the clip. */
  videoIntro?: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
  /** A how-to clip under the answer. */
  video?: HowToVideo;
}

export interface HowToStep {
  name: string;
  text: string;
  /** A how-to clip under the step. */
  video?: HowToVideo;
}

export interface RelatedLink {
  path: string;
  label: string;
  text: string;
  fragment?: string;
}

export interface PageCta {
  path: string;
  label: string;
  note: string;
}

export interface MarketingPage {
  id: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  lede: string;
  /** Short note shown above the title. */
  notice?: string;
  /** Shown beside the title on wide screens. */
  heroHtml?: string;
  /** A hands-on sample board under the title (how-to-play). */
  demo?: 'how-it-works';
  published: string;
  sections: PageSection[];
  steps?: HowToStep[];
  faqs?: FaqEntry[];
  disclaimer?: string;
  related: RelatedLink[];
  cta: PageCta;
}

const MONEY_LINE = 'QuarterScore never collects, holds, or pays out money. Keep it to bragging rights or a donation to a cause.';

export const MARKETING_PAGES: Record<string, MarketingPage> = {
  'how-to-play': {
    id: 'how-to-play',
    path: '/how-to-play',
    title: 'How to Play Football Squares: Rules — QuarterScore',
    description: 'How to play football squares, with the same rules for Super Bowl squares: 100, 50 or 25 squares, a draw after the board fills, and a winner each quarter.',
    h1: 'How to play football squares',
    eyebrow: 'Rules',
    lede: 'Football squares is a free board for friends and fans. Choose 100, 50, or 25 squares, add two teams, and pick a winner at the end of each quarter. You do not need to know the sport.',
    demo: 'how-it-works',
    published: '2026-11-01',
    steps: [
      {
        name: 'Create a board',
        text: 'The host names the two teams, picks the sport and signs in to save the board. Then share the link or the six-character code.',
        video: HOWTO_VIDEOS.createBoard
      },
      {
        name: 'Claim squares by name',
        text: 'Friends open the link and type a name on empty squares. Players do not need an account.',
        video: HOWTO_VIDEOS.pickSquares
      },
      {
        name: 'Lock and draw the numbers',
        text: 'After the squares are claimed, the host locks the board, then draws the digits 0 through 9 down the side and across the top.',
        video: HOWTO_VIDEOS.lockAndDraw
      },
      {
        name: 'Match the score each quarter',
        text: 'When a quarter ends, take the last digit of each team’s score. The row digit and the column digit meet on one square. That name wins the quarter.'
      }
    ],
    sections: [
      {
        heading: 'The grid',
        paragraphs: [
          'A standard board is 10 rows by 10 columns. Each square can hold one name. One team runs down the rows. The other runs across the columns. The digits 0 through 9 are assigned to each side only after people have claimed squares, so nobody can pick a digit on purpose.'
        ]
      },
      {
        heading: 'How a quarter is decided',
        paragraphs: [
          'Scores use the last digit only. A score of 17 counts as 7. A score of 20 counts as 0. If the away team’s last digit is on row 7 and the home team’s last digit is on column 0, the square where that row and column meet is the quarter’s square.',
          'Most groups play for bragging rights. The suggested 20, 20, 20 and 40 percent split is only a label. It is not a payment.'
        ]
      },
      {
        heading: 'Board sizes',
        paragraphs: [
          'Pick the size that fits your group. Smaller boards fill faster and give each square more chances to win.'
        ],
        bullets: [
          '100 squares: large parties and offices.',
          '50 squares: medium groups.',
          '25 squares: small gatherings.'
        ]
      },
      {
        heading: '100 squares',
        paragraphs: [
          '10 rows by 10 columns, one digit each. Every square is one possible score.'
        ],
        html: boardDiagram({ rows: DIGITS, cols: DIGITS, win: [4, 7], caption: 'Score 24 to 17: row 4, column 7.' })
      },
      {
        heading: '50 squares',
        paragraphs: [
          '5 rows by 10 columns. The side uses digit pairs, so each square covers two scores.'
        ],
        html: boardDiagram({ rows: PAIRS, cols: DIGITS, win: [2, 7], caption: 'Score 24 to 17: row 4,5, column 7.' })
      },
      {
        heading: '25 squares',
        paragraphs: [
          '5 rows by 5 columns. Both sides use digit pairs, so each square covers four scores.'
        ],
        html: boardDiagram({ rows: PAIRS, cols: PAIRS, win: [2, 3], caption: 'Score 24 to 17: row 4,5, column 6,7.' })
      },
      {
        heading: 'Overtime and empty squares',
        paragraphs: [
          'Agree on the rules before kickoff. Most groups count overtime in the final score.',
          'If nobody holds a winning square, that quarter has no winner. QuarterScore moves its points using the rule the host picked. If a quarter ends on the same digits as the one before, the same square wins again.'
        ]
      },
      {
        heading: 'Super Bowl squares rules',
        paragraphs: [
          'Super Bowl squares uses these same rules. Same grid, same draw after the board fills, same last digit of each score at the end of each quarter.',
          'If your party has first-time players, send this page with the board link, and post your overtime and empty-square rules before kickoff.'
        ]
      }
    ],
    related: [
      { path: '/faq', label: 'FAQ', text: 'Accounts, private games, and money questions.' },
      { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'Make the big-game board before the matchup is set.' },
      { path: '/best-squares-numbers', label: 'Best numbers', text: 'Which digits show up most often in the historical table.' },
      { path: '/', fragment: 'how-it-works', label: 'How it works on the homepage', text: 'The three-step version of creating and sharing a board.' }
    ],
    cta: {
      path: '/create',
      label: 'Create a board',
      note: MONEY_LINE
    }
  },
  faq: {
    id: 'faq',
    path: '/faq',
    title: 'Football Squares FAQ — QuarterScore',
    description: 'Football squares FAQ: cost, accounts, how numbers are drawn, private games, overtime, unfilled boards, and whether QuarterScore handles money.',
    h1: 'Football squares FAQ',
    eyebrow: 'Questions',
    lede: 'Short answers for hosts and players. Squares here is a free game for friends and fans, with bragging rights.',
    published: '2026-11-01',
    faqs: [
      {
        question: 'Does QuarterScore cost money?',
        answer: 'No. Creating a board and claiming squares is free. QuarterScore never collects, holds, or pays out money.'
      },
      {
        question: 'Do players need an account?',
        answer: 'No. Anyone with the link can claim a square by typing a name. The host signs in to save the board, lock it, and change settings.'
      },
      {
        question: 'How are the numbers randomized?',
        answer: 'The host locks the board, then draws the numbers. A shuffle assigns the digits 0 through 9 once down the rows and once across the columns. Do this after squares are claimed, so the draw is the same for everyone and nobody chooses a digit.'
      },
      {
        question: 'How do I find my squares on the board?',
        answer: 'Tap your name in the players list. Your squares light up on the board. Tap your name again to clear it.',
        video: HOWTO_VIDEOS.highlightPlayer
      },
      {
        question: 'How do I change a game after I make it?',
        answer: 'The host opens the game and taps Edit game (Edit on a phone). Change the name, the teams or the points, or open More options to add a note for players. Then tap Save changes.',
        video: HOWTO_VIDEOS.editGame
      },
      {
        question: 'How do I see who’s playing?',
        answer: 'The host taps Manage players (Players on a phone) to see everyone on the board. Confirm a player, or remove one to open their squares back up. Then tap Done.',
        video: HOWTO_VIDEOS.managePlayers
      },
      {
        question: 'Are games private?',
        answer: 'A game is reached by its link or six-character code. It is not listed in a public directory. Anyone who has the code can open the board, so share it only with your group.'
      },
      {
        question: 'What happens in overtime?',
        answer: 'Set the rule before kickoff. Most groups let overtime count toward the final score, and the final square uses the score at the end of the game. Post the rule on the board so nobody is surprised.'
      },
      {
        question: 'What if the board is not full?',
        answer: "Empty squares can still be the winning square if the score lands there. When that happens the quarter has no winner, and QuarterScore moves its points for you. The host picks the rule when creating the board and can change it later from Edit game: roll the points into Q4 (if Q4 has no winner either, Q4's points are split among the other quarters), or split them across the other quarters. You can also leave the board unlocked until more people claim a square."
      },
      {
        question: 'What if the score does not change in a quarter?',
        answer: 'The last digits stay the same, so the same square wins that quarter too. That is a normal result, not a mistake.'
      },
      {
        question: 'Can I see which squares show up most often?',
        answer: 'Yes. Open Best numbers for the historical table, or use the Hit rate tab on a live board after the digits are drawn. The table is about how often digit pairs have appeared. It is not a promise about your game.',
        video: HOWTO_VIDEOS.hitRate
      },
      {
        question: 'Does QuarterScore handle money?',
        answer: 'No. QuarterScore never collects, holds, or pays out money. Hosts who track who brought a contribution do that outside the app, and they follow their own local rules.'
      }
    ],
    sections: [
      {
        heading: 'Still setting the board up?',
        paragraphs: [
          'The rules page walks through the grid, the draw, and how a quarter winner is chosen. The printable page is there if you also want a paper copy on the wall.'
        ]
      }
    ],
    related: [
      { path: '/how-to-play', label: 'How to play', text: 'The full rules, including overtime and empty squares.' },
      { path: '/best-squares-numbers', label: 'Best numbers', text: 'The historical digit table, explained.' },
      { path: '/printable-football-squares', label: 'Printable board', text: 'A blank grid you can print or download.' },
      { path: '/football-squares-fundraiser', label: 'Donation squares', text: 'Fundraiser formats where the cause is the point.' }
    ],
    cta: {
      path: '/create',
      label: 'Create a board',
      note: MONEY_LINE
    }
  },
  'super-bowl-squares': {
    id: 'super-bowl-squares',
    path: '/super-bowl-squares',
    title: 'Super Bowl Squares 2027: Free Board and Rules — QuarterScore',
    description: 'Free Super Bowl squares for February 14, 2027. Make the board before the teams are set, share one link, and get the rules, best numbers and a printable.',
    h1: 'Super Bowl squares',
    notice: 'QuarterScore is not affiliated with, endorsed by, or sponsored by the NFL, NBA, or NCAA. Team and event names are used only to describe the games.',
    eyebrow: 'Super Bowl LXI',
    lede: 'Make the board before either team is known. Add the team names when the matchup is announced and keep the same link. It is free, and players do not need an account.',
    heroHtml: pageFacts([['Date', 'Sunday, February 14, 2027'], ['Kickoff', '6:30 p.m. ET'], ['Venue', 'SoFi Stadium, Inglewood']]),
    published: '2026-11-01',
    sections: [
      {
        heading: 'Make the board before the matchup is set',
        paragraphs: [
          'Squares does not need the teams. Friends claim a square by name, then you draw the digits. When the matchup is announced, add the team names and keep the same link.',
          'February 14 is also Valentine’s Day in 2027. One board still works for a party that mixes fans and people who came for the snacks. Nobody has to understand the sport.'
        ]
      },
      {
        heading: 'How Super Bowl squares works',
        paragraphs: [
          'Pick a board: 100 squares for a big party or office, 50 for a medium group, 25 for a small one. Friends claim squares by name. When the board fills, the host locks it and draws the digits 0 through 9 for each team, so nobody can choose a number.',
          'At the end of each quarter, take the last digit of each team’s score. A score of 24 to 17 lands on the square where 4 and 7 meet. On 50 and 25 square boards, a side uses digit pairs, so one square covers more than one score.',
          'The suggested split is 20, 20, 20 and 40 percent of the points, with the final quarter worth the most. It is a label for bragging rights, not money.'
        ]
      },
      {
        heading: 'What the host does',
        paragraphs: [
          'Create the board, share the link, and ask people to claim squares in the weeks before the game. On game day, lock the board, draw the numbers where everyone can see the draw, and leave it on a TV.'
        ],
        bullets: [
          'One link for the group chat, the office, or the party.',
          'Players claim squares without creating an account.',
          'Each quarter, the last digit of each score names the square.',
          'Celebrate moments, not money. Bragging rights are enough.'
        ],
        videoIntro: 'Watch a host make a board in 30 seconds.',
        video: HOWTO_VIDEOS.createBoard
      },
      {
        heading: 'Which numbers come up most',
        paragraphs: [
          'In the historical table, 7 and 0 is the most common pair, at about 3.5 percent of final scores either way round. 2 and 2 almost never comes up. An average square is 1 percent.',
          'The digits are drawn after names go on, so a good pair is luck. [Best numbers](/best-squares-numbers) has the full table.'
        ]
      },
      {
        heading: 'Print a paper Super Bowl squares board',
        paragraphs: [
          'Want paper on the wall too? The [printable page](/printable-football-squares) has a blank 100-square grid to print or download. Write names first, then draw the numbers.'
        ]
      },
      {
        heading: 'Put the board on the TV',
        paragraphs: [
          'On game day, choose **Present on a TV** from your game. The screen shows the board, each quarter’s winner and a QR code guests can scan to follow on their phones. Link the board to the live game and the score and clock show too.',
          'Try your TV the day before. [Football squares on TV](/football-squares-on-tv) has the steps for casting and mirroring.'
        ]
      },
      {
        heading: 'Rules to post early',
        paragraphs: [
          'Write down what you will do with overtime, with a square nobody claimed, and with a quarter that ends on the same digits as the one before. The how-to-play page is the short version you can send with the link.'
        ]
      }
    ],
    related: [
      { path: '/how-to-play', label: 'How to play', text: 'The full rules, including overtime and empty squares.' },
      { path: '/best-squares-numbers', label: 'Best numbers', text: 'Every digit pair, from 7 and 0 down to 2 and 2.' },
      { path: '/printable-football-squares', label: 'Printable board', text: 'A blank 100-square grid to print or download.' },
      { path: '/faq', label: 'FAQ', text: 'Accounts, privacy, and money.' },
      { path: '/football-squares-on-tv', label: 'Football squares on TV', text: 'Put the board on a big screen.' }
    ],
    cta: {
      path: '/create',
      label: 'Create your Super Bowl board',
      note: MONEY_LINE
    }
  },
  'thanksgiving-football-squares': {
    id: 'thanksgiving-football-squares',
    path: '/thanksgiving-football-squares',
    title: 'Thanksgiving Football Squares — QuarterScore',
    description: 'Football squares for Thanksgiving: a free board for the table, one game or three, with a link guests can open between dinner and dessert.',
    h1: 'Thanksgiving football squares',
    eyebrow: 'Game day',
    lede: 'A full slate of games and a house full of people. Squares gives everyone a reason to watch, including guests who do not follow the sport.',
    heroHtml: pageFacts([['Date', 'Thursday, November 26, 2026'], ['Games', `${SCHEDULE.thanksgiving.length} this week`]]),
    published: '2026-11-01',
    sections: [
      ...(SCHEDULE.thanksgiving.length > 0 ? [{
        heading: 'Thanksgiving week games',
        paragraphs: ['Pick one game or run a board for each.'],
        bullets: SCHEDULE.thanksgiving.map(game =>
          `${game.awayTeamFull} at ${game.homeTeamFull}: ${formatKickoff(game.date)}${game.network ? ` on ${game.network}` : ''}`)
      }] : []),
      {
        heading: 'One board or one per game',
        paragraphs: [
          'A single board is easier to explain while the turkey is being carved. Separate boards help if different relatives want different games. Share one link in the family thread, and people in another city can claim a square on their phone.'
        ]
      },
      {
        heading: 'Rewards that fit the day',
        paragraphs: [
          'First pick of leftovers, a pass on dishes, or picking the next movie is plenty. Say it out loud before you draw numbers.'
        ],
        bullets: [
          'Create the board the weekend before, not during dinner.',
          'Draw numbers after the last guest has claimed a square.'
        ]
      },
      {
        heading: 'Kids and non-fans',
        paragraphs: [
          'The rule is only \u201cyour digits match the end of the score.\u201d A child can claim a square under their own name and check the board at the end of the quarter.'
        ]
      }
    ],
    related: [
      { path: '/how-to-play', label: 'How to play', text: 'Explain the grid in two minutes.' },
      { path: '/printable-football-squares', label: 'Printable board', text: 'Tape a paper grid to the fridge.' },
      { path: '/nfl-squares', label: 'NFL squares', text: 'The same board for any Sunday game.' },
    ],
    cta: {
      path: '/create',
      label: 'Set up the Thanksgiving board',
      note: 'Free for the whole table. Players do not need an account.'
    }
  },
  'nfl-squares': {
    id: 'nfl-squares',
    path: '/nfl-squares',
    title: 'NFL Squares for Any Game — QuarterScore',
    description: 'NFL squares on a free 10 by 10 board. Share a link, claim squares by name, and follow each quarter without a spreadsheet.',
    h1: 'NFL squares',
    eyebrow: 'Any week of the season',
    lede: 'The same 10 by 10 board works for a Thursday game, a Sunday slate, or a one-off with friends. Pick the game, share the link, and draw the numbers when the squares are claimed.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'What you set up',
        paragraphs: [
          'Create a board and choose NFL. Add the two teams and send the link. Friends type their names on open squares. When you are ready, lock the board and draw the numbers. Each quarter, the last digit of each score points at one square.'
        ]
      },
      {
        heading: 'A board you can run every week',
        paragraphs: [
          'Some groups play one game a week all season. Each game gets its own board and link, so old scores stay put.'
        ],
        bullets: [
          'No account for the people claiming squares.',
          'A code for anyone standing in the room.',
          'A Hit rate tab after the draw, from the same table as the best-numbers page.'
        ]
      }
    ],
    related: [
      { path: '/nfl-playoff-squares', label: 'NFL playoff squares', text: 'Wild card weekend through the conference games.' },
      { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'The February 14, 2027 board.' },
      { path: '/how-to-play', label: 'How to play', text: 'Rules, overtime, and empty squares.' },
      { path: '/best-squares-numbers', label: 'Best numbers', text: 'Why 0, 7, 3, and 4 show up so often.' }
    ],
    cta: {
      path: '/create',
      label: 'Create an NFL board',
      note: MONEY_LINE
    }
  },
  'nfl-playoff-squares': {
    id: 'nfl-playoff-squares',
    path: '/nfl-playoff-squares',
    title: 'NFL Playoff Squares — QuarterScore',
    description: 'NFL playoff squares for wild card weekend, the divisional round, and the conference championships. One free board per game, same link style all January.',
    h1: 'NFL playoff squares',
    eyebrow: 'Postseason',
    lede: 'Playoff games are an easy reason to run another board. Give each game its own.',
    heroHtml: pageFacts([['Wild card', 'January 16–18, 2027'], ['Divisional', 'January 23–24, 2027'], ['Conference', 'January 31, 2027']]),
    published: '2026-11-01',
    sections: [
      {
        heading: 'One board per game',
        paragraphs: [
          'A weekend can have several games. Give each its own board so the quarter winners stay attached to the right score, and share the links in one message labeled by kickoff.'
        ]
      },
      {
        heading: 'Use January as a practice run',
        paragraphs: [
          'If you will also play on February 14, use a playoff board to settle the house rules. Decide overtime and empty squares once, then copy that note onto the big-game board.'
        ]
      }
    ],
    related: [
      { path: '/nfl-squares', label: 'NFL squares', text: 'The regular-season version of the same board.' },
      { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'Where the January boards are headed.' },
      { path: '/college-football-squares', label: 'College football squares', text: 'The playoff and bowl boards on the same weekend stretch.' },
      { path: '/how-to-play', label: 'How to play', text: 'Send this with the link so new people can follow.' }
    ],
    cta: {
      path: '/create',
      label: 'Create your playoff boards',
      note: MONEY_LINE
    }
  },
  'college-football-squares': {
    id: 'college-football-squares',
    path: '/college-football-squares',
    title: 'College Football Squares — QuarterScore',
    description: 'College football squares for bowl games and the playoff. Create a free NCAA board, share one link, and score each quarter from the last digits.',
    h1: 'College football squares',
    eyebrow: 'Bowls and the playoff',
    lede: 'The same squares rules as every other football board. Choose NCAA Football, name the two teams, and send the link.',
    heroHtml: pageFacts([['Playoff, first round', 'December 18–19, 2026'], ['Quarterfinals', 'December 30 and January 1'], ['Title game', 'Monday, January 25, 2027']]),
    published: '2026-11-01',
    sections: [
      {
        heading: 'Which games people host',
        paragraphs: [
          'Bowl season stacks games close together. One board per game keeps the winners clear, and a New Year\u2019s party can have two or three boards on the same TV if you label the links with the kickoff time.'
        ]
      },
      {
        heading: 'The number table is from NFL history',
        paragraphs: [
          'The Hit rate tab is built from professional football scores. College totals run higher, so treat it as a curiosity. The board itself does not care: last digit of each score, one square, one name.'
        ]
      }
    ],
    related: [
      { path: '/best-squares-numbers', label: 'Best numbers', text: 'The NFL history table, with the college caveat.' },
      { path: '/how-to-play', label: 'How to play', text: 'Rules that apply to every football board.' },
      { path: '/thanksgiving-football-squares', label: 'Thanksgiving', text: 'A family board before bowl season starts.' },
      { path: '/nfl-playoff-squares', label: 'NFL playoff squares', text: 'The January games after the college title.' }
    ],
    cta: {
      path: '/create',
      label: 'Create a college board',
      note: 'Choose NCAA Football when you create the game. ' + MONEY_LINE
    }
  },
  'football-squares-fundraiser': {
    id: 'football-squares-fundraiser',
    path: '/football-squares-fundraiser',
    title: 'Donation Squares for a Football Fundraiser — QuarterScore',
    description: 'Donation-style football squares for a school, team, or charity. Free to claim, optional donations, and nothing of value for players. QuarterScore never handles the money.',
    h1: 'Donation squares',
    eyebrow: 'A fundraiser where the cause wins',
    lede: 'Squares can bring supporters around a game. These are formats where the cause is the winner. If you want players to receive anything of value, stop and check your state’s charitable gaming rules first. In many states that is regulated or not allowed.',
    published: '2026-11-01',
    disclaimer: 'QuarterScore is a free board and scoring tool. We never collect, hold, or pay out money. Raffles and games of chance are regulated by state law and often limited to qualified nonprofits. Check your state’s rules and your school, district, or organization’s policies before you start. This page is not legal advice.',
    sections: [
      {
        heading: 'Formats that keep the focus on the cause',
        paragraphs: [
          'Pick one of these and write it at the top of the board. Do not mix them.'
        ],
        bullets: [
          'Free to claim, with a separate optional donation. Anyone can take a square without donating, and everyone has the same chance at a thank-you gift from a sponsor. The donation link lives somewhere else.',
          'A board with nothing to win. Supporters take a square to back the cause and get a thank-you on the board.',
          'The winning square picks the charity. Supporters name a charity, and each quarter’s winning square decides which one gets the shout-out.'
        ]
      },
      {
        heading: 'What this page does not teach',
        paragraphs: [
          'A board that charges for a square and then pays part of that money to the people whose squares come up is a different thing, and it is unlawful in many places even when a charity keeps a share. This site will not walk through that setup.',
          'Schools, booster clubs, and congregations often have their own policies on top of state law. Ask them before you announce anything.'
        ]
      },
      {
        heading: 'How the board helps',
        paragraphs: [
          'Use QuarterScore for names, the draw and the results. Put the thank-you and the rule in the game name or the message where you share the link, and collect any donation through the tool your organization already uses.'
        ]
      }
    ],
    related: [
      { path: '/faq', label: 'FAQ', text: 'The money answer, in one line.' },
      { path: '/how-to-play', label: 'How to play', text: 'How the grid and the draw work.' },
      { path: '/terms', label: 'Terms', text: 'The rule that QuarterScore does not handle money.' }
    ],
    cta: {
      path: '/how-to-play',
      label: 'Read the rules first',
      note: 'Check your local rules before you invite anyone. QuarterScore never collects, holds, or pays out money.'
    }
  },
  'nba-squares': {
    id: 'nba-squares',
    path: '/nba-squares',
    title: 'NBA Squares — QuarterScore',
    description: 'NBA squares uses the same last-digit board as football. Create a free basketball game, share the link, and follow each quarter.',
    h1: 'NBA squares',
    eyebrow: 'After the football season',
    lede: 'The same grid and the same last-digit rule. Scores are higher and quarters are shorter, but your group does not need to learn a new game.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'What changes and what does not',
        paragraphs: [
          'You still have 100 squares and digits 0 through 9 on the rows and columns. A score of 28 counts as 8, the same way a football score of 17 counts as 7.',
          'Choose NBA when you create the board so it is labeled for basketball. The football hit rates do not describe basketball scoring.'
        ]
      },
      {
        heading: 'Which games to pick',
        paragraphs: [
          'One marquee game is enough for a group text. For a playoff series, make a board per game so each final score has a clear winner.'
        ]
      }
    ],
    related: [
      { path: '/how-to-play', label: 'How to play', text: 'The last-digit rule, written for football and true here too.' },
      { path: '/faq', label: 'FAQ', text: 'Accounts and money, which do not change by sport.' },
      { path: '/nfl-squares', label: 'NFL squares', text: 'The football version of this page.' }
    ],
    cta: {
      path: '/create',
      label: 'Create an NBA board',
      note: 'Choose NBA as the sport. ' + MONEY_LINE
    }
  },
  'football-squares-on-tv': {
    id: 'football-squares-on-tv',
    path: '/football-squares-on-tv',
    title: 'Football Squares on TV — QuarterScore',
    description: 'Show your football squares board on a TV or big screen with QuarterScore TV mode: the board, the score, each quarter winner and a QR code to join.',
    h1: 'Football squares on TV',
    eyebrow: 'TV mode',
    lede: 'Put your board on a big screen: the board, the score, each quarter winner and a code friends can scan to follow along. Free for every account.',
    heroHtml: `<img src="/assets/tv-mode/tv-board.png" alt="QuarterScore TV mode: a squares board with sample player names, the score, the winner of each quarter and a QR code." width="1920" height="1080" class="h-auto w-full rounded-card border border-qs-line">`,
    published: '2026-11-06',
    sections: [
      {
        heading: 'What the screen shows',
        paragraphs: [
          'The screen fills the window, from a laptop to a 4K TV, with no scrolling.'
        ],
        bullets: [
          'The board, with each player\u2019s squares in their own color.',
          'The live score and clock, when the board is linked to a live game.',
          'The winner of each quarter, and how many squares are claimed and open.',
          'A QR code so friends can follow on their phones. They do not need an account.'
        ]
      },
      {
        heading: 'Get it on the TV',
        paragraphs: [
          'On a computer, open your game, open your profile menu at the top right and choose **Present on a TV**. It is there for the host and co-host. Then send that tab to the TV. We have not tested every TV, so try yours before game day.'
        ],
        bullets: [
          'Chrome or Edge: browser menu, **Cast**, pick your TV, **Sources**, **Cast tab**. Same Wi-Fi for both.',
          'Safari on a Mac: **Control Center**, **Screen Mirroring**, pick your Apple TV or AirPlay TV.',
          'Any browser: use an HDMI cable, or open the page in the TV\u2019s own browser.',
          'No mirroring: tap **Copy TV link** and open it on any device. It shows the board live and needs no sign-in.'
        ],
        html: `<p class="text-sm text-qs-muted">Google explains casting in <a href="https://support.google.com/chrome/answer/3228332" rel="noopener noreferrer" target="_blank" class="underline">Cast from Chrome to your TV</a>.</p>`,
        videoIntro: 'Watch a host put the board on a TV in 33 seconds.',
        video: HOWTO_VIDEOS.tvMode
      },
      {
        heading: 'More than one board',
        paragraphs: [
          'Signed in, press the clock button at the top right of TV mode and pick how often to switch, from 10 to 60 seconds. TV mode rotates through all your boards, and **Stop** holds one on screen. The arrow keys switch boards by hand. It suits a bar or a gathering where several groups each have a board.'
        ]
      },
      {
        heading: 'Game-day checklist',
        paragraphs: [],
        bullets: [
          'The day before: choose **Present on a TV** and check the TV shows it.',
          'Link the board to the live game so the score and clock appear.',
          'Put the TV where everyone can see the QR code.',
          'After the game: the Q4 tile says **Final**. Read the winners from the screen.'
        ]
      }
    ],
    related: [
      { path: '/how-to-play', label: 'How to play', text: 'The grid, the draw and the quarter winners.' },
      { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'The February 14, 2027 party board.' },
      { path: '/printable-football-squares', label: 'Printable board', text: 'A paper grid for the party wall.' }
    ],
    cta: {
      path: '/create',
      label: 'Create a board',
      note: 'Free. Players do not need an account.'
    }
  },
  terms: {
    id: 'terms',
    path: '/terms',
    title: 'Terms of Use — QuarterScore',
    description: 'Terms for using QuarterScore, a free football squares board. The site never collects, holds, or pays out money.',
    h1: 'Terms of use',
    eyebrow: 'Legal',
    lede: 'QuarterScore is a free board for organizing a squares game with friends and fans. These terms are the rules for using the site.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          'You can create a board, share its link, claim squares by name, draw digits, and record scores. The site is provided as-is, without a promise that it will always be available or error-free.',
          'QuarterScore never collects, holds, or pays out money. Anything your group arranges stays between the people in that group. Hosts are responsible for following the law where they live, including rules on games of chance.'
        ]
      },
      {
        heading: 'Your board',
        paragraphs: [
          'Do not use the site for anything unlawful, and do not put someone else’s personal information on a square without a reason they would expect. Game links are secrets by default. Anyone with the link can view that board. If a host turns on “Show in my open boards”, that board’s name, teams, points per square and open-square count can be seen by anyone who opens another of that host’s boards.',
          'We may remove a board that breaks these terms or that we are required to remove. You may stop using the site at any time.'
        ]
      }
    ],
    related: [
      { path: '/privacy', label: 'Privacy', text: 'What the site stores about accounts and games.' },
      { path: '/faq', label: 'FAQ', text: 'Plain-language answers, including the money question.' },
      { path: '/football-squares-fundraiser', label: 'Donation squares', text: 'Fundraiser formats and the legal caution.' }
    ],
    cta: {
      path: '/',
      label: 'Back to the homepage',
      note: 'Last updated November 7, 2026.'
    }
  },
  privacy: {
    id: 'privacy',
    path: '/privacy',
    title: 'Privacy — QuarterScore',
    description: 'What QuarterScore stores: account details if you sign in, a guest name on your device, and the squares, scores, and settings on boards you join.',
    h1: 'Privacy',
    eyebrow: 'Legal',
    lede: 'QuarterScore stores what it needs to run a board. It does not sell personal information, and it never collects, holds, or pays out money.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'What is stored',
        paragraphs: [
          'If you sign in, the account provider gives us an identifier and, when you allow it, your name, email, and photo. A guest can save a display name in a cookie on that device so the board can show it. You can clear that cookie in your browser.',
          'Boards store the game name, team names, the names typed onto squares, scores, and settings such as whether the board is locked. That information is visible to anyone with the game link. A host can also choose to show a board in their open boards, which shows its name, teams, points per square and open-square count to people looking at that host’s other boards.'
        ]
      },
      {
        heading: 'What we do not do',
        paragraphs: [
          'We do not sell personal information. We do not ask for payment card numbers. Analytics, when it is turned on, uses a first-party analytics identifier to count visits and is not used to build an advertising profile or for ads. If a measurement id is not configured, analytics does not load.',
          'Hosting, sign-in, and the database are provided by Google. Their systems process the data required to deliver those services.'
        ]
      },
      {
        heading: 'Your choices',
        paragraphs: [
          'Do not put a name on a square if you do not want people with the link to see it. Sign out on a shared computer. Clearing the site’s cookie removes the guest name from that browser.'
        ]
      }
    ],
    related: [
      { path: '/terms', label: 'Terms', text: 'The rules for using the board.' },
      { path: '/faq', label: 'FAQ', text: 'Who needs an account, and who can open a game.' }
    ],
    cta: {
      path: '/',
      label: 'Back to the homepage',
      note: 'Last updated November 7, 2026.'
    }
  },
  contact: {
    id: 'contact',
    path: '/contact',
    title: 'Contact QuarterScore',
    description: 'Email QuarterScore for help with a football squares board, a bug report, or an idea.',
    h1: 'Contact us',
    eyebrow: 'Help',
    lede: 'Stuck on a board, found a bug, or have an idea? Send an email and a real person will read it.',
    published: '2026-11-07',
    sections: [
      {
        heading: 'Email us',
        paragraphs: ['One address for everything:'],
        html: '<a href="mailto:hello@quarterscore.com" class="inline-flex min-h-11 items-center rounded-md bg-qs-accent px-5 text-lg font-semibold text-qs-on-accent hover:bg-qs-accent-hover">hello@quarterscore.com</a>'
      },
      {
        heading: 'What to include',
        paragraphs: ['A few details help us fix things faster.'],
        bullets: [
          'The link to your board (the address in your browser). Please do not send passwords.',
          'What you expected to happen and what happened instead.',
          'Your device and browser, for example iPhone Safari or Chrome on a Mac.',
          'A screenshot, if you have one.'
        ]
      },
      {
        heading: 'Good to know',
        paragraphs: [
          'Most questions are answered in the FAQ and the how-to-play guide, linked below. QuarterScore is a small independent project, so replies can take a day or two, and game days are the busiest.'
        ]
      }
    ],
    related: [
      { path: '/faq', label: 'FAQ', text: 'Quick answers about boards, accounts and scoring.' },
      { path: '/how-to-play', label: 'How to play', text: 'The rules of football squares in a minute.' },
      { path: '/privacy', label: 'Privacy', text: 'What the site stores.' }
    ],
    cta: {
      path: '/create',
      label: 'Start a free board',
      note: 'Free. Players do not need an account.'
    }
  }
};

export function getMarketingPage(id: string): MarketingPage {
  const page = MARKETING_PAGES[id];
  if (!page) {
    throw new Error(`Unknown marketing page: ${id}`);
  }
  return page;
}

export function pageBreadcrumbs(page: MarketingPage): BreadcrumbItem[] {
  return [
    { name: 'Home', path: '/' },
    { name: page.h1, path: page.path }
  ];
}
