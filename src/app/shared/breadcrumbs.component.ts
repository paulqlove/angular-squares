import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbItem } from '../core/services/seo.service';

@Component({
    selector: 'app-breadcrumbs',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <nav aria-label="Breadcrumb" class="mb-8 text-sm">
      <ol class="flex flex-wrap items-center gap-x-2 gap-y-1">
        @for (item of items; track item.path; let last = $last) {
          <li class="flex items-center gap-2">
            @if (!last) {
              <a
                [routerLink]="item.path"
                class="inline-block py-3 -my-3 text-qs-muted decoration-qs-accent underline-offset-4 hover:text-qs-ink hover:underline"
              >
                {{ item.name }}
              </a>
              <span aria-hidden="true" class="text-qs-muted">/</span>
            } @else {
              <span aria-current="page" class="text-qs-muted">{{ item.name }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `
})
export class BreadcrumbsComponent {
  @Input({ required: true }) public items: BreadcrumbItem[] = [];
}
