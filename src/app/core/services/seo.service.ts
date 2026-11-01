import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export const SITE_ORIGIN = 'https://quarterscore.com';
export const DEFAULT_OG_IMAGE = '/assets/og-image.png';
export const DEFAULT_OG_ALT = 'QuarterScore. Every square, every score, live on one board.™';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface SeoConfig {
  title: string;
  description: string;
  path: string;
  headline: string;
  image?: string;
  imageAlt?: string;
  ogType?: 'website' | 'article';
  published?: string;
  modified?: string;
  breadcrumbs: BreadcrumbItem[];
  extraJsonLd?: Record<string, unknown>[];
  noindex?: boolean;
  includeRss?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private document = inject(DOCUMENT);
  private meta = inject(Meta);
  private title = inject(Title);

  public apply(config: SeoConfig): void {
    const canonical = this.canonicalUrl(config.path);
    const image = this.absoluteUrl(config.image || DEFAULT_OG_IMAGE);
    const imageAlt = config.imageAlt || DEFAULT_OG_ALT;

    this.title.setTitle(config.title);
    this.upsert('name', 'description', config.description);
    this.upsert('name', 'robots', config.noindex ? 'noindex, follow' : 'index, follow');
    this.upsert('property', 'og:type', config.ogType ?? 'website');
    this.upsert('property', 'og:site_name', 'QuarterScore');
    this.upsert('property', 'og:url', canonical);
    this.upsert('property', 'og:title', config.title);
    this.upsert('property', 'og:description', config.description);
    this.upsert('property', 'og:image', image);
    this.upsert('property', 'og:image:width', '1200');
    this.upsert('property', 'og:image:height', '630');
    this.upsert('property', 'og:image:alt', imageAlt);
    this.upsert('name', 'twitter:card', 'summary_large_image');
    this.upsert('name', 'twitter:title', config.title);
    this.upsert('name', 'twitter:description', config.description);
    this.upsert('name', 'twitter:image', image);
    this.upsert('name', 'twitter:image:alt', imageAlt);
    if (config.published) {
      this.upsert('property', 'article:published_time', config.published);
    }
    this.setCanonical(canonical);
    this.setRss(!!config.includeRss);

    const blocks: Record<string, unknown>[] = [
      this.articleBlock(config, canonical, image),
      this.breadcrumbBlock(config.breadcrumbs),
      ...(config.extraJsonLd ?? [])
    ];
    this.setJsonLd(blocks);
  }

  public canonicalUrl(path: string): string {
    if (path === '/' || path === '') {
      return `${SITE_ORIGIN}/`;
    }
    return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private absoluteUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('http://')) {
      return pathOrUrl;
    }
    return `${SITE_ORIGIN}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
  }

  private articleBlock(config: SeoConfig, canonical: string, image: string): Record<string, unknown> {
    const published = config.published ?? '2026-11-01';
    const modified = config.modified ?? published;
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: config.headline,
      description: config.description,
      datePublished: published,
      dateModified: modified,
      image: [image],
      author: {
        '@type': 'Organization',
        name: 'QuarterScore',
        url: `${SITE_ORIGIN}/`
      },
      publisher: {
        '@type': 'Organization',
        name: 'QuarterScore',
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_ORIGIN}/icon-512.png`
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonical
      }
    };
  }

  private breadcrumbBlock(items: BreadcrumbItem[]): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: this.canonicalUrl(item.path)
      }))
    };
  }

  private upsert(attribute: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attribute]: key, content });
  }

  private setCanonical(href: string): void {
    const head = this.document.head;
    let link = head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private setRss(include: boolean): void {
    const head = this.document.head;
    const existing = head.querySelector('link[rel="alternate"][type="application/rss+xml"]');
    if (!include) {
      existing?.remove();
      return;
    }
    const link = existing ?? this.document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('type', 'application/rss+xml');
    link.setAttribute('title', 'Quarter Score Blog');
    link.setAttribute('href', `${SITE_ORIGIN}/rss.xml`);
    if (!existing) {
      head.appendChild(link);
    }
  }

  private setJsonLd(blocks: Record<string, unknown>[]): void {
    const head = this.document.head;
    head.querySelectorAll('script[data-seo-jsonld]').forEach(node => node.remove());
    for (const block of blocks) {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(block).replace(/</g, '\\u003c');
      head.appendChild(script);
    }
  }
}
