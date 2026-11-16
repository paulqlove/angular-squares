import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** First-time host: the welcome line, "Host your first squares game" and the one-line pitch, in place of "Your games". */
@Component({
  selector: 'div[appFirstHostTitle]',
  template: `
    <p class="qs-eyebrow">Welcome{{ name() ? ', ' + name() : '' }}</p>
    <h2 class="qs-title mt-3 text-4xl sm:text-5xl lg:text-6xl">Host your first squares <span class="text-qs-accent">game</span></h2>
    <p class="mt-4 max-w-2xl text-lg text-qs-muted">Takes about a minute. Friends join with your code, no account needed.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FirstHostTitleComponent {
  /** The host's first name, or '' for a plain "Welcome". */
  public readonly name = input<string>('');
}
