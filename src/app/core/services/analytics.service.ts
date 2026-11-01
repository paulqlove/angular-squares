import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import type { Analytics } from 'firebase/analytics';
import { filter, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Cookieless GA4 via Firebase Analytics.
 * The SDK is imported only after first paint, and only in production builds
 * that have a measurementId. It is not part of the initial bundle.
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private zone = inject(NgZone);

  private analytics: Analytics | null = null;
  private logEvent: typeof import('firebase/analytics').logEvent | null = null;
  private navigationSub: Subscription | null = null;
  private pendingViews: string[] = [];
  private started = false;

  start(): void {
    if (this.started || !this.canRun()) {
      return;
    }
    this.started = true;
    this.navigationSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => this.onNavigation(event.urlAfterRedirects));

    this.zone.runOutsideAngular(() => this.schedule());
  }

  /**
   * Send a GA4 event when Analytics has loaded.
   * No-ops in dev, before the SDK is ready, or when no measurementId is set.
   */
  track(name: string, params?: Record<string, string | number | boolean>): void {
    if (!this.analytics || !this.logEvent) {
      return;
    }
    this.logEvent(this.analytics, name, params);
  }

  private canRun(): boolean {
    return environment.production
      && isPlatformBrowser(this.platformId)
      && !!environment.firebase.measurementId;
  }

  private async enable(): Promise<void> {
    try {
      const measurementId = environment.firebase.measurementId;
      if (!measurementId) {
        return;
      }

      const [{ getApps, initializeApp }, analyticsMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/analytics')
      ]);

      if (!await analyticsMod.isSupported()) {
        return;
      }

      // Consent defaults must be set before Analytics initializes.
      // analytics_storage denied keeps GA4 on cookieless pings.
      analyticsMod.setConsent({
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied'
      });

      const app = getApps().length > 0
        ? getApps()[0]
        : initializeApp({ ...environment.firebase, measurementId });

      this.logEvent = analyticsMod.logEvent;
      this.analytics = analyticsMod.initializeAnalytics(app, {
        config: {
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false
        }
      });

      const queued = this.pendingViews.splice(0);
      for (const url of queued) {
        this.send(url);
      }
    } catch (error) {
      console.warn('[Analytics] GA4 did not start', error);
    }
  }

  private onNavigation(url: string): void {
    if (this.analytics) {
      this.send(url);
      return;
    }
    this.pendingViews.push(url);
  }

  private schedule(): void {
    const run = () => {
      void this.enable();
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 4000 });
      return;
    }
    if (document.readyState === 'complete') {
      setTimeout(run);
      return;
    }
    window.addEventListener('load', run, { once: true });
  }

  private send(url: string): void {
    if (!this.analytics || !this.logEvent) {
      return;
    }
    const path = url || '/';
    this.logEvent(this.analytics, 'page_view', {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
      page_title: document.title
    });
  }
}
