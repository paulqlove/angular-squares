import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { HowItWorksDemoComponent } from './how-it-works-demo.component';
import { HowToVideoComponent } from './howto-video.component';
import { ReadingEndComponent, ReadingHeaderComponent, ReadingPageComponent, ReadingSectionComponent } from './reading-layout.components';
import { MarketingPage, getMarketingPage, pageBreadcrumbs } from './marketing-pages';
import { richText } from './rich-text';
import { pageVideos, videoObject } from './video-structured-data';

@Component({
    selector: 'app-marketing-page',
    imports: [HowItWorksDemoComponent, HowToVideoComponent, ReadingPageComponent, ReadingHeaderComponent, ReadingSectionComponent, ReadingEndComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <app-reading-page [breadcrumbs]="breadcrumbs">
      <app-reading-header [eyebrow]="page.eyebrow" [title]="page.h1" [lede]="page.lede">
        @if (page.heroHtml) {
          <div hero [innerHTML]="trustHtml(page.heroHtml)"></div>
        }
      </app-reading-header>

      @if (page.demo === 'how-it-works') {
        <app-how-it-works-demo class="mt-12 sm:mt-14"></app-how-it-works-demo>
      }

      @if (page.steps) {
        <ol class="mt-20 grid gap-x-0 gap-y-10 border-t border-qs-line pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-12 lg:gap-y-0">
          @for (step of page.steps; track step.name; let index = $index) {
            <li class="lg:relative lg:row-span-4 lg:grid lg:[grid-template-rows:subgrid] lg:before:absolute lg:before:inset-y-0 lg:before:-left-6 lg:before:w-px lg:before:bg-qs-line lg:first:before:hidden">
              <p class="qs-label text-qs-accent">0{{ index + 1 }}</p>
              <h2 class="mt-3 text-lg font-semibold leading-snug text-qs-ink">{{ step.name }}</h2>
              <p class="qs-body mt-2 text-[0.9375rem] leading-[1.65]">{{ step.text }}</p>
              <!-- Its own subgrid row, so on desktop every clip starts at the same height whatever the text above it.
                   Columns are split by the gap with a drawn divider, so every clip is the same width too. -->
              @if (step.video) {
                <app-howto-video class="mt-5 max-w-[30rem] lg:self-start" [video]="step.video"></app-howto-video>
              }
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
        <app-reading-section heading="Questions people ask" headingId="faq-heading">
          <div class="divide-y divide-qs-line !space-y-0">
            @for (entry of page.faqs; track entry.question) {
              <div class="py-6 first:pt-0">
                <h3 class="text-lg font-semibold leading-snug text-qs-ink">{{ entry.question }}</h3>
                <p class="mt-2">{{ entry.answer }}</p>
                @if (entry.video) {
                  <app-howto-video class="mt-5 max-w-[30rem]" [video]="entry.video"></app-howto-video>
                }
              </div>
            }
          </div>
        </app-reading-section>
      }

      @for (section of page.sections; track section.heading) {
        <app-reading-section [heading]="section.heading">
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
          @if (section.video) {
            @if (section.videoIntro) {
              <p>{{ section.videoIntro }}</p>
            }
            <app-howto-video class="max-w-[30rem]" [video]="section.video"></app-howto-video>
          }
        </app-reading-section>
      }

      <app-reading-end [related]="page.related" [cta]="page.cta"></app-reading-end>

      @if (page.notice) {
        <p class="mt-12 max-w-[40rem] text-sm leading-relaxed text-qs-muted lg:ml-[17rem]" role="note">{{ page.notice }}</p>
      }
    </app-reading-page>
  `
})
export class MarketingPageComponent {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private seo = inject(SeoService);

  public readonly page: MarketingPage = getMarketingPage(this.route.snapshot.data['pageId']);
  public readonly breadcrumbs = pageBreadcrumbs(this.page);
  private htmlCache = new Map<string, SafeHtml>();

  /** Page copy with **bold** and site links (see richText). Safe to trust: richText escapes everything else. */
  public rich(text: string): SafeHtml {
    const key = `rich:${text}`;
    if (!this.htmlCache.has(key)) {
      this.htmlCache.set(key, this.sanitizer.bypassSecurityTrustHtml(richText(text)));
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
    // Top-level blocks, one per clip, so Google reads them the same way for steps and FAQ answers.
    extra.push(...pageVideos(this.page).map(videoObject));

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
