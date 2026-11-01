import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

function marketingRoute(path: string): Routes[number] {
  return {
    path,
    loadComponent: () =>
      import('./features/content/marketing-page.component').then(m => m.MarketingPageComponent),
    data: { pageId: path }
  };
}

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/welcome/welcome.component').then(m => m.WelcomeComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'game/:gameId',
    loadComponent: () =>
      import('./features/super-bowl-squares/super-bowl-squares.component').then(
        m => m.SuperBowlSquaresComponent
      )
  },
  marketingRoute('how-to-play'),
  marketingRoute('faq'),
  marketingRoute('super-bowl-squares'),
  {
    path: 'best-squares-numbers',
    loadComponent: () =>
      import('./features/content/best-numbers.component').then(m => m.BestNumbersComponent)
  },
  {
    path: 'printable-football-squares',
    loadComponent: () =>
      import('./features/content/printable-board.component').then(m => m.PrintableBoardComponent)
  },
  marketingRoute('thanksgiving-football-squares'),
  marketingRoute('nfl-squares'),
  marketingRoute('nfl-playoff-squares'),
  marketingRoute('college-football-squares'),
  marketingRoute('football-squares-fundraiser'),
  marketingRoute('nba-squares'),
  {
    path: 'blog',
    loadComponent: () =>
      import('./features/blog/blog-index.component').then(m => m.BlogIndexComponent)
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./features/blog/blog-post.component').then(m => m.BlogPostComponent)
  },
  marketingRoute('terms'),
  marketingRoute('privacy'),
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
