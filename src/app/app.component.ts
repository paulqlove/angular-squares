import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ToastComponent } from './components/ui/toast/toast.component';
import { WalkthroughComponent } from './components/ui/walkthrough/walkthrough.component';
import { AnalyticsService } from './core/services/analytics.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ToastComponent,
    WalkthroughComponent
  ],
  template: `
    @if (authService.isLoading()) {
      <div class="fixed inset-0 bg-page flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    } @else {
      <router-outlet></router-outlet>
    }
    <app-toast></app-toast>
    <app-walkthrough></app-walkthrough>
  `
})
export class AppComponent implements OnDestroy {
  protected authService = inject(AuthService);

  private analytics = inject(AnalyticsService);
  private meta = inject(Meta);
  private router = inject(Router);
  private navigationSub: Subscription;

  constructor() {
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
    if (path === '/game' || path.startsWith('/game/')) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      return;
    }
    if (this.meta.getTag('name="robots"')) {
      this.meta.removeTag('name="robots"');
    }
  }
}
