import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowTopRightOnSquare } from '@ng-icons/heroicons/outline';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { GameData, GameService } from '../../core/services/game.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import { LegacyMoneySnapshot } from './legacy-money.model';

/**
 * Owner-only ledger. This file is loaded with import() after the allowlist check.
 * Non-owners never download it.
 */
@Component({
  selector: 'app-legacy-money-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroArrowTopRightOnSquare })],
  template: `
    @if (snapshot) {
    <section aria-labelledby="legacy-ledger-heading" class="rounded-xl border border-default bg-card p-4 sm:p-5">
      <h2 id="legacy-ledger-heading" class="text-lg font-bold text-heading">Host ledger</h2>
      <p class="mt-1 text-sm text-muted">Visible only to the board creator on the allowlist.</p>

      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="legacy-price" class="block text-sm font-medium text-label mb-2">Price per square</label>
          <div class="flex items-center gap-2">
            <span class="text-default" aria-hidden="true">$</span>
            <input
              id="legacy-price"
              type="number"
              min="0"
              class="w-full min-h-11 px-3 py-2 bg-input border border-input rounded-md text-default focus:outline-none focus:ring-2 focus:ring-secondary-500 disabled:opacity-50"
              [disabled]="!snapshot.canEdit || snapshot.isLocked"
              [ngModel]="priceDraft"
              (ngModelChange)="priceDraft = $event"
              (blur)="savePrice()"
            />
          </div>
        </div>
        <div>
          <label for="legacy-handle" class="block text-sm font-medium text-label mb-2">Venmo username</label>
          <input
            id="legacy-handle"
            type="text"
            class="w-full min-h-11 px-3 py-2 bg-input border border-input rounded-md text-default focus:outline-none focus:ring-2 focus:ring-secondary-500 disabled:opacity-50"
            [disabled]="!snapshot.canEdit"
            [ngModel]="handleDraft"
            (ngModelChange)="handleDraft = $event"
            (blur)="saveHandle()"
            placeholder="username"
          />
          @if (snapshot.venmoUsername) {
            <button
              type="button"
              class="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-sky-800 dark:text-sky-300 underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              (click)="askToLeave = true"
            >
              Open Venmo profile
              <ng-icon name="heroArrowTopRightOnSquare" class="text-base" aria-hidden="true"></ng-icon>
            </button>
          }
        </div>
      </div>

      <div class="mt-4">
        <div class="flex justify-between gap-3 text-sm text-default">
          <span>Collected: \${{ collected.toFixed(2) }}</span>
          <span>Outstanding: \${{ outstanding.toFixed(2) }}</span>
        </div>
        <div
          class="mt-2 h-2 bg-control rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          [attr.aria-valuenow]="percentCollected"
          [attr.aria-label]="'Collected ' + collected.toFixed(2) + ' of ' + snapshot.totalPot.toFixed(2)"
        >
          <div class="h-full bg-green-700" [style.width.%]="percentCollected"></div>
        </div>
      </div>

      <h3 class="mt-6 text-base font-bold text-heading">Quarter payouts</h3>
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        @for (quarter of quarters; track quarter) {
          <div class="rounded-lg border border-default p-3">
            <p class="font-medium text-heading">{{ quarterLabel(quarter) }}</p>
            <p class="text-sm text-muted">{{ snapshot.winners[quarter] || 'No winner yet' }}</p>
            <p class="mt-2 text-lg font-semibold text-default">\${{ payoutFor(quarter).toFixed(2) }}</p>
          </div>
        }
      </div>
      <p class="mt-3 text-default font-semibold">Total pot \${{ snapshot.totalPot.toFixed(2) }}</p>

      <h3 class="mt-6 text-base font-bold text-heading">Mark as paid</h3>
      <ul class="mt-3 space-y-2">
        @for (player of players; track player.name) {
          <li class="flex flex-col gap-2 rounded-lg bg-control p-3 sm:flex-row sm:items-center sm:justify-between">
            <span class="text-default">
              {{ player.name }}
              <span class="text-muted">({{ player.squares }} {{ player.squares === 1 ? 'square' : 'squares' }} — \${{ player.total.toFixed(2) }})</span>
            </span>
            <button
              type="button"
              class="min-h-11 rounded-full px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              [class.bg-green-100]="player.paid"
              [class.text-green-800]="player.paid"
              [class.bg-card]="!player.paid"
              [class.text-default]="!player.paid"
              [attr.aria-pressed]="player.paid"
              [disabled]="!snapshot.canEdit"
              (click)="togglePaid(player.name)"
            >
              {{ player.paid ? 'Paid' : 'Mark as Paid' }}
            </button>
          </li>
        }
      </ul>
    </section>

    @if (askToLeave) {
      <div class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true" aria-labelledby="leave-title">
        <div class="w-full max-w-md rounded-2xl bg-dialog p-6 shadow-xl">
          <h2 id="leave-title" class="text-lg font-bold text-heading">Leave site?</h2>
          <p class="mt-2 text-default">Continue to Venmo for {{ snapshot.venmoUsername }}.</p>
          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" class="min-h-11 px-4 rounded-lg bg-control text-default" (click)="askToLeave = false">Stay</button>
            <button type="button" class="min-h-11 px-4 rounded-lg bg-sky-800 text-white font-semibold" (click)="openHandle()">Continue to Venmo</button>
          </div>
        </div>
      </div>
    }
    }
  `
})
export class LegacyMoneyPanelComponent implements OnInit, OnDestroy {
  private gameService = inject(GameService);
  private authService = inject(AuthService);
  private sanitizationService = inject(SanitizationService);
  private subscription = new Subscription();

