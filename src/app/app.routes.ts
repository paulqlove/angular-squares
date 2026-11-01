import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

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
    path: 'terms',
    loadComponent: () =>
      import('./features/terms/terms.component').then(m => m.TermsComponent)
  },
  {
    path: 'game/:gameId',
    loadComponent: () =>
      import('./features/super-bowl-squares/super-bowl-squares.component').then(
        m => m.SuperBowlSquaresComponent
      )
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
