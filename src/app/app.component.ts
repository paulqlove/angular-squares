import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/ui/toast/toast.component';
import { WalkthroughComponent } from './components/ui/walkthrough/walkthrough.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ToastComponent,
    WalkthroughComponent
  ],
  template: `
    @if (authService.isLoading()) {
      <div class="fixed inset-0 bg-page flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
      </div>
    } @else {
      <router-outlet></router-outlet>
    }
    <app-toast></app-toast>
    <app-walkthrough></app-walkthrough>
  `
})
export class AppComponent {
  protected authService = inject(AuthService);
}
