import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from './content-shell.component';
import { MarketingPage, getMarketingPage, pageBreadcrumbs } from './marketing-pages';

@Component({
    selector: 'app-marketing-page',
    imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
    template: `
    <app-content-shell>
      <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
      <article>
        @if (page.notice) {
          <p class="mb-6 rounded-xl border border-default bg-card p-4 text-sm leading-relaxed text-default" role="note">
            {{ page.notice }}
          </p>
        }
        <header>
          <p class="text-sm font-semibold uppercase tracking-wide text-qs-accent text-qs-accent">
            {{ page.eyebrow }}
          </p>
          <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">
            {{ page.h1 }}
          </h1>
          <p class="mt-4 text-lg leading-relaxed text-muted">{{ page.lede }}</p>
        </header>

        @if (page.disclaimer) {
          <aside class="mt-8 rounded-xl border border-default bg-card p-4 text-sm leading-relaxed text-default" role="note">
            <p class="font-semibold text-heading">Before you start</p>
            <p class="mt-2">{{ page.disclaimer }}</p>
          </aside>
        }

        @if (page.steps) {
          <ol class="mt-10 space-y-6">
            @for (step of page.steps; track step.name; let index = $index) {
              <li class="flex gap-4">
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-qs-accent text-base font-bold text-white" aria-hidden="true">
                  {{ index + 1 }}
                </span>
                <div>
                  <h2 class="text-xl font-bold text-heading">{{ step.name }}</h2>
                  <p class="mt-2 leading-relaxed text-default">{{ step.text }}</p>
                </div>
              </li>
            }
          </ol>
        }

        @if (page.faqs) {
          <section class="mt-10" aria-labelledby="faq-heading">
            <h2 id="faq-heading" class="text-2xl font-bold text-heading">Questions people ask</h2>
            <div class="mt-4 divide-y divide-default rounded-xl border border-default bg-card">
              @for (entry of page.faqs; track entry.question) {
                <div class="p-4">
                  <h3 class="text-lg font-semibold text-heading">{{ entry.question }}</h3>
                  <p class="mt-2 leading-relaxed text-default">{{ entry.answer }}</p>
                </div>
              }
            </div>
          </section>
        }

        @for (section of page.sections; track section.heading) {
          <section class="mt-10">
            <h2 class="text-2xl font-bold text-heading">{{ section.heading }}</h2>
            @for (paragraph of section.paragraphs; track paragraph) {
              <p class="mt-3 leading-relaxed text-default">{{ paragraph }}</p>
            }
            @if (section.bullets) {
              <ul class="mt-4 list-disc space-y-2 pl-5 text-default">
                @for (bullet of section.bullets; track bullet) {
                  <li>{{ bullet }}</li>
                }
              </ul>
            }
          </section>
        }

        <section class="mt-10" aria-labelledby="related-heading">
          <h2 id="related-heading" class="text-2xl font-bold text-heading">Keep going</h2>
          <ul class="mt-4 grid gap-3 sm:grid-cols-2">
            @for (link of page.related; track link.path) {
              <li>
                <a
                  [routerLink]="link.path"
                  [fragment]="link.fragment"
                  class="block min-h-11 rounded-xl border border-default bg-card p-4 hover:bg-card-hover"
                >
                  <span class="font-semibold text-qs-accent underline decoration-qs-accent/40 underline-offset-2 text-qs-accent dark:decoration-qs-accent/40">
                    {{ link.label }}
                  </span>
                  <span class="mt-1 block text-sm text-muted">{{ link.text }}</span>
                </a>
              </li>
            }
          </ul>
        </section>

        <section class="mt-10 rounded-2xl bg-qs-accent px-5 py-6 text-white">
          <a
            [routerLink]="page.cta.path"
            class="inline-flex min-h-11 items-center rounded-md bg-white px-4 font-semibold text-qs-accent hover:bg-qs-accent-soft"
          >
            {{ page.cta.label }}
          </a>
          <p class="mt-3 text-sm leading-relaxed text-qs-on-accent">{{ page.cta.note }}</p>
        </section>

        @if (page.disclaimer) {
          <aside class="mt-8 rounded-xl border border-default bg-card p-4 text-sm leading-relaxed text-default" role="note">
            <p>{{ page.disclaimer }}</p>
          </aside>
        }
      </article>
    </app-content-shell>
  `
})
export class MarketingPageComponent {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);

  public readonly page: MarketingPage = getMarketingPage(this.route.snapshot.data['pageId']);
  public readonly breadcrumbs = pageBreadcrumbs(this.page);

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
