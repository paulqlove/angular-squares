/** Firebase codes meaning the credential already belongs to another account, so it cannot be linked to the guest. */
export const ALREADY_IN_USE_CODES = ['auth/credential-already-in-use', 'auth/email-already-in-use'];

export function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : '';
}

export interface LinkOutcome<T> {
  result: T;
  /** True when the sign-in was attached to the guest's existing account, so its squares stay theirs. */
  linked: boolean;
}

/**
 * Signs a visitor in. A guest (an anonymous account) gets the new sign-in attached to the same account
 * (`link`), which keeps their uid and so the squares recorded under it. Without a guest, or when the
 * credential already belongs to a different account, it signs in normally (`signIn`); in that case
 * the guest's earlier squares stay on their boards under the typed name but are no longer reachable.
 * Any other failure (popup closed, network) is passed on and nothing is signed in.
 */
export async function linkOrSignIn<T>(
  link: (() => Promise<T>) | null,
  signIn: (alreadyInUse?: unknown) => Promise<T>
): Promise<LinkOutcome<T>> {
  if (!link) return { result: await signIn(), linked: false };
  try {
    return { result: await link(), linked: true };
  } catch (error) {
    if (ALREADY_IN_USE_CODES.includes(errorCode(error))) {
      return { result: await signIn(error), linked: false };
    }
    throw error;
  }
}

/**
 * True only when the emailed link says its address has no account yet (acct=0, added by the sign-in email function).
 * A link without the hint (sent before the hint existed) counts as unknown, so a guest is not linked and the
 * one-time link is not put at risk.
 */
export function newAddressFromLink(url: string): boolean {
  try {
    return new URL(url).searchParams.get('acct') === '0';
  } catch {
    return false;
  }
}

/** The sign-in link was used up while we tried to attach it to the guest's account. */
export class LinkUsedUpError extends Error {
  constructor() {
    super('That sign-in link was used up while connecting your games. Ask for a new link and open it once.');
    this.name = 'LinkUsedUpError';
  }
}
