import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/ui/toast/toast.component';
import { WalkthroughComponent } from './components/ui/walkthrough/walkthrough.component';

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
    <router-outlet></router-outlet>
    <app-toast></app-toast>
    <app-walkthrough></app-walkthrough>
  `
})
export class AppComponent {
  title = 'Football Squares';
}
