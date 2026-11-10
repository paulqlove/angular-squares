import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-not-found',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="flex items-center justify-center min-h-screen p-4 bg-qs-bg">
      <div class="max-w-md text-center">
        <img
          src="assets/logo.webp"
          alt=""
          width="114"
          height="120"
          class="h-16 w-auto mx-auto mb-6"
        >
        <h1 class="qs-title mb-2 text-3xl">Page not found</h1>
        <p class="mb-6 text-qs-muted">That address isn't part of QuarterScore.</p>
        <a
          routerLink="/"
          class="qs-btn qs-btn-primary"
        >
          Back to home
        </a>
        <p class="mt-4"><a routerLink="/create" class="text-qs-accent underline underline-offset-4">Create a board</a></p>
      </div>
    </div>
  `
})
export class NotFoundComponent implements OnInit {
  private title = inject(Title);

  public ngOnInit(): void {
    this.title.setTitle('Page not found — QuarterScore');
  }
}
