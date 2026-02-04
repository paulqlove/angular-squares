import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth state to be determined
  await authService.waitForAuthReady();

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to welcome page
  router.navigate(['/'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const guestGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth state to be determined
  await authService.waitForAuthReady();

  // If already authenticated, redirect to dashboard
  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

export const gameCreatorGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth state to be determined
  await authService.waitForAuthReady();

  if (authService.canCreateGame()) {
    return true;
  }

  // Guest users can't create games, redirect to dashboard
  router.navigate(['/dashboard']);
  return false;
};
