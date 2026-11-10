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
      <div class="mx-auto max-w-[64rem]">
        <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
        <article>
          <header class="grid gap-12" [class]="page.heroHtml ? 'lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center lg:gap-16' : ''">
            <div>
              <p class="qs-eyebrow">{{ page.eyebrow }}</p>
              <h1 class="qs-title mt-5 text-[clamp(2.5rem,5.6vw,4.25rem)] leading-[1.02] tracking-[-0.04em]">{{ page.h1 }}</h1>
              <p class="mt-6 max-w-[34rem] text-xl leading-[1.5] text-qs-muted">{{ page.lede }}</p>
            </div>
            @if (page.heroHtml) {
              <div [innerHTML]="trustHtml(page.heroHtml)"></div>
            }
          </header>

          @if (page.steps) {
            <ol class="mt-20 grid gap-10 border-t border-qs-line pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
              @for (step of page.steps; track step.name; let index = $index) {
                <li class="lg:border-l lg:border-qs-line lg:px-6 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0">
                  <p class="qs-label text-qs-accent">0{{ index + 1 }}</p>
                  <h2 class="mt-3 text-lg font-semibold leading-snug text-qs-ink">{{ step.name }}</h2>
                  <p class="qs-body mt-2 text-[0.9375rem] leading-[1.65]">{{ step.text }}</p>
                </li>
              }
            </ol>
          }

          @if (page.disclaimer) {
            <aside class="mt-16 grid gap-x-16 lg:grid-cols-[14rem_minmax(0,1fr)]" role="note">
              <p class="qs-body max-w-[40rem] border-l-2 border-qs-accent pl-4 text-[0.9375rem] leading-[1.65] lg:col-start-2">{{ page.disclaimer }}</p>
            </aside>
          }

          @if (page.faqs) {
            <section class="mt-20 grid gap-x-16 gap-y-6 border-t border-qs-line pt-8 lg:grid-cols-[14rem_minmax(0,1fr)]" aria-labelledby="faq-heading">
              <h2 id="faq-heading" class="text-[1.375rem] font-semibold leading-tight tracking-tight text-qs-ink">Questions people ask</h2>
              <div class="max-w-[40rem] divide-y divide-qs-line">
                @for (entry of page.faqs; track entry.question) {
                  <div class="py-6 first:pt-0">
                    <h3 class="text-lg font-semibold leading-snug text-qs-ink">{{ entry.question }}</h3>
                    <p class="qs-body mt-2 text-[1.0625rem] leading-[1.7]">{{ entry.answer }}</p>
                  </div>
                }
              </div>
            </section>
          }

          @for (section of page.sections; track section.heading) {
            <section class="mt-20 grid gap-x-16 gap-y-6 border-t border-qs-line pt-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
              <h2 class="text-[1.375rem] font-semibold leading-tight tracking-tight text-qs-ink">{{ section.heading }}</h2>
              <div class="qs-body max-w-[40rem] space-y-4 text-[1.0625rem] leading-[1.7]">
                @for (paragraph of section.paragraphs; track paragraph) {
                  <p [innerHTML]="rich(paragraph)"></p>
                }
                @if (section.bullets) {
                  <ul class="list-disc space-y-2 pl-5">
                    @for (bullet of section.bullets; track bullet) {
                      <li [innerHTML]="rich(bullet)"></li>
                    }
                  </ul>
                }
                @if (section.html) {
                  <div class="pt-2" [innerHTML]="trustHtml(section.html)"></div>
                }
              </div>
            </section>
          }

          <section class="mt-20 grid gap-x-16 gap-y-6 border-t border-qs-line pt-8 lg:grid-cols-[14rem_minmax(0,1fr)]" aria-labelledby="related-heading">
            <h2 id="related-heading" class="text-[1.375rem] font-semibold leading-tight tracking-tight text-qs-ink">Keep going</h2>
            <ul class="max-w-[40rem] divide-y divide-qs-line">
              @for (link of page.related; track link.path) {
                <li>
                  <a [routerLink]="link.path" [fragment]="link.fragment" class="group block min-h-11 py-4 first:pt-0">
                    <span class="font-semibold text-qs-ink underline decoration-qs-line-strong underline-offset-4 group-hover:decoration-qs-accent">{{ link.label }}</span>
                    <span class="mt-1 block text-[0.9375rem] leading-[1.6] text-qs-muted">{{ link.text }}</span>
                  </a>
                </li>
              }
            </ul>
          </section>

          <section class="mt-20 grid gap-x-16 gap-y-6 border-t border-qs-line pt-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div class="max-w-[40rem] lg:col-start-2">
              <p class="qs-body text-[1.0625rem] leading-[1.7]">{{ page.cta.note }}</p>
              <a [routerLink]="signedIn() ? '/dashboard' : page.cta.path" class="qs-btn qs-btn-primary mt-6">
                {{ signedIn() && page.cta.path === '/create' ? 'Dashboard' : page.cta.label }}
              </a>
            </div>
          </section>

          @if (page.notice) {
            <p class="mt-12 max-w-[40rem] text-sm leading-relaxed text-qs-muted lg:ml-[17rem]" role="note">{{ page.notice }}</p>
          }
        </article>
      </div>
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
