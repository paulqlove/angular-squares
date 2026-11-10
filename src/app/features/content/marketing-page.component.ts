import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';
import { MarketingPage, getMarketingPage, pageBreadcrumbs } from './marketing-pages';

@Component({
    selector: 'app-marketing-page',
    imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <app-content-shell>
      <app-breadcrumbs [items]="breadcrumbs" [column]="true"></app-breadcrumbs>
      <article class="qs-column">
        @if (page.notice) {
          <p class="mb-6 rounded-xl border border-qs-line bg-qs-panel p-4 text-sm leading-relaxed text-qs-ink" role="note">
            {{ page.notice }}
          </p>
        }
        <header>
          <p class="qs-eyebrow">
            {{ page.eyebrow }}
          </p>
          <h1 class="qs-title mt-3 text-4xl sm:text-5xl">
            {{ page.h1 }}
          </h1>
          <p class="mt-5 text-xl leading-snug text-qs-muted">{{ page.lede }}</p>
        </header>

        @if (page.disclaimer) {
          <aside class="mt-8 rounded-xl border border-qs-line bg-qs-panel p-4 text-sm leading-relaxed text-qs-ink" role="note">
            <p class="font-semibold text-qs-ink">Before you start</p>
            <p class="mt-2">{{ page.disclaimer }}</p>
          </aside>
        }

        @if (page.steps) {
          <ol class="mt-12 space-y-6 sm:mt-16">
            @for (step of page.steps; track step.name; let index = $index) {
              <li class="flex gap-4">
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-qs-accent text-base font-bold text-qs-on-accent" aria-hidden="true">
                  {{ index + 1 }}
                </span>
                <div>
                  <h2 class="text-lg font-semibold text-qs-ink">{{ step.name }}</h2>
                  <p class="mt-2 text-[1.0625rem] leading-[1.7] text-qs-ink">{{ step.text }}</p>
                </div>
              </li>
            }
          </ol>
        }

        @if (page.faqs) {
          <section class="mt-12 sm:mt-16" aria-labelledby="faq-heading">
            <h2 id="faq-heading" class="text-2xl font-semibold leading-tight tracking-tight sm:text-[1.75rem]">Questions people ask</h2>
            <div class="mt-6 divide-y divide-qs-line border-t border-qs-line">
              @for (entry of page.faqs; track entry.question) {
                <div class="py-6">
                  <h3 class="text-lg font-semibold text-qs-ink">{{ entry.question }}</h3>
                  <p class="mt-2 text-[1.0625rem] leading-[1.7] text-qs-ink">{{ entry.answer }}</p>
                </div>
              }
            </div>
          </section>
        }

        @for (section of page.sections; track section.heading) {
          <section class="mt-12 sm:mt-16">
            <h2 class="text-2xl font-semibold leading-tight tracking-tight text-qs-ink sm:text-[1.75rem]">{{ section.heading }}</h2>
            @for (paragraph of section.paragraphs; track paragraph) {
              <p class="mt-4 text-[1.0625rem] leading-[1.7] text-qs-ink" [innerHTML]="rich(paragraph)"></p>
            }
            @if (section.bullets) {
              <ul class="mt-4 list-disc space-y-2 pl-5 text-[1.0625rem] leading-[1.7] text-qs-ink">
                @for (bullet of section.bullets; track bullet) {
                  <li [innerHTML]="rich(bullet)"></li>
                }
              </ul>
            }
            @if (section.html) {
              <div class="mt-4" [innerHTML]="trustHtml(section.html)"></div>
            }
          </section>
        }

        <section class="mt-12 sm:mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" class="text-2xl font-semibold leading-tight tracking-tight text-qs-ink sm:text-[1.75rem]">Keep going</h2>
          <ul class="mt-4 grid gap-3 sm:grid-cols-2">
            @for (link of page.related; track link.path) {
              <li>
                <a
                  [routerLink]="link.path"
                  [fragment]="link.fragment"
                  class="block min-h-11 rounded-xl border border-qs-line bg-qs-panel p-4 hover:bg-qs-panel-2"
                >
                  <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent dark:decoration-qs-accent/40">
                    {{ link.label }}
                  </span>
                  <span class="mt-1 block text-sm text-qs-muted">{{ link.text }}</span>
                </a>
              </li>
            }
          </ul>
        </section>

        <section class="mt-10 rounded-2xl bg-qs-accent px-5 py-6 text-qs-on-accent">
          <a
            [routerLink]="signedIn() ? '/dashboard' : page.cta.path"
            class="qs-btn qs-btn-ink"
          >
            {{ signedIn() && page.cta.path === '/create' ? 'Dashboard' : page.cta.label }}
          </a>
          <p class="mt-3 text-sm leading-relaxed text-qs-on-accent">{{ page.cta.note }}</p>
        </section>

        @if (page.disclaimer) {
          <aside class="mt-8 rounded-xl border border-qs-line bg-qs-panel p-4 text-sm leading-relaxed text-qs-ink" role="note">
            <p>{{ page.disclaimer }}</p>
          </aside>
        }
      </article>
    </app-content-shell>
  `
})
export class MarketingPageComponent {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private seo = inject(SeoService);
  private auth = inject(AuthService);

  public readonly signedIn = computed(() => {
    const user = this.auth.currentUser();
    return !!user && !user.isGuest;
  });

  public readonly page: MarketingPage = getMarketingPage(this.route.snapshot.data['pageId']);
  public readonly breadcrumbs = pageBreadcrumbs(this.page);
  private htmlCache = new Map<string, SafeHtml>();

  /** Plain page text with **bold** for button and menu names. Everything else is escaped. */
  public rich(text: string): SafeHtml {
    const key = `rich:${text}`;
    if (!this.htmlCache.has(key)) {
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      this.htmlCache.set(key, this.sanitizer.bypassSecurityTrustHtml(escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')));
    }
    return this.htmlCache.get(key)!;
  }

  public trustHtml(html: string): SafeHtml {
    if (!this.htmlCache.has(html)) {
      this.htmlCache.set(html, this.sanitizer.bypassSecurityTrustHtml(html));
    }
    return this.htmlCache.get(html)!;
  }

  constructor() {
    const extra = [];
    if (this.page.faqs) {
      extra.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: this.page.faqs.map(entry => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: entry.answer
          }
        }))
      });
    }
    if (this.page.steps) {
      extra.push({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: this.page.h1,
        description: this.page.description,
        step: this.page.steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text
        }))
      });
    }

    this.seo.apply({
      title: this.page.title,
      description: this.page.description,
      path: this.page.path,
      headline: this.page.h1,
      published: this.page.published,
      breadcrumbs: this.breadcrumbs,
      extraJsonLd: extra
    });
  }
}
