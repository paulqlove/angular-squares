import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ENTERTAINMENT_DISCLAIMER } from '../../../core/legal';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="bg-page border-t border-default py-8">
      <div class="container mx-auto px-4 text-center text-sm text-default space-y-3">
        <p class="max-w-3xl mx-auto leading-relaxed" role="note">{{ disclaimer }}</p>
        <p>
          <a
            routerLink="/terms"
            class="underline font-medium text-emerald-800 dark:text-emerald-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >Terms of Service</a>
        </p>
        <p class="text-muted">Made with love for sports ball fans</p>
      </div>
    </footer>
  `
})
export class SiteFooterComponent {
  readonly disclaimer = ENTERTAINMENT_DISCLAIMER;
}
