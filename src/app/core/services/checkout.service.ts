import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { isActive } from '../plans';
import { AuthService } from './auth.service';
import { PlanService } from './plan.service';
import { ToastService } from './toast.service';

const CHECKOUT_URL = 'https://us-central1-squares-4e4f7.cloudfunctions.net/createCheckoutSession';
/** How often, and how many times, the dashboard looks for the pass after Stripe sends the buyer back. */
const RETURN_POLL_MS = 2000;
const RETURN_POLL_TRIES = 10;

/** Only ever leave the site for a Stripe-hosted page (checkout.stripe.com, or another stripe.com host Stripe uses). */
export function isStripePage(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'stripe.com' || parsed.hostname.endsWith('.stripe.com'));
  } catch {
    return false;
  }
}

/**
 * Buying the Season Pass: our createCheckoutSession function returns a Stripe Checkout page and the browser goes
 * there. The pass is granted only by the Stripe webhook, so after the return this just waits for it to show up.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  /** Checkout shows for everyone once the flag is on, and for the admin before that, to test it. */
  public readonly available = computed<boolean>(() => environment.checkoutEnabled || this.authService.isPreviewAdmin());

  /** Called on the dashboard with the pass=success or pass=cancel that Stripe's return link carries. */
  public async finishReturn(status: string | null): Promise<void> {
    if (status !== 'success' && status !== 'cancel') return;
    void this.router.navigate([], { queryParams: { pass: null }, queryParamsHandling: 'merge', replaceUrl: true });
    if (status === 'cancel') {
      this.toast.info("Checkout canceled. You weren't charged.");
      return;
    }
    this.toast.info('Payment received. Turning on your Season Pass…');
    const on = await this.waitForPass();
    if (on) this.toast.success('Your Season Pass is on through June 30.');
    else this.toast.warning('Your payment went through. Your pass can take a minute to turn on; refresh the page soon.');
  }

  /** Opens Stripe Checkout, or throws an Error whose message can be shown to the host. */
  public async start(): Promise<void> {
    const token = await this.authService.idToken();
    if (!token) throw new Error('Sign in to buy a Season Pass.');
    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ data: {} })
    });
    const body = await response.json().catch(() => ({}));
    const url: unknown = body?.result?.url;
    if (!response.ok || body.error || !isStripePage(url)) {
      throw new Error(body.error?.message || "Checkout isn't available right now. Try again in a minute.");
    }
    window.location.assign(url);
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly router: Router = inject(Router);
  private readonly toast: ToastService = inject(ToastService);

  /** Re-reads the plan until the webhook's pass appears, or gives up after about 20 seconds. */
  private async waitForPass(): Promise<boolean> {
    await this.authService.waitForAuthReady();
    const uid = this.authService.realUser()?.uid;
    if (!uid) return false;
    for (let attempt = 0; attempt < RETURN_POLL_TRIES; attempt++) {
      await this.planService.refresh(uid);
      if (isActive(this.planService.entitlement())) return true;
      await new Promise(resolve => setTimeout(resolve, RETURN_POLL_MS));
    }
    return false;
  }
}
