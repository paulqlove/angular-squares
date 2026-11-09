import { TestBed } from '@angular/core/testing';
import { ShareDialogComponent } from './share-dialog.component';

describe('ShareDialogComponent', () => {
  function open() {
    const fixture = TestBed.createComponent(ShareDialogComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('gameId', 'ABC123');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const shareButton = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Share link'));

  beforeEach(() => TestBed.configureTestingModule({ imports: [ShareDialogComponent] }));
  afterEach(() => delete (navigator as { share?: unknown }).share);

  it('shows Share link only when navigator.share exists', () => {
    expect(shareButton(open())).toBeUndefined();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ShareDialogComponent] });
    (navigator as { share?: unknown }).share = () => Promise.resolve();
    expect(shareButton(open())).toBeDefined();
  });

  it('puts the link before the game code, and the TV link inside a disclosure', () => {
    const el = open();
    expect(el.querySelector('#share-link')!.compareDocumentPosition(el.querySelector('#share-code')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(el.querySelector('details #share-tv-link')).not.toBeNull();
  });
});
