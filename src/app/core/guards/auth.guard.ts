import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

export const guestGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Do not load Firebase on `/`. A guest cookie is enough to send returning
  // guests onward. Signed-in accounts are detected when they open auth.
  if (!isPlatformBrowser(platformId) || !authService.hasGuestCookie()) {
    return true;
  }

  const joinCode = route.queryParamMap.get('join');
  if (joinCode) {
    router.navigate(['/game', joinCode]);
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
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
