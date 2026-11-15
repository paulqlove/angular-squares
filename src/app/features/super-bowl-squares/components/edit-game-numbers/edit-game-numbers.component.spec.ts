import { TestBed } from '@angular/core/testing';
import { GameStateService } from '../../services/game-state.service';
import { HostActionsService } from '../../services/host-actions.service';
import { EditGameNumbersComponent } from './edit-game-numbers.component';

describe('EditGameNumbersComponent', () => {
  function render(isLocked: boolean, isRandomized: boolean): { clear: HTMLButtonElement; draw: HTMLButtonElement; text: string } {
    TestBed.configureTestingModule({
      imports: [EditGameNumbersComponent],
      providers: [
        { provide: GameStateService, useValue: { isLocked, isRandomized } },
        { provide: HostActionsService, useValue: { randomizeNumbers: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(EditGameNumbersComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const [clear, draw] = Array.from(el.querySelectorAll('button'));
    return { clear, draw, text: el.textContent ?? '' };
  }

  it('keeps Clear numbers disabled on a locked board, as on desktop', () => {
    const { clear, draw, text } = render(true, true);
    expect(clear.disabled).toBe(true);
    expect(draw.disabled).toBe(true);
    expect(text).toContain('Unlock the board to clear numbers.');
  });

  it('lets an unlocked board clear its numbers', () => {
    const { clear, draw } = render(false, true);
    expect(clear.disabled).toBe(false);
    expect(draw.disabled).toBe(true);
  });

  it('lets a board locked without numbers draw them', () => {
    const { clear, draw } = render(true, false);
    expect(clear.disabled).toBe(true);
    expect(draw.disabled).toBe(false);
  });
});
