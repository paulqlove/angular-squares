import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { PageCta, RelatedLink } from './marketing-pages';
import {
  BINGO_FREE,
  PARTY_FAQS,
  PRINT_CARD_COUNT,
  PROP_QUESTIONS,
  bingoCard,
  randomSeed
} from './party-games';
import { ReadingEndComponent, ReadingHeaderComponent, ReadingPageComponent, ReadingSectionComponent } from './reading-layout.components';

type PrintPart = 'props' | 'bingo';

const PATH = '/super-bowl-party-games';

/** Seeds for the first card and the first printed set, fixed so the prerendered page and the browser agree. */
const FIRST_SEED = 2027;
const FIRST_PRINT_SEEDS = Array.from({ length: PRINT_CARD_COUNT }, (_, index) => 214 + index * 97);

@Component({
  selector: 'app-party-games',
  imports: [RouterLink, ReadingPageComponent, ReadingHeaderComponent, ReadingSectionComponent, ReadingEndComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .bingo-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 1px;
    }
    .bingo-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      text-align: center;
      font-size: 0.6875rem;
      line-height: 1.2;
      overflow-wrap: anywhere;
      hyphens: auto;
    }
    @media (min-width: 640px) {
      .bingo-cell {
        padding: 0.5rem;
        font-size: 0.8125rem;
      }
    }
    /* Full width of the page on desktop: wider than tall, so the card doesn't run a screen and a half down. */
    @media (min-width: 1024px) {
      .bingo-cell {
        aspect-ratio: 4 / 3;
        font-size: 0.9375rem;
      }
    }
    @media print {
      /* Light-theme ink, so a dark-theme page doesn't print pale text on white. */
      .party-sheet {
        --qs-ink: #0f172a;
        --qs-muted: #5b6070;
        --qs-line: #8b909d;
        color: #000;
        background: #fff !important;
        border: 0 !important;
        padding: 0 !important;
      }
      .prop-list {
        display: block !important;
        columns: 2;
        column-gap: 0.4in;
      }
      .prop-list > li {
        break-inside: avoid;
        padding: 0.06in 0 !important;
        border: 0 !important;
        font-size: 9.5pt;
      }
      .print-card {
        break-inside: avoid;
        padding-bottom: 0.35in;
      }
      .print-card:nth-child(2n) {
        break-after: page;
      }
      .print-card .bingo-grid {
        gap: 0;
        border-top: 1pt solid #000;
        border-left: 1pt solid #000;
        width: 4.6in;
      }
      .print-card .bingo-cell {
        aspect-ratio: 1;
        border-right: 1pt solid #000;
        border-bottom: 1pt solid #000;
        background: #fff !important;
        color: #000 !important;
        font-size: 8.5pt;
        padding: 0.05in;
      }
    }
  `,
  template: `
    <app-reading-page [breadcrumbs]="breadcrumbs">
      <app-reading-header eyebrow="Super Bowl LXI" title="Super Bowl party games and ideas 2027"
        lede="Party games and ideas for the whole room on February 14: squares, a prop sheet, commercial bingo and easy ideas for guests who came for the snacks. All free, all printable, all for points.">
        <nav hero aria-label="Games on this page" class="no-print">
          <p class="qs-label text-qs-muted">The games</p>
          <ol class="mt-3 divide-y divide-qs-line border-y border-qs-line">
            @for (game of games; track game.id; let index = $index) {
              <li>
                <a [routerLink]="path" [fragment]="game.id" class="group grid min-h-11 grid-cols-[2.5rem_1fr] items-center py-3">
                  <span class="qs-label text-qs-accent">0{{ index + 1 }}</span>
                  <span class="text-[0.9375rem] font-medium text-qs-ink group-hover:text-qs-accent">{{ game.label }}</span>
                </a>
              </li>
            }
          </ol>
        </nav>
      </app-reading-header>

      <app-reading-section class="no-print" heading="Start with Super Bowl squares" headingId="squares">
        <p>Squares is the game most parties already know. Everyone claims a square on a 10 by 10 grid, the digits 0 through 9 are drawn for each team, and the last digit of each score picks a winner every quarter. It takes a minute to explain and keeps the whole room watching to the end.</p>
        <p>Make the board now, before the matchup is set, and send one link. Guests claim a square by typing a name, with no account. On game day, put it on the TV and the live score finds each quarter’s winner. The full rules are on <a routerLink="/super-bowl-squares" class="font-medium text-qs-accent underline underline-offset-2">Super Bowl squares</a>.</p>
        <a [routerLink]="signedIn() ? '/dashboard' : '/create'" class="qs-btn qs-btn-primary">Start a free board</a>
      </app-reading-section>

      <app-reading-section heading="Printable Super Bowl prop sheet" headingId="prop-sheet">
        <p class="no-print">Hand one out as people arrive. Everyone circles one answer per line before kickoff. Each right answer is a point, and the total score guess breaks a tie. Some groups call this a prop bet sheet. This one is played for points, with no money involved.</p>
        <button type="button" class="qs-btn qs-btn-secondary no-print" (click)="print('props')">Print prop sheet</button>

        <div wide class="party-sheet rounded-card border border-qs-line bg-qs-panel p-5 sm:p-8"
          [class.print-target]="printing() === 'props'">
          <div class="hidden print:flex items-center justify-between mb-3">
            <img src="assets/brand/lockup-horizontal.svg" alt="QuarterScore" width="192" height="24" class="h-6 w-auto">
            <span class="text-xs">quarterscore.com</span>
          </div>
          <div class="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
            <h3 class="text-lg font-semibold text-qs-ink">Super Bowl prop sheet</h3>
            <p class="text-sm text-qs-muted">Name: ______________________</p>
          </div>
          <ol class="prop-list mt-5 grid gap-x-10 sm:grid-cols-2">
            @for (prop of props; track prop.question; let index = $index) {
              <li class="border-t border-qs-line py-3 text-[0.9375rem] leading-snug">
                <p class="font-medium text-qs-ink"><span class="text-qs-muted">{{ index + 1 }}.</span> {{ prop.question }}</p>
                <p class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-qs-muted">
                  @for (option of prop.options; track option) {
                    <span><span aria-hidden="true">○</span> {{ option }}</span>
                  }
                </p>
              </li>
            }
          </ol>
          <p class="mt-4 border-t border-qs-line pt-3 text-[0.9375rem] font-medium text-qs-ink">Tiebreaker: total points in the game ______</p>
          <p class="mt-2 text-xs text-qs-muted">One point per right answer. Played for points and bragging rights only.</p>
        </div>
      </app-reading-section>

      <app-reading-section heading="Super Bowl commercial bingo cards" headingId="commercial-bingo">
        <p class="no-print">Made for the guests who are there for the ads. Mark a square when a commercial shows it. Five in a row across, down or corner to corner wins. Tap squares to mark them on your phone, or print a stack of free bingo cards, each one different.</p>
        <div class="no-print flex flex-wrap gap-3">
          <button type="button" class="qs-btn qs-btn-secondary" (click)="shuffle()">Shuffle</button>
          <button type="button" class="qs-btn qs-btn-secondary" (click)="print('bingo')">Print {{ printCount }} cards</button>
        </div>

        <div wide class="no-print">
          <div class="bingo-grid overflow-hidden rounded-card border border-qs-line bg-qs-line" role="group" aria-label="Commercial bingo card">
            @for (cell of card(); track $index) {
              @if (cell === free) {
                <div class="bingo-cell bg-qs-accent font-semibold text-qs-on-accent">{{ cell }}</div>
              } @else {
                <button type="button" class="bingo-cell transition-colors"
                  [class.bg-qs-panel]="!marked().has($index)" [class.text-qs-ink]="!marked().has($index)"
                  [class.bg-qs-accent]="marked().has($index)" [class.text-qs-on-accent]="marked().has($index)"
                  [attr.aria-pressed]="marked().has($index)" (click)="toggle($index)">{{ cell }}</button>
              }
            }
          </div>
        </div>

        <div wide class="party-sheet hidden print:block" [class.print-target]="printing() === 'bingo'">
          @for (sheet of printCards(); track $index) {
            <div class="print-card">
              <div class="flex w-[4.6in] items-center justify-between">
                <img src="assets/brand/lockup-horizontal.svg" alt="QuarterScore" width="128" height="16" class="h-4 w-auto">
                <span class="text-xs">quarterscore.com</span>
              </div>
              <p class="mb-2 mt-2 text-sm font-semibold">Super Bowl commercial bingo</p>
              <div class="bingo-grid">
                @for (cell of sheet; track $index) {
                  <div class="bingo-cell" [class.font-semibold]="cell === free">{{ cell }}</div>
                }
              </div>
            </div>
          }
        </div>
      </app-reading-section>

      <app-reading-section class="no-print" heading="Party ideas for people who don’t watch football" headingId="non-fan-games">
        <ul class="space-y-3">
          <li><strong class="text-qs-ink">Halftime picks:</strong> before the show, everyone writes down the opening song, how many outfits the headliner wears and whether a guest shows up. Closest guesses win.</li>
          <li><strong class="text-qs-ink">Ad ballot:</strong> rate every commercial from 1 to 5 in a shared note. Crown the night’s best ad after the final whistle.</li>
          <li><strong class="text-qs-ink">Snack draft:</strong> before kickoff, each guest drafts three dishes from the table. The first person whose three dishes are empty wins.</li>
          <li><strong class="text-qs-ink">Timeout trivia:</strong> read three questions at each timeout, on any topic. Keep a running score on a napkin.</li>
          <li><strong class="text-qs-ink">Kids’ squares:</strong> a 25-square board gives each kid several squares, so everyone has a shot every quarter.</li>
        </ul>
      </app-reading-section>

      <app-reading-section class="no-print" heading="Questions people ask" headingId="faq">
        <div class="divide-y divide-qs-line !space-y-0">
          @for (entry of faqs; track entry.question) {
            <div class="py-6 first:pt-0">
              <h3 class="text-lg font-semibold leading-snug text-qs-ink">{{ entry.question }}</h3>
              <p class="mt-2">{{ entry.answer }}</p>
            </div>
          }
        </div>
      </app-reading-section>

      <app-reading-end class="no-print" [related]="related" [cta]="cta"></app-reading-end>

      <p class="no-print mt-12 max-w-[40rem] text-sm leading-relaxed text-qs-muted lg:ml-[17rem]" role="note">QuarterScore is not affiliated with, endorsed by, or sponsored by the NFL. Event names are used only to describe the game.</p>
    </app-reading-page>
  `
})
export class PartyGamesComponent {
  private auth = inject(AuthService);
  private seo = inject(SeoService);

  public readonly breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Super Bowl party games and ideas', path: PATH }
  ];
  public readonly cta: PageCta = {
    path: '/create',
    label: 'Create your Super Bowl board',
    note: 'QuarterScore never collects, holds, or pays out money. Every game here is for points and bragging rights.'
  };
  public readonly faqs = PARTY_FAQS;
  public readonly free = BINGO_FREE;
  public readonly games = [
    { id: 'squares', label: 'Super Bowl squares' },
    { id: 'prop-sheet', label: 'Printable prop sheet' },
    { id: 'commercial-bingo', label: 'Commercial bingo' },
    { id: 'non-fan-games', label: 'Ideas for non-fans' }
  ];
  public readonly path = PATH;
  public readonly printCount = PRINT_CARD_COUNT;
  public readonly props = PROP_QUESTIONS;
  public readonly related: RelatedLink[] = [
    { path: '/super-bowl-squares', label: 'Super Bowl squares', text: 'Rules, points by quarter and the best numbers.' },
    { path: '/printable-football-squares', label: 'Printable squares board', text: 'A blank 100-square grid for the wall.' },
    { path: '/football-squares-on-tv', label: 'Football squares on TV', text: 'Put the live board on the big screen.' },
    { path: '/nfl-squares', label: 'NFL squares', text: 'Practice the same board on any game before February.' }
  ];

  public readonly card = computed(() => bingoCard(this.cardSeed()));
  public readonly marked = signal<ReadonlySet<number>>(new Set());
  public readonly printCards = computed(() => this.printSeeds().map(bingoCard));
  public readonly printing = signal<PrintPart | null>(null);
  public readonly signedIn = computed(() => {
    const user = this.auth.currentUser();
    return !!user && !user.isGuest;
  });

  private cardSeed = signal(FIRST_SEED);
  private printSeeds = signal<number[]>(FIRST_PRINT_SEEDS);

  constructor() {
    this.seo.apply({
      title: 'Super Bowl Party Games and Ideas 2027: Free Printables — QuarterScore',
      description: 'Free Super Bowl party games and ideas for 2027: an online squares board, a printable prop sheet, commercial bingo cards and easy party ideas for people who don’t watch football.',
      path: PATH,
      headline: 'Super Bowl party games and ideas 2027',
      published: '2026-11-18',
      breadcrumbs: this.breadcrumbs,
      extraJsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: PARTY_FAQS.map(entry => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer }
        }))
      }]
    });
  }

  /** Print only the prop sheet or a fresh stack of bingo cards, not the page around it. */
  public print(part: PrintPart): void {
    if (part === 'bingo') {
      this.printSeeds.set(Array.from({ length: PRINT_CARD_COUNT }, randomSeed));
    }
    this.printing.set(part);
    const root = document.documentElement;
    root.classList.add('print-party');
    window.addEventListener('afterprint', () => {
      root.classList.remove('print-party');
      this.printing.set(null);
    }, { once: true });
    setTimeout(() => window.print(), 50);
  }

  /** A new card for this screen, with no squares marked. */
  public shuffle(): void {
    this.cardSeed.set(randomSeed());
    this.marked.set(new Set());
  }

  public toggle(index: number): void {
    const next = new Set(this.marked());
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    this.marked.set(next);
  }
}
