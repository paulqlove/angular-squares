import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

/**
 * The × beside the picked group's name in the taskbar's Groups button (phone and desktop): its own 44px tap target that
 * goes back to All groups. The caller handles the click; off (the Players tab) it is aria-disabled like the picker.
 * Sits on a `<button appGroupClear>`.
 */
@Component({
  selector: 'button[appGroupClear]',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroXMark })],
  host: {
    type: 'button',
    class: 'flex w-11 shrink-0 items-center justify-center',
    '[attr.aria-disabled]': "off() ? 'true' : null",
    '[attr.aria-label]': "'Showing ' + name() + '. Show all groups'"
  },
  template: '<ng-icon name="heroXMark" class="text-base" aria-hidden="true"></ng-icon>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroupClearButtonComponent {
  /** The picked group's name, for screen readers. */
  public readonly name = input.required<string>();
  /** Switched off with the picker on the Players tab. */
  public readonly off = input<boolean>(false);
}
