import { BreadcrumbItem } from '../../core/services/seo.service';

export interface PageSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
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
  published: string;
  sections: PageSection[];
  steps?: HowToStep[];
  faqs?: FaqEntry[];
  disclaimer?: string;
  related: RelatedLink[];
  cta: PageCta;
}

const MONEY_LINE = 'Quarter Score never collects, holds, or pays out money. If your group uses prizes, keep them as bragging rights or something donated, and follow your local rules.';

export const MARKETING_PAGES: Record<string, MarketingPage> = {
  'how-to-play': {
    id: 'how-to-play',
    path: '/how-to-play',
    title: 'How to Play Football Squares — Quarter Score',
    description: 'How to play football squares: a 10 by 10 grid, numbers drawn after the board fills, and a winner each quarter from the last digit of each score.',
    h1: 'How to play football squares',
    eyebrow: 'Rules',
    lede: 'Football squares is a free board for friends and fans. One hundred squares, two teams, and a winner at the end of each quarter. You do not need to know the sport.',
    published: '2026-11-01',
    steps: [
      {
        name: 'Open a board',
        text: 'The host signs in and creates a game. Name the two teams, pick the sport, and share the link or the six-character code.'
      },
      {
        name: 'Claim squares by name',
        text: 'Friends open the link and type a name on empty squares. Players do not need an account.'
      },
      {
        name: 'Draw the numbers',
        text: 'After the squares are claimed, the host randomizes the digits 0 through 9 down the side and across the top, then locks the board.'
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
          'Many groups give a small prize each quarter and a larger one for the final score. Quarter Score can show a suggested split of 20 percent, 20 percent, 20 percent, and 40 percent for the final. That split is a label for your own prize. It is not a payment.'
        ]
      },
      {
        heading: 'Overtime, empty squares, and ties',
        paragraphs: [
          'Agree on the rules before kickoff and post them where the group can see them. The usual house rule is that overtime points count toward the final score, so the last square uses the score when the game actually ends.',
          'If a winning square was never claimed, there is no name on it. Decide ahead of time whether that quarter is skipped or redrawn. If a quarter ends on the same digits as the quarter before, the same square wins again.'
        ],
        bullets: [
          'Draw numbers only after the board is as full as you want it.',
          'Lock the board so names and digits stop changing.',
          'Read the last digit of each score, not the whole score.'
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
      path: '/dashboard',
      label: 'Create your board',
      note: MONEY_LINE
    }
  },
  faq: {
    id: 'faq',
    path: '/faq',
    title: 'Football Squares FAQ — Quarter Score',
    description: 'Football squares FAQ: cost, accounts, how numbers are drawn, private games, overtime, unfilled boards, and whether Quarter Score handles money.',
    h1: 'Football squares FAQ',
    eyebrow: 'Questions',
    lede: 'Short answers for hosts and players. Squares here is a free game for friends and fans, with bragging rights or a prize you arrange yourselves.',
    published: '2026-11-01',
    faqs: [
      {
        question: 'Does Quarter Score cost money?',
        answer: 'No. Creating a board and claiming squares is free. Quarter Score never collects, holds, or pays out money.'
      },
      {
        question: 'Do players need an account?',
        answer: 'No. Anyone with the link can claim a square by typing a name. The host signs in to create the game, lock it, and change settings.'
      },
      {
        question: 'How are the numbers randomized?',
        answer: 'The host runs a shuffle that assigns the digits 0 through 9 once down the rows and once across the columns. Do this after squares are claimed, so the draw is the same for everyone and nobody chooses a digit.'
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
        answer: 'Empty squares can still be the winning square if the score lands there. Decide in advance whether an unclaimed square means no prize that quarter. You can also leave the board unlocked until more people claim a square.'
      },
      {
        question: 'What if the score does not change in a quarter?',
        answer: 'The last digits stay the same, so the same square wins that quarter too. That is a normal result, not a mistake.'
      },
      {
        question: 'Can I see which squares show up most often?',
        answer: 'Yes. Open Best numbers for the historical table, or use the heatmap on a live board after the digits are drawn. The table is about how often digit pairs have appeared. It is not a promise about your game.'
      },
      {
        question: 'Does Quarter Score handle money?',
        answer: 'No. Quarter Score never collects, holds, or pays out money. Hosts who track who brought a contribution do that outside the app, and they follow their own local rules.'
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
      { path: '/football-squares-fundraiser', label: 'Donation squares', text: 'Fundraiser formats where the cause is the point, not a cash prize.' }
    ],
    cta: {
      path: '/dashboard',
      label: 'Start a free game',
      note: MONEY_LINE
    }
  },
  'super-bowl-squares': {
    id: 'super-bowl-squares',
    path: '/super-bowl-squares',
    title: 'Super Bowl Squares for February 14, 2027 — Quarter Score',
    description: 'Super Bowl squares for Super Bowl LXI on February 14, 2027. Make a free board before the teams are set and share one link with friends.',
    h1: 'Super Bowl squares',
    eyebrow: 'February 14, 2027',
    lede: 'Super Bowl LXI is Sunday, February 14, 2027, at SoFi Stadium in Inglewood, with a 6:30 p.m. ET kickoff. You can make the board before either team is known.',
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
        heading: 'What the host does',
        paragraphs: [
          'Create the game, share the link, and ask people to claim squares in the weeks before the game. On game day, randomize the numbers where everyone can see the draw, lock the board, and leave it on a TV.'
        ],
        bullets: [
          'One link for the group chat, the office, or the party.',
          'Players claim squares without creating an account.',
          'Each quarter, the last digit of each score names the square.',
          'Prizes stay between your friends. Bragging rights are enough.'
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
      { path: '/how-to-play', label: 'How to play', text: 'Grid, draw, and quarter winners.' },
      { path: '/best-squares-numbers', label: 'Best numbers', text: 'Which digits history shows most often.' },
      { path: '/printable-football-squares', label: 'Printable board', text: 'A paper grid for the party wall.' },
      { path: '/faq', label: 'FAQ', text: 'Accounts, privacy, and money.' },
      { path: '/blog', label: 'Blog', text: 'The November 5 numbers post and later guides.' }
    ],
    cta: {
      path: '/dashboard',
      label: 'Create your Super Bowl board',
      note: MONEY_LINE
    }
  },
  'thanksgiving-football-squares': {
    id: 'thanksgiving-football-squares',
    path: '/thanksgiving-football-squares',
    title: 'Thanksgiving Football Squares — Quarter Score',
    description: 'Football squares for Thanksgiving: a free board for the table, one game or three, with a link guests can open between dinner and dessert.',
    h1: 'Thanksgiving football squares',
    eyebrow: 'November 26, 2026',
    lede: 'Thanksgiving Thursday, November 26, 2026, has a full slate of games and a house full of people. Football squares gives everyone a square to watch, including guests who do not follow the sport.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'One board or one per game',
        paragraphs: [
          'Three games means you can run three boards or pick the one the table cares about. A single board is easier to explain while the turkey is being carved. Separate boards help if different relatives want different games.',
          'Share one link in the family thread. People who are in another city claim a square on their phone. Names show up for everyone at the table.'
        ]
      },
      {
        heading: 'Prizes that fit the day',
        paragraphs: [
          'Skip cash. First choice of leftovers, a pass on dishes, or picking the next movie is plenty. Say the prize out loud before you draw numbers.'
        ],
        bullets: [
          'Create the board the weekend before, not during dinner.',
          'Draw numbers after the last guest has claimed a square.',
          'Leave the board open on a laptop where people can check the quarter.'
        ]
      },
      {
        heading: 'Kids and non-fans',
        paragraphs: [
          'The rule is only “your digits match the end of the score.” A child can claim a square under their own name and check the board at the end of the quarter. No playbook required.'
        ]
      }
    ],
    related: [
      { path: '/how-to-play', label: 'How to play', text: 'Explain the grid in two minutes.' },
      { path: '/printable-football-squares', label: 'Printable board', text: 'Tape a paper grid to the fridge.' },
      { path: '/nfl-squares', label: 'NFL squares', text: 'The same board for any Sunday game.' },
      { path: '/dashboard', label: 'Start a free game', text: 'Create the Thanksgiving board and share the link.' }
    ],
    cta: {
      path: '/dashboard',
      label: 'Set up the Thanksgiving board',
      note: 'Free for the whole table. Players do not need an account.'
    }
  },
  'nfl-squares': {
    id: 'nfl-squares',
    path: '/nfl-squares',
    title: 'NFL Squares for Any Game — Quarter Score',
    description: 'NFL squares on a free 10 by 10 board. Share a link, claim squares by name, and follow each quarter without a spreadsheet.',
    h1: 'NFL squares',
    eyebrow: 'Any week of the season',
    lede: 'The same 10 by 10 board works for a Thursday game, a Sunday slate, or a one-off with friends. Pick the game, share the link, and draw the numbers when the squares are claimed.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'What you set up',
        paragraphs: [
          'Create a game and choose NFL as the sport. Add the two team names in plain text. Send the link. Friends type their names on open squares. When you are ready, randomize the digits and lock the board.',
          'Each quarter, the last digit of each score points at one square. The person who claimed it wins that quarter’s bragging rights, or whatever prize your group agreed to.'
        ]
      },
      {
        heading: 'A board you can run every week',
        paragraphs: [
          'Some groups play one game a week all season. Each game gets its own board and its own link, so old scores stay put. The rules do not change from week to week, which is the point: people already know how to play.'
        ],
        bullets: [
          'No account for the people claiming squares.',
          'A code for anyone standing in the room.',
          'A heatmap after the draw, using the same historical table as the best-numbers page.'
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
      path: '/dashboard',
      label: 'Create an NFL board',
      note: MONEY_LINE
    }
  },
  'nfl-playoff-squares': {
    id: 'nfl-playoff-squares',
    path: '/nfl-playoff-squares',
    title: 'NFL Playoff Squares — Quarter Score',
    description: 'NFL playoff squares for wild card weekend, the divisional round, and the conference championships. One free board per game, same link style all January.',
    h1: 'NFL playoff squares',
    eyebrow: 'January 2027',
    lede: 'Playoff games are an easy reason to run another board. Wild card weekend is January 16–18, 2027, the divisional round is January 23–24, and the conference championships are January 31.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'One board per game',
        paragraphs: [
          'A single weekend can have several games. Give each game its own board so the quarter winners stay attached to the right score. Share the links in one message, labeled by the kickoff.',
          'The rules match any other football board: 100 squares, digits drawn after names are in, and the last digit of each score at the end of the quarter.'
        ]
      },
      {
        heading: 'Use January as a practice run',
        paragraphs: [
          'Groups who will also play the February 14 game can use a playoff board to settle the house rules. Decide overtime, empty squares, and prizes once, then copy that note onto the big-game board.',
          'Live score entry is still the host’s job if you type the score yourself. The fun part for everyone else is watching their square.'
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
      path: '/dashboard',
      label: 'Create your playoff boards',
      note: MONEY_LINE
    }
  },
  'college-football-squares': {
    id: 'college-football-squares',
    path: '/college-football-squares',
    title: 'College Football Squares — Quarter Score',
    description: 'College football squares for bowl games and the playoff. Create a free NCAA board, share one link, and score each quarter from the last digits.',
    h1: 'College football squares',
    eyebrow: 'Bowls and the playoff',
    lede: 'College games use the same squares rules as every other football board. When you create the game, choose NCAA Football, name the two teams, and send the link.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'Which games people actually host',
        paragraphs: [
          'Bowl season stacks games close together. The first round of the College Football Playoff is December 18–19, 2026. Quarterfinals are December 30 and January 1. The title game is Monday, January 25, 2027.',
          'One board per game keeps the winners clear. A New Year’s party can have two or three boards on the same TV if you label the links with the kickoff time.'
        ]
      },
      {
        heading: 'The number table is from NFL history',
        paragraphs: [
          'The public heatmap is built from professional football scoring history. College scores are not the same sport in miniature: totals run higher, and a digit pair can show up on a different schedule. Use the table as a curiosity, not as a description of a college game.',
          'The board itself does not care. Last digit of each score, one square, one name. That part is identical.'
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
      path: '/dashboard',
      label: 'Create a college board',
      note: 'Choose NCAA Football when you create the game. ' + MONEY_LINE
    }
  },
  'football-squares-fundraiser': {
    id: 'football-squares-fundraiser',
    path: '/football-squares-fundraiser',
    title: 'Donation Squares for a Football Fundraiser — Quarter Score',
    description: 'Donation-style football squares for a school, team, or charity. Free to claim, optional donations, and no cash prizes. Quarter Score never handles the money.',
    h1: 'Donation squares',
    eyebrow: 'A fundraiser where the cause wins',
    lede: 'Squares can bring supporters around a game. These are formats where the cause is the winner. If you want cash prizes for players, stop and check your state’s charitable gaming rules first. In many states that is regulated or not allowed.',
    published: '2026-11-01',
    disclaimer: 'Quarter Score is a free board and scoring tool. We never collect, hold, or pay out money. Raffles, pools, and games of chance are regulated by state law and often limited to qualified nonprofits. Check your state’s rules and your school, district, or organization’s policies before you start. This page is not legal advice.',
    sections: [
      {
        heading: 'Formats that keep the prize out of the player’s pocket',
        paragraphs: [
          'Pick one of these and write it at the top of the board. Do not mix them.'
        ],
        bullets: [
          'Free to claim, with a separate optional donation. Anyone can take a square without donating. Donors and non-donors have the same chance at a donated prize, such as a sponsor’s gift card to the school store or a team lunch. The donation link lives somewhere else. Quarter Score does not process it.',
          'A donation board with no prizes. Supporters give per square and get a thank-you on the board. Nobody receives anything of value for the square.',
          'The winning square picks the charity. Donors name a charity, and the funds go to the charity named on the winning square. The person who claimed it does not receive the money.'
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
          'Use Quarter Score for names, the number draw, and the quarter-by-quarter result. Put the thank-you and the rule in the game name or in the message where you share the link. Collect any donation through the tool your organization already uses.'
        ]
      }
    ],
    related: [
      { path: '/faq', label: 'FAQ', text: 'The money answer, in one line.' },
      { path: '/how-to-play', label: 'How to play', text: 'How the grid and the draw work.' },
      { path: '/terms', label: 'Terms', text: 'The rule that Quarter Score does not handle money.' }
    ],
    cta: {
      path: '/how-to-play',
      label: 'Read the rules first',
      note: 'Check your local rules before you invite anyone. Quarter Score never collects, holds, or pays out money.'
    }
  },
  'nba-squares': {
    id: 'nba-squares',
    path: '/nba-squares',
    title: 'NBA Squares — Quarter Score',
    description: 'NBA squares uses the same last-digit board as football. Create a free basketball game, share the link, and follow each quarter.',
    h1: 'NBA squares',
    eyebrow: 'After the football season',
    lede: 'Basketball squares use the same grid and the same last-digit rule. Scores are higher, quarters are shorter, and the group you already have can keep playing without learning a new game.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'What changes and what does not',
        paragraphs: [
          'You still have 100 squares, a name on each one, and digits 0 through 9 on the rows and columns. At the end of a quarter, the last digit of each score marks the square. A score of 28 counts as 8, the same way a football score of 17 counts as 7.',
          'Choose NBA when you create the game so the board is labeled for basketball. The historical football heatmap does not describe basketball scoring. Treat it as a football chart if you open it.'
        ]
      },
      {
        heading: 'Which games to pick',
        paragraphs: [
          'One marquee game is enough for a group text. A playoff series can be a board per game, not one board for the whole series, so each final score has a clear winner. Share the new link the morning of the game.'
        ]
      }
    ],
    related: [
      { path: '/how-to-play', label: 'How to play', text: 'The last-digit rule, written for football and true here too.' },
      { path: '/faq', label: 'FAQ', text: 'Accounts and money, which do not change by sport.' },
      { path: '/nfl-squares', label: 'NFL squares', text: 'The football version of this page.' }
    ],
    cta: {
      path: '/dashboard',
      label: 'Create an NBA board',
      note: 'Choose NBA as the sport. ' + MONEY_LINE
    }
  },
  terms: {
    id: 'terms',
    path: '/terms',
    title: 'Terms of Use — Quarter Score',
    description: 'Terms for using Quarter Score, a free football squares board. The site never collects, holds, or pays out pool money.',
    h1: 'Terms of use',
    eyebrow: 'Legal',
    lede: 'Quarter Score is a free board for organizing a squares game with friends and fans. These terms are the rules for using the site.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          'You can create a board, share its link, claim squares by name, draw digits, and record scores. The site is provided as-is, without a promise that it will always be available or error-free.',
          'Quarter Score never collects, holds, or pays out pool money. Any prize, contribution, or donation is between the people in your group. Hosts are responsible for following the law where they live, including rules on games of chance.'
        ]
      },
      {
        heading: 'Your board',
        paragraphs: [
          'Do not use the site for anything unlawful, and do not put someone else’s personal information on a square without a reason they would expect. Game links are secrets. Anyone with the link can view that board.',
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
      note: 'Last updated November 1, 2026.'
    }
  },
  privacy: {
    id: 'privacy',
    path: '/privacy',
    title: 'Privacy — Quarter Score',
    description: 'What Quarter Score stores: account details if you sign in, a guest name on your device, and the squares, scores, and settings on boards you join.',
    h1: 'Privacy',
    eyebrow: 'Legal',
    lede: 'Quarter Score stores what it needs to run a board. It does not sell personal information, and it never collects, holds, or pays out money.',
    published: '2026-11-01',
    sections: [
      {
        heading: 'What is stored',
        paragraphs: [
          'If you sign in, the account provider gives us an identifier and, when you allow it, your name, email, and photo. A guest can save a display name in a cookie on that device so the board can show it. You can clear that cookie in your browser.',
          'Boards store the game name, team names, the names typed onto squares, scores, and settings such as whether the board is locked. That information lives in Google Firebase Realtime Database and is visible to anyone with the game link.'
        ]
      },
      {
        heading: 'What we do not do',
        paragraphs: [
          'We do not sell personal information. We do not ask for payment card numbers. Analytics, when it is turned on, is cookieless and is not used to build an advertising profile. If a measurement id is not configured, analytics does not load.',
          'Hosting, sign-in, and the database are provided by Google Firebase. Their systems process the data required to deliver those services.'
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
      note: 'Last updated November 1, 2026.'
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
