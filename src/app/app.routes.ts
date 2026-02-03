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
    path: 'game/:gameId',
    loadComponent: () =>
      import('./features/super-bowl-squares/super-bowl-squares.component').then(
        m => m.SuperBowlSquaresComponent
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
