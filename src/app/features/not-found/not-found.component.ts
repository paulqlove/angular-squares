import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex items-center justify-center min-h-screen p-4 bg-page">
      <div class="max-w-md text-center">
        <img
          src="assets/logo.webp"
          alt=""
          width="114"
          height="120"
          class="h-16 w-auto mx-auto mb-6"
        >
        <h1 class="mb-2 text-2xl font-bold text-heading">Page not found</h1>
        <p class="mb-6 text-muted">That address isn't part of Quarter Score.</p>
        <a
          routerLink="/"
          class="inline-block px-6 py-3 text-white transition-colors rounded-lg bg-qs-accent hover:bg-qs-accent-hover"
        >
          Back to home
        </a>
      </div>
    </div>
  `
})
export class NotFoundComponent implements OnInit {
  private title = inject(Title);

  public ngOnInit(): void {
    this.title.setTitle('Page not found — Quarter Score');
  }
}
