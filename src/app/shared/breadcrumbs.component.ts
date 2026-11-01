import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbItem } from '../core/services/seo.service';

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav aria-label="Breadcrumb" class="mb-6 text-sm">
      <ol class="flex flex-wrap items-center gap-x-2 gap-y-1">
        @for (item of items; track item.path; let last = $last) {
          <li class="flex items-center gap-2">
            @if (!last) {
              <a
                [routerLink]="item.path"
                class="text-emerald-800 underline decoration-emerald-800/40 underline-offset-2 hover:decoration-emerald-800 dark:text-emerald-300 dark:decoration-emerald-300/40"
              >
                {{ item.name }}
              </a>
              <span aria-hidden="true" class="text-muted">/</span>
            } @else {
              <span aria-current="page" class="text-heading">{{ item.name }}</span>
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
