import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SiteHeaderComponent } from '../../components/ui/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer.component';

@Component({
    selector: 'app-content-shell',
    imports: [SiteHeaderComponent, SiteFooterComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-qs-panel focus:px-4 focus:py-2 focus:text-qs-ink"
    >
      Skip to content
    </a>
    <div class="flex min-h-screen flex-col bg-qs-bg overflow-x-hidden">
      <app-site-header heading="p" position="headroom" nav="guides"></app-site-header>

      <main id="main" class="flex-1 px-4 sm:px-8 py-8 sm:py-12 overflow-x-hidden">
        <div class="mx-auto max-w-5xl overflow-x-hidden">
          <ng-content></ng-content>
        </div>
      </main>

      <app-site-footer></app-site-footer>
    </div>
  `
})
export class ContentShellComponent {}
