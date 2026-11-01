import { Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { SiteFooterComponent } from '../../components/ui/site-footer/site-footer.component';
import { ENTERTAINMENT_DISCLAIMER } from '../../core/legal';

/**
 * DRAFT, pending legal review.
 * Plain-language draft for counsel. This is not legal advice and has not been
 * approved by a lawyer. Do not describe it as final terms.
 */
@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink, AppHeaderComponent, SiteFooterComponent],
  template: `
    <div class="min-h-screen bg-page flex flex-col">
      <app-shared-header variant="solid" heading="p"></app-shared-header>
      <main class="container mx-auto px-4 py-8 md:py-12 flex-1">
        <article class="max-w-3xl mx-auto bg-card border border-default rounded-2xl p-6 sm:p-8 md:p-10 text-default">
          <h1 class="text-3xl md:text-4xl font-bold text-heading tracking-tight">Terms of Service</h1>
          <p class="mt-2 text-sm text-muted">Version 2026-11-01</p>

          <p class="mt-6 text-base leading-relaxed font-semibold" role="note">{{ disclaimer }}</p>

          <h2 class="mt-8 text-xl font-bold text-heading">What QuarterScore is</h2>
          <p class="mt-2 leading-relaxed">
            QuarterScore is a board for friends and fans. You claim squares, share a code, and follow the score by quarter.
            It keeps the grid, the numbers, and the names of the people who won each quarter.
          </p>

          <h2 class="mt-8 text-xl font-bold text-heading">Who can use it</h2>
          <p class="mt-2 leading-relaxed">
            You must be 18 or older to create an account, create a board, or join a board. Checking the box is how you say that,
            and how you agree to these terms. We store the time and the version you accepted on your user record.
          </p>

          <h2 class="mt-8 text-xl font-bold text-heading">Score tracking only</h2>
          <p class="mt-2 leading-relaxed">{{ disclaimer }}</p>
          <p class="mt-2 leading-relaxed">
            QuarterScore does not take entry fees, hold a pool, route transfers, or hand anything out.
            It does not connect you to a payment app. Arrangements people make outside the app are their own,
            and they happen outside this service.
          </p>

          <h2 class="mt-8 text-xl font-bold text-heading">Your local rules</h2>
          <p class="mt-2 leading-relaxed">
            You are responsible for following the laws and the rules of your home, school, workplace, or group.
            Do not use QuarterScore to run, promote, or keep score for wagering.
          </p>

          <h2 class="mt-8 text-xl font-bold text-heading">What you post</h2>
          <p class="mt-2 leading-relaxed">
            Names and house rules are plain text that you write. Other people on the board can read them.
            We may remove a board, a name, or house rules that break these terms or that we are required to remove.
          </p>

          <h2 class="mt-8 text-xl font-bold text-heading">If you still exchange value outside the app</h2>
          <p class="mt-2 leading-relaxed">
            You will cover QuarterScore and the people who operate it against claims, losses, and costs that come from
            money activity you conduct in connection with the service, whether or not that activity used the service itself.
          </p>

          <h2 class="mt-8 text-xl font-bold text-heading">Changes</h2>
          <p class="mt-2 leading-relaxed">
            We may update these terms. If the version changes, we will ask you to confirm again before you create or join a board.
          </p>

          <p class="mt-8">
            <a
              routerLink="/"
              class="inline-flex min-h-11 items-center font-semibold underline text-emerald-800 dark:text-emerald-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >Back to QuarterScore</a>
          </p>
        </article>
      </main>
      <app-site-footer></app-site-footer>
    </div>
  `
})
export class TermsComponent implements OnInit {
  private title = inject(Title);
  private meta = inject(Meta);
  readonly disclaimer = ENTERTAINMENT_DISCLAIMER;

  ngOnInit(): void {
    this.title.setTitle('Terms of Service — Quarter Score');
    this.meta.updateTag({
      name: 'description',
      content: ENTERTAINMENT_DISCLAIMER
    });
  }
}