  snapshot: LegacyMoneySnapshot | null = null;
  priceDraft = 0;
  handleDraft = '';
  askToLeave = false;
  private seenGameId = '';

  readonly quarters = ['q1', 'q2', 'q3', 'q4'];
  private readonly quarterShares: Record<string, number> = { q1: 0.2, q2: 0.2, q3: 0.2, q4: 0.4 };

  ngOnInit(): void {
    this.subscription.add(this.gameService.currentGame$.subscribe(game => this.applyGame(game)));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private applyGame(game: GameData | null): void {
    if (!game?.id) {
      this.snapshot = null;
      return;
    }
    const user = this.authService.currentUser();
    const price = game.pricePerSquare || 0;
    const stats: LegacyMoneySnapshot['playerStats'] = {};
    let total = 0;
    Object.values(game.selectedSquares || {}).forEach(name => {
      if (!stats[name]) stats[name] = { squares: 0, total: 0 };
      stats[name].squares += 1;
      stats[name].total += price;
      total += price;
    });
    this.snapshot = {
      gameId: game.id,
      pricePerSquare: price,
      venmoUsername: game.venmoUsername || '',
      paidPlayers: game.paidPlayers || [],
      playerStats: stats,
      playerColors: game.playerColors || {},
      winners: game.winners || {},
      scores: game.scores,
      totalPot: total,
      quarterPayouts: this.quarterShares,
      isLocked: game.isLocked,
      canEdit: !!user && user.uid === game.ownerId,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam
    };
    if (this.seenGameId !== game.id) {
      this.seenGameId = game.id;
      this.priceDraft = price;
      this.handleDraft = game.venmoUsername || '';
      return;
    }
    if (typeof document === 'undefined' || document.activeElement?.id !== 'legacy-price') {
      this.priceDraft = price;
    }
    if (typeof document === 'undefined' || document.activeElement?.id !== 'legacy-handle') {
      this.handleDraft = game.venmoUsername || '';
    }
  }

  get players(): { name: string; squares: number; total: number; paid: boolean }[] {
    const ledger = this.snapshot;
    if (!ledger) return [];
    const paid = new Set(ledger.paidPlayers || []);
    return Object.entries(ledger.playerStats || {}).map(([name, stats]) => ({
      name,
      squares: stats.squares,
      total: stats.total,
      paid: paid.has(name)
    }));
  }

  get collected(): number {
    const ledger = this.snapshot;
    if (!ledger) return 0;
    const paid = new Set(ledger.paidPlayers || []);
    return Object.entries(ledger.playerStats || {})
      .filter(([name]) => paid.has(name))
      .reduce((sum, [, stats]) => sum + stats.total, 0);
  }

  get outstanding(): number {
    return Math.max(0, (this.snapshot?.totalPot || 0) - this.collected);
  }

  get percentCollected(): number {
    const pot = this.snapshot?.totalPot || 0;
    if (!pot) return 0;
    return Math.min(100, Math.round((this.collected / pot) * 100));
  }

  quarterLabel(quarter: string): string {
    const labels: Record<string, string> = {
      q1: '1st quarter',
      q2: '2nd quarter',
      q3: '3rd quarter',
      q4: 'Final'
    };
    return labels[quarter] || quarter;
  }

  payoutFor(quarter: string): number {
    const ledger = this.snapshot;
    if (!ledger) return 0;
    const share = ledger.quarterPayouts[quarter] ?? 0;
    return ledger.totalPot * share;
  }

  async savePrice(): Promise<void> {
    const ledger = this.snapshot;
    if (!ledger?.canEdit) return;
    const price = this.sanitizationService.validatePrice(this.priceDraft);
    this.priceDraft = price;
    if (price === ledger.pricePerSquare) return;
    await this.gameService.updateGame(ledger.gameId, { pricePerSquare: price });
  }

  async saveHandle(): Promise<void> {
    const ledger = this.snapshot;
    if (!ledger?.canEdit) return;
    const handle = this.cleanHandle(this.handleDraft);
    this.handleDraft = handle;
    if (handle === ledger.venmoUsername) return;
    await this.gameService.updateGame(ledger.gameId, { venmoUsername: handle });
  }

  async togglePaid(name: string): Promise<void> {
    const ledger = this.snapshot;
    if (!ledger?.canEdit) return;
    const next = new Set(ledger.paidPlayers || []);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    await this.gameService.updateGame(ledger.gameId, { paidPlayers: Array.from(next) });
  }

  private cleanHandle(value: string): string {
    if (!value) return '';
    return value.replace(/[^a-zA-Z0-9@_-]/g, '').substring(0, 50);
  }

  openHandle(): void {
    const handle = (this.snapshot?.venmoUsername || '').replace('@', '');
    this.askToLeave = false;
    if (!handle) return;
    window.open(`https://venmo.com/${handle}`, '_blank', 'noopener');
  }
}
