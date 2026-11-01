import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterLink {
  path: string;
  label: string;
}

interface FooterGroup {
  heading: string;
  links: FooterLink[];
}

@Component({
    selector: 'app-site-footer',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <footer class="no-print border-t border-qs-line bg-qs-panel text-sm">
      <div class="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        @for (group of groups; track group.heading) {
          <nav [attr.aria-label]="group.heading">
            <h2 class="qs-eyebrow qs-eyebrow-bar">{{ group.heading }}</h2>
            <ul class="mt-3 space-y-2">
              @for (link of group.links; track link.path) {
                <li>
                  <a
                    [routerLink]="link.path"
                    class="inline-flex min-h-11 min-w-[44px] items-center text-muted underline-offset-2 hover:text-heading hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-qs-accent"
                  >
                    {{ link.label }}
                  </a>
                </li>
              }
            </ul>
          </nav>
        }
      </div>
      <div class="border-t border-default">
        <div class="mx-auto max-w-5xl px-4 py-6 text-xs leading-relaxed text-qs-muted">
          <p>QuarterScore is not affiliated with, endorsed by, or sponsored by the NFL, NBA, NCAA, or any team. Super Bowl is a trademark of the NFL. Entertainment and score-tracking only. QuarterScore does not accept, hold, transfer, or pay out money, and does not facilitate wagering.</p>
          <p class="mt-2">Made with love for sports ball fans</p>
        </div>
      </div>
    </footer>
  `
})
export class SiteFooterComponent {
  public readonly groups: FooterGroup[] = [
    {
      heading: 'Guides',
      links: [
        { path: '/how-to-play', label: 'How to play' },
        { path: '/faq', label: 'FAQ' },
        { path: '/best-squares-numbers', label: 'Best numbers' },
        { path: '/printable-football-squares', label: 'Printable board' },
        { path: '/blog', label: 'Blog' }
      ]
    },
    {
      heading: 'Boards',
      links: [
        { path: '/super-bowl-squares', label: 'Super Bowl squares' },
        { path: '/thanksgiving-football-squares', label: 'Thanksgiving' },
        { path: '/nfl-squares', label: 'NFL squares' },
        { path: '/nfl-playoff-squares', label: 'NFL playoff squares' },
        { path: '/college-football-squares', label: 'College football squares' },
        { path: '/nba-squares', label: 'NBA squares' }
      ]
    },
    {
      heading: 'About',
      links: [
        { path: '/football-squares-fundraiser', label: 'Donation squares' },
        { path: '/terms', label: 'Terms' },
        { path: '/privacy', label: 'Privacy' },
        { path: '/dashboard', label: 'Start a free game' }
      ]
    }
  ];
}
