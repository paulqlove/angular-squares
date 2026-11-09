import { Component, inject, OnDestroy, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ConfirmDialogComponent } from './components/ui/confirm-dialog/confirm-dialog.component';
import { ToastComponent } from './components/ui/toast/toast.component';
import { WalkthroughComponent } from './components/ui/walkthrough/walkthrough.component';
import { RolePreviewSwitcherComponent } from './components/ui/role-preview-switcher/role-preview-switcher.component';
import { AnalyticsService } from './core/services/analytics.service';
import { AuthService } from './core/services/auth.service';
import { captureFirstTouch } from './core/utils/first-touch';

@Component({
    selector: 'app-root',
    imports: [
    RouterOutlet,
    ToastComponent,
    ConfirmDialogComponent,
    WalkthroughComponent,
    RolePreviewSwitcherComponent
],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    @if (authService.isLoading()) {
      <div class="fixed inset-0 bg-page flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-qs-accent border-t-transparent"></div>
      </div>
    } @else {
      <router-outlet></router-outlet>
    }
    <app-toast></app-toast>
    <app-confirm-dialog></app-confirm-dialog>
    <app-walkthrough></app-walkthrough>
    <app-role-preview-switcher></app-role-preview-switcher>
  `
})
export class AppComponent implements OnDestroy {
  protected authService = inject(AuthService);

  private analytics = inject(AnalyticsService);
  private meta = inject(Meta);
  private router = inject(Router);
  private navigationSub: Subscription;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      captureFirstTouch();
    }
    this.navigationSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => this.syncRobotsMeta(event.urlAfterRedirects));
    this.analytics.start();
  }

  ngOnDestroy(): void {
    this.navigationSub.unsubscribe();
  }

  private syncRobotsMeta(url: string): void {
    const path = url.split(/[?#]/)[0];
    if (path === '/create' || path === '/game' || path.startsWith('/game/') || path.startsWith('/tv/')) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      return;
    }
    if (this.meta.getTag('name="robots"')) {
      this.meta.removeTag('name="robots"');
    }
  }
}
