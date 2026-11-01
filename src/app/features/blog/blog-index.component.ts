import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';
import { ContentShellComponent } from '../content/content-shell.component';
import { BLOG_POSTS } from './blog-posts.generated';

@Component({
  selector: 'app-blog-index',
  standalone: true,
  imports: [RouterLink, ContentShellComponent, BreadcrumbsComponent],
  template: `
    <app-content-shell>
      <app-breadcrumbs [items]="breadcrumbs"></app-breadcrumbs>
      <header>
        <h1 class="text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">Blog</h1>
        <p class="mt-4 text-lg leading-relaxed text-muted">
          Notes on football squares for friends, fans, and game-day parties.
          Posts stay free of logos, and the game never handles money.
        </p>
        <p class="mt-3 text-sm">
          <a class="font-semibold text-qs-accent underline underline-offset-2 text-qs-accent" href="/rss.xml">
            Subscribe with RSS
          </a>
        </p>
      </header>

      @if (posts.length === 0) {
        <p class="mt-10 text-default" role="status">No posts yet.</p>
      } @else {
        <ul class="mt-10 space-y-6">
          @for (post of posts; track post.slug) {
            <li class="rounded-xl border border-default bg-card p-5">
              <p class="text-sm text-muted">
                <time [attr.datetime]="post.date">{{ formatDate(post.date) }}</time>
              </p>
              <h2 class="mt-2 text-2xl font-bold text-heading">
                <a
                  [routerLink]="['/blog', post.slug]"
                  class="text-qs-accent underline decoration-qs-accent/30 underline-offset-2 hover:decoration-qs-accent text-qs-accent"
                >
                  {{ post.title }}
                </a>
              </h2>
              <p class="mt-3 leading-relaxed text-default">{{ post.description }}</p>
            </li>
          }
        </ul>
      }
    </app-content-shell>
  `
})
export class BlogIndexComponent {
  private seo = inject(SeoService);

  public readonly posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));
  public readonly breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' }
  ];

  constructor() {
    this.seo.apply({
      title: 'Blog — Quarter Score',
      description: 'The Quarter Score blog: football squares for friends and fans, from number history to party boards. Free to read, and the game never handles money.',
      path: '/blog',
      headline: 'Quarter Score blog',
      published: this.posts[0]?.date ?? '2026-11-05',
      breadcrumbs: this.breadcrumbs,
      includeRss: true
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
