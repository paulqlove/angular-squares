import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SuperBowlSquaresComponent } from './features/super-bowl-squares/super-bowl-squares.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, 
    SuperBowlSquaresComponent
  ],
  template: `
    <main class="container mx-auto p-4 bg-page">
      <app-super-bowl-squares></app-super-bowl-squares>
    </main>
  `
})
export class AppComponent {
  title = 'Super Bowl Squares';
}
