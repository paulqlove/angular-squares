import { TestBed } from '@angular/core/testing';
import { ShareDialogComponent } from './share-dialog.component';

describe('ShareDialogComponent', () => {
  function open(winnersImage: (() => Promise<Blob>) | null = null) {
    const fixture = TestBed.createComponent(ShareDialogComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('gameId', 'ABC123');
    fixture.componentRef.setInput('winnersImage', winnersImage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const buttonsNamed = (el: HTMLElement, label: string) => Array.from(el.querySelectorAll('button')).filter(b => b.textContent?.includes(label));

  beforeEach(() => TestBed.configureTestingModule({ imports: [ShareDialogComponent] }));

  it('shows one Share invite button and no separate link field', () => {
    const el = open();
    expect(buttonsNamed(el, 'Share invite').length).toBe(1);
    expect(el.querySelector('#share-link')).toBeNull();
  });

  it('puts Share invite before the game code, and the TV link inside a disclosure', () => {
    const el = open();
    const share = buttonsNamed(el, 'Share invite')[0];
    expect(share.compareDocumentPosition(el.querySelector('#share-code')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(el.querySelector('details #share-tv-link')).not.toBeNull();
  });

  it('reads Share winners instead of Share invite on a finished game, and draws the picture as it opens', () => {
    let draws = 0;
    const el = open(() => {
      draws++;
      return Promise.resolve(new Blob(['png'], { type: 'image/png' }));
    });
    expect(buttonsNamed(el, 'Share winners').length).toBe(1);
    expect(buttonsNamed(el, 'Share invite').length).toBe(0);
    expect(draws).toBe(1);
  });
});
