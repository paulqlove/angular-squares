import { Component, ChangeDetectionStrategy, OnInit, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';
import { AuthService } from '../../core/services/auth.service';
import { clearCreateDraft, isPendingAutoSubmit, loadCreateDraft, saveCreateDraft } from '../../core/utils/create-game-draft';
import { CreateGameFormComponent, CreateGameSubmit } from './create-game-form.component';

/**
 * Set up a board before signing in. Pressing Create opens the usual sign-in dialog; the dashboard
 * then finishes the create from the saved entries (see openCreateModalDirect there).
 */
@Component({
  selector: 'app-create-game',
  imports: [RouterLink, AppHeaderComponent, AuthModalComponent, CreateGameFormComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="min-h-screen bg-qs-bg text-qs-ink">
      <app-shared-header heading="p">
        <a routerLink="/" class="qs-btn qs-btn-ghost">Home</a>
      </app-shared-header>

      <main class="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <div class="flex flex-col overflow-hidden rounded-card border border-qs-line bg-qs-panel shadow-pop">
          <div class="border-b border-qs-line px-6 pb-5 pt-6">
            <p class="qs-eyebrow">New game</p>
            <h1 class="qs-title mt-2 text-3xl">Set up your <span class="text-qs-accent">board</span></h1>
          </div>
          <app-create-game-form (cancelled)="goHome()" (submitted)="onSubmit($event)"></app-create-game-form>
        </div>
      </main>
    </div>

    <app-auth-modal
      [isOpen]="showAuthModal()"
      mode="host"
      (authenticated)="onAuthenticated()"
      (closed)="onAuthClosed()">
    </app-auth-modal>
  `
})
export class CreateGameComponent implements OnInit {
  showAuthModal = signal(false);

  private authService = inject(AuthService);
  private router = inject(Router);
  private title = inject(Title);

  constructor() {
    // Google sign-in swaps this whole page for a loading screen and brings it back as a new, blank copy,
    // so the sign-in dialog's own "signed in" signal is lost. Watch the account instead: as soon as a
    // host is signed in and the visitor had pressed Create, hand the saved entries to the dashboard.
    effect(() => {
      if (this.authService.canCreateGame() && isPendingAutoSubmit(loadCreateDraft())) {
        console.info('[create-flow] /create: signed in with a pending create, going to /dashboard');
        void this.router.navigate(['/dashboard']);
      }
    });
  }

  ngOnInit(): void {
    this.title.setTitle('Create a football squares game | QuarterScore');
  }

  goHome(): void {
    void this.router.navigate(['/']);
  }

  onAuthClosed(): void {
    console.info('[create-flow] /create: sign-in dialog closed', { signedIn: this.authService.canCreateGame() });
    this.showAuthModal.set(false);
    // Signed in already: the dashboard is about to use the draft.
    if (!this.authService.canCreateGame()) clearCreateDraft();
  }

  onAuthenticated(): void {
    console.info('[create-flow] /create: authenticated', { canCreate: this.authService.canCreateGame(), draftSaved: !!loadCreateDraft() });
    // A guest is "authenticated" but cannot host: leave the dialog open for a real sign-in.
    if (!this.authService.canCreateGame()) return;
    this.showAuthModal.set(false);
    console.info('[create-flow] /create: going to /dashboard');
    void this.router.navigate(['/dashboard']);
  }

  onSubmit(submit: CreateGameSubmit): void {
    saveCreateDraft({ ...submit.draft, autoSubmit: true });
    console.info('[create-flow] /create: draft saved, opening sign-in', { saved: !!loadCreateDraft(), nameLength: submit.draft.name.length });
    this.showAuthModal.set(true);
  }
}
