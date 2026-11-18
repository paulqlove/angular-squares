import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

import { SeasonPassAdminService } from '../../../core/services/season-pass-admin.service';
import { ModalComponent } from '../modal/modal.component';

/**
 * Admin only: gifted Season Passes, opened from the profile menu's Season Passes item. A sheet on phones, a dialog from sm up.
 * Each page with the profile menu hosts it at page level, outside the header: the sticky header's stacking context would put the phone bars over it.
 */
@Component({
  selector: 'app-season-passes-dialog',
  imports: [FormsModule, ModalComponent, NgIconComponent],
  providers: [provideIcons({ heroXMark })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (admin.canManagePasses()) {
      <app-modal [open]="admin.dialogOpen()" labelledBy="season-passes-title" describedBy="season-passes-summary" size="lg" phone="sheet" extraClass="flex max-h-[85dvh] flex-col text-qs-ink" (dismissed)="admin.dialogOpen.set(false)">
        <div class="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-3 sm:px-7 sm:pt-6">
          <div class="min-w-0">
            <h2 id="season-passes-title" class="text-xl font-semibold">Season Passes</h2>
            <p id="season-passes-summary" class="mt-1 text-qs-muted">Gifted passes. Only your account sees this.</p>
          </div>
          <button type="button" class="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-qs-muted hover:bg-qs-panel-2 hover:text-qs-ink" aria-label="Close" (click)="admin.dialogOpen.set(false)">
            <ng-icon name="heroXMark" class="text-xl"></ng-icon>
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-7">
          <p id="gift-pass-label" class="qs-label mb-2 text-qs-muted">Gift a pass</p>
          <form class="grid grid-cols-[auto_1fr] gap-2 sm:grid-cols-[1fr_auto_auto]" aria-labelledby="gift-pass-label" (submit)="$event.preventDefault(); admin.grantSeasonPass()">
            <input type="email" name="giftEmail" [(ngModel)]="admin.newGiftEmail" placeholder="Email address" aria-label="Email address" class="qs-input col-span-2 sm:col-span-1" />
            <label class="flex min-h-11 items-center gap-1 rounded-btn border border-qs-line-strong bg-qs-panel-2 pr-3 focus-within:border-qs-ink">
              <input type="number" name="giftDays" [(ngModel)]="admin.newGiftDays" min="1" max="365" aria-label="Days" class="w-20 bg-transparent px-3 text-qs-ink focus:outline-none" />
              <span class="text-qs-muted">days</span>
            </label>
            <button type="submit" class="qs-btn qs-btn-primary px-6" [disabled]="admin.isGrantingPass() || !admin.newGiftEmail.trim()">
              {{ admin.isGrantingPass() ? 'Adding...' : 'Add' }}
            </button>
          </form>

          @if (admin.isLoadingGiftedPasses() && admin.giftedPasses().length === 0) {
            <div class="mt-6 h-20 animate-pulse rounded-card bg-qs-panel-2"></div>
          } @else if (admin.giftedPasses().length === 0) {
            <p class="py-6 text-center text-qs-muted">No gifted passes yet</p>
          } @else {
            <p class="qs-label mb-2 mt-6 text-qs-muted">{{ admin.giftedPasses().length }} gifted</p>
            <ul class="divide-y divide-qs-line overflow-hidden rounded-card border border-qs-line bg-qs-panel-2">
              @for (pass of admin.giftedPasses(); track pass.email) {
                <li class="flex min-h-14 items-center gap-2 py-1 pl-4 pr-1">
                  <span class="min-w-0 flex-1 break-all">{{ pass.email }}</span>
                  <button
                    type="button"
                    class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium transition-[filter] hover:brightness-110 disabled:cursor-default disabled:hover:brightness-100"
                    [class]="admin.isPassExpired(pass.expiresAt) ? 'bg-qs-warn-soft text-qs-warn' : 'bg-qs-ok-soft text-qs-ok'"
                    [disabled]="admin.hasNoExpiry(pass.expiresAt) || admin.updatingPassEmail() === pass.email"
                    [attr.title]="admin.hasNoExpiry(pass.expiresAt) ? 'This pass never expires' : 'Click to make this pass never expire'"
                    [attr.aria-label]="admin.hasNoExpiry(pass.expiresAt) ? pass.email + ': never expires' : 'Make the pass for ' + pass.email + ' never expire'"
                    (click)="admin.makePassPermanent(pass.email)"
                  >
                    {{ admin.formatExpiry(pass.expiresAt) }}
                  </button>
                  <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-qs-muted transition-colors hover:text-qs-warn" [attr.aria-label]="'Revoke the pass for ' + pass.email" title="Revoke pass" (click)="admin.revokePass(pass.email)">
                    <ng-icon name="heroXMark" class="text-lg"></ng-icon>
                  </button>
                </li>
              }
            </ul>
            <p class="mt-3 text-sm text-qs-muted">Tap a status to make that pass never expire.</p>
          }
        </div>
      </app-modal>
    }
  `
})
export class SeasonPassesDialogComponent {
  protected readonly admin: SeasonPassAdminService = inject(SeasonPassAdminService);
}
