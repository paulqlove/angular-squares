import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../core/services/theme.service';
import { ShareDialogComponent } from './share-dialog.component';

describe('ShareDialogComponent', () => {
  const theme = signal<'light' | 'dark'>('light');

  function create(winnersImage: (() => Promise<Blob>) | null = null) {
    const fixture = TestBed.createComponent(ShareDialogComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('gameId', 'ABC123');
    fixture.componentRef.setInput('winnersImage', winnersImage);
    fixture.detectChanges();
    return fixture;
  }
  const open = (winnersImage: (() => Promise<Blob>) | null = null) => create(winnersImage).nativeElement as HTMLElement;
  const buttonsNamed = (el: HTMLElement, label: string) => Array.from(el.querySelectorAll('button')).filter(b => b.textContent?.includes(label));

  beforeEach(() => {
    theme.set('light');
    TestBed.configureTestingModule({
      imports: [ShareDialogComponent],
      providers: [{ provide: ThemeService, useValue: { effectiveTheme: theme } }]
    });
  });

  it('shows one Share invite button and no separate link field', () => {
    const el = open();
    expect(buttonsNamed(el, 'Share invite').length).toBe(1);
    expect(el.querySelector('#share-link')).toBeNull();
    expect(el.querySelector('#share-title')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Share game');
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
    expect(el.querySelector('#share-title')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Share winners');
    expect(el.textContent).not.toContain('Invite players');
    expect(draws).toBe(1);
  });

  it('adds ?theme=dark to the invite link for a sharer on the dark theme, so the link preview matches', () => {
    expect(create().componentInstance.link).not.toContain('theme=');
    theme.set('dark');
    expect(create().componentInstance.link).toMatch(/\/game\/ABC123\?theme=dark$/);
  });
});
