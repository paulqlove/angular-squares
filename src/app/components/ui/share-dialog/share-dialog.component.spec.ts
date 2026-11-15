import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../core/services/theme.service';
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

  const theme = signal<'light' | 'dark'>('light');
  const configure = () => TestBed.configureTestingModule({
    imports: [ShareDialogComponent],
    providers: [{ provide: ThemeService, useValue: { effectiveTheme: theme } }]
  });

  beforeEach(() => {
    theme.set('light');
    configure();
  });
  afterEach(() => delete (navigator as { share?: unknown }).share);

  it('shows Share link only when navigator.share exists', () => {
    expect(shareButton(open())).toBeUndefined();
    TestBed.resetTestingModule();
    configure();
    (navigator as { share?: unknown }).share = () => Promise.resolve();
    expect(shareButton(open())).toBeDefined();
  });

  it('puts the link before the game code, and the TV link inside a disclosure', () => {
    const el = open();
    expect(el.querySelector('#share-link')!.compareDocumentPosition(el.querySelector('#share-code')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(el.querySelector('details #share-tv-link')).not.toBeNull();
  });

  it('adds ?theme=dark to the link for a sharer on the dark theme, so the preview matches', () => {
    expect((open().querySelector('#share-link') as HTMLInputElement).value).not.toContain('theme=');
    TestBed.resetTestingModule();
    configure();
    theme.set('dark');
    expect((open().querySelector('#share-link') as HTMLInputElement).value).toMatch(/\/game\/ABC123\?theme=dark$/);
  });
});
