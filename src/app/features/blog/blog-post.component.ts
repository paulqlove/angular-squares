import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from '../content/content-shell.component';
import { BlogPost } from './blog-post.model';
import { BLOG_POSTS } from './blog-posts.generated';

@Component({
    selector: 'app-blog-post',
    imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
    template: `
    <app-content-shell>
      <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
      @if (post) {
        <article>
          <header>
            <p class="text-sm text-muted">
              <time [attr.datetime]="post.date">{{ formatDate(post.date) }}</time>
            </p>
            <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">
              {{ post.title }}
            </h1>
            <p class="mt-4 text-lg leading-relaxed text-muted">{{ post.description }}</p>
          </header>
          <div class="prose-content mt-8" [innerHTML]="post.html"></div>
          <p class="mt-10 text-sm text-muted">
            Quarter Score never collects, holds, or pays out money.
          </p>
          <p class="mt-6">
            <a routerLink="/blog" class="font-semibold text-qs-accent underline underline-offset-2 text-qs-accent">
              All posts
            </a>
          </p>
        </article>
      } @else {
        <article>
          <h1 class="text-3xl font-extrabold text-heading">Post not found</h1>
          <p class="mt-4 text-default">That post is not on the blog.</p>
          <p class="mt-6">
            <a routerLink="/blog" class="font-semibold text-qs-accent underline underline-offset-2 text-qs-accent">
              Back to the blog
            </a>
          </p>
        </article>
      }
    </app-content-shell>
  `
})
export class BlogPostComponent {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);

  public readonly post: BlogPost | undefined;
  public readonly breadcrumbs: { name: string; path: string }[];

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.post = BLOG_POSTS.find(entry => entry.slug === slug);
    if (this.post) {
      this.breadcrumbs = [
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: this.post.title, path: `/blog/${this.post.slug}` }
      ];
      this.seo.apply({
        title: `${this.post.title} — Quarter Score`,
        description: this.post.description,
        path: `/blog/${this.post.slug}`,
        headline: this.post.title,
        image: this.post.ogImage,
        ogType: 'article',
        published: this.post.date,
        modified: this.post.date,
        breadcrumbs: this.breadcrumbs,
        includeRss: true
      });
      return;
    }

    this.breadcrumbs = [
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' }
    ];
    this.seo.apply({
      title: 'Post not found — Quarter Score',
      description: 'That Quarter Score blog post is not on the site.',
      path: `/blog/${slug}`,
      headline: 'Post not found',
      breadcrumbs: this.breadcrumbs,
      noindex: true
    });
  }

  public formatDate(isoDate: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(`${isoDate}T00:00:00Z`));
  }
}
