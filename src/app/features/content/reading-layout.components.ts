import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BreadcrumbItem } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';
import { PageCta, RelatedLink } from './marketing-pages';

/** Site shell, a 64rem page and the breadcrumb trail. Every reading page starts here. */
@Component({
  selector: 'app-reading-page',
  imports: [ContentShellComponent, BreadcrumbsComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-content-shell>
      <div class="mx-auto max-w-[64rem]">
        <app-breadcrumbs [items]="breadcrumbs()"></app-breadcrumbs>
        <article><ng-content></ng-content></article>
      </div>
    </app-content-shell>
  `
})
export class ReadingPageComponent {
  breadcrumbs = input.required<BreadcrumbItem[]>();
}

/** Display headline, one line of intro, and an optional visual (`hero`) or action (`actions`). */
@Component({
  selector: 'app-reading-header',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'grid gap-12 lg:has-[>[hero]]:grid-cols-[minmax(0,1fr)_25rem] lg:has-[>[hero]]:items-center lg:has-[>[hero]]:gap-16' },
  template: `
    <div class="reading-copy">
      <p class="qs-eyebrow">{{ eyebrow() }}</p>
      <h1 class="qs-title mt-5 text-[clamp(2.5rem,5.6vw,4.25rem)] leading-[1.02] tracking-[-0.04em]">{{ title() }}</h1>
      <p class="mt-6 max-w-[34rem] text-xl leading-[1.5] text-qs-muted">{{ lede() }}</p>
      <ng-content select="[actions]"></ng-content>
    </div>
    <ng-content select="[hero]"></ng-content>
  `
})
export class ReadingHeaderComponent {
  eyebrow = input.required<string>();
  title = input.required<string>();
  lede = input.required<string>();
}

/**
 * One section: the heading in a margin column, the copy beside it. Something that needs the full width
 * (a table, a board) goes in an element marked `wide`; it spans both columns underneath.
 */
@Component({
  selector: 'app-reading-section',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'reading-section mt-20 grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-6 border-t border-qs-line pt-8 lg:grid-cols-[14rem_minmax(0,1fr)]' },
  template: `
    <h2 [id]="headingId()" class="text-[1.375rem] font-semibold leading-tight tracking-tight text-qs-ink">{{ heading() }}</h2>
    <div class="qs-body max-w-[40rem] space-y-4 text-[1.0625rem] leading-[1.7] empty:hidden"><ng-content></ng-content></div>
    <ng-content select="[wide]"></ng-content>
  `
})
export class ReadingSectionComponent {
  heading = input.required<string>();
  headingId = input<string | null>(null);
}

/** "Keep going" links, then one sentence and the main button. */
@Component({
  selector: 'app-reading-end',
  imports: [RouterLink, ReadingSectionComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'block' },
  template: `
    <app-reading-section heading="Keep going" headingId="related-heading">
      <ul class="space-y-6">
        @for (link of related(); track link.path) {
          <li>
            <a [routerLink]="link.path" [fragment]="link.fragment" class="group block min-h-11">
              <span class="font-semibold text-qs-ink group-hover:text-qs-accent">{{ link.label }}</span>
              <span class="mt-1 block text-[0.9375rem] leading-[1.6] text-qs-muted">{{ link.text }}</span>
            </a>
          </li>
        }
      </ul>
    </app-reading-section>
    <section class="mt-20 grid gap-x-16 border-t border-qs-line pt-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <div class="max-w-[40rem] lg:col-start-2">
        <p class="qs-body text-[1.0625rem] leading-[1.7]">{{ cta().note }}</p>
        <a [routerLink]="signedIn() ? '/dashboard' : cta().path" class="qs-btn qs-btn-primary mt-6">
          {{ signedIn() && cta().path === '/create' ? 'Dashboard' : cta().label }}
        </a>
      </div>
    </section>
  `
})
export class ReadingEndComponent {
  related = input.required<RelatedLink[]>();
  cta = input.required<PageCta>();
  private auth = inject(AuthService);
  protected signedIn = computed(() => {
    const user = this.auth.currentUser();
    return !!user && !user.isGuest;
  });
}
