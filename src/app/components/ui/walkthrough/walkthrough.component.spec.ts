import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WalkthroughComponent } from './walkthrough.component';
import { WalkthroughService } from '../../../core/services/walkthrough.service';

describe('WalkthroughComponent keyboard', () => {
  const steps = [
    { target: 'none-1', title: 'One', description: 'First', position: 'center' as const },
    { target: 'none-2', title: 'Two', description: 'Second', position: 'center' as const }
  ];
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    localStorage.removeItem('walkthrough_focus-test_completed');
  });

  it('focuses Next on each step and Done on the last, so Enter moves the tour on', async () => {
    const fixture = TestBed.createComponent(WalkthroughComponent);
    document.body.appendChild(fixture.nativeElement);
    const service = TestBed.inject(WalkthroughService);
    service.start('focus-test', steps);
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
    await tick();
    expect((document.activeElement as HTMLElement).textContent!.trim()).toBe('Next');

    service.next();
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
    await tick();
    expect((document.activeElement as HTMLElement).textContent!.trim()).toBe('Done');

    service.skip();
    fixture.detectChanges();
    fixture.nativeElement.remove();
  });
});
