import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SuperBowlSquaresComponent } from './features/super-bowl-squares/super-bowl-squares.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SuperBowlSquaresComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Super Bowl Squares';
}
