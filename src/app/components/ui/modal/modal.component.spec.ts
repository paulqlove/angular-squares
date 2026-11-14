import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

@Component({
  imports: [ModalComponent],
  template: `
    <button id="opener" type="button">open</button>
    <app-modal [open]="a()" labelledBy="a-title" [escapeCloses]="escA()" [backdropCloses]="backdropA()" (dismissed)="dismissedA = dismissedA + 1">
      <h2 id="a-title">A</h2>
      <button id="a-first" type="button">first</button>
      <button id="a-last" type="button">last</button>
    </app-modal>
    <app-modal [open]="b()" labelledBy="b-title" [level]="3" role="alertdialog" (dismissed)="dismissedB = dismissedB + 1">
      <h2 id="b-title">B</h2>
      <button id="b-only" type="button" data-autofocus>only</button>
    </app-modal>
    <app-modal [open]="c()" labelledBy="c-title" size="sm" motion="slide">
      <h2 id="c-title">C</h2>
    </app-modal>
  `
})
class Host {
  a = signal(false);
  b = signal(false);
  c = signal(false);
  escA = signal(true);
  backdropA = signal(true);
  dismissedA = 0;
  dismissedB = 0;
}

describe('ModalComponent', () => {
  // The test DOM has no layout, so offsetParent is always null; the shell uses it to skip hidden controls.
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
  beforeAll(() => Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return this.parentNode; } }));
  afterAll(() => { if (original) Object.defineProperty(HTMLElement.prototype, 'offsetParent', original); });

  const setup = () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  };
  const flush = async (fixture: ReturnType<typeof setup>) => { fixture.detectChanges(); await new Promise(r => setTimeout(r, 5)); fixture.detectChanges(); };
  const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

  it('renders nothing while closed and a labelled modal dialog when open', async () => {
    const f = setup();
    expect(f.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    f.componentInstance.a.set(true);
    await flush(f);
    const dialog = f.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('a-title');
  });

  it('removes itself from the page after closing, with no animation event needed', async () => {
    const f = setup();
    f.componentInstance.a.set(true);
    await flush(f);
    f.componentInstance.a.set(false);
    await flush(f);
    expect(f.nativeElement.querySelector('.qs-modal-leave')).not.toBeNull();
    await new Promise(r => setTimeout(r, 250));
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    f.componentInstance.a.set(true);
    f.componentInstance.a.set(false);
    f.componentInstance.a.set(true);
    await flush(f);
    await new Promise(r => setTimeout(r, 250));
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(f.nativeElement.querySelector('.qs-modal-leave')).toBeNull();
  });

  it('puts focus on data-autofocus, or the first control, and takes it back on close', async () => {
    const f = setup();
    (f.nativeElement.querySelector('#opener') as HTMLElement).focus();
    f.componentInstance.a.set(true);
    await flush(f);
    expect(document.activeElement?.id).toBe('a-first');
    f.componentInstance.a.set(false);
    await flush(f);
    expect(document.activeElement?.id).toBe('opener');
  });

  it('asks to close on Esc and on a backdrop tap, unless turned off', async () => {
    const f = setup();
    f.componentInstance.a.set(true);
    await flush(f);
    esc();
    expect(f.componentInstance.dismissedA).toBe(1);
    (f.nativeElement.querySelector('[role="dialog"]')!.parentElement as HTMLElement).click();
    expect(f.componentInstance.dismissedA).toBe(2);
    f.componentInstance.backdropA.set(false);
    f.componentInstance.escA.set(false);
    await flush(f);
    (f.nativeElement.querySelector('[role="dialog"]')!.parentElement as HTMLElement).click();
    esc();
    expect(f.componentInstance.dismissedA).toBe(2);
  });

  it('answers Esc only on the top modal', async () => {
    const f = setup();
    f.componentInstance.a.set(true);
    await flush(f);
    f.componentInstance.b.set(true);
    await flush(f);
    expect(document.activeElement?.id).toBe('b-only');
    esc();
    expect(f.componentInstance.dismissedB).toBe(1);
    expect(f.componentInstance.dismissedA).toBe(0);
  });

  it('stops the page scrolling while any modal is open, and restores it after the last closes', async () => {
    const f = setup();
    document.documentElement.style.overflow = 'auto';
    f.componentInstance.a.set(true);
    await flush(f);
    f.componentInstance.b.set(true);
    await flush(f);
    expect(document.documentElement.style.overflow).toBe('hidden');
    f.componentInstance.b.set(false);
    await flush(f);
    expect(document.documentElement.style.overflow).toBe('hidden');
    f.componentInstance.a.set(false);
    await flush(f);
    expect(document.documentElement.style.overflow).toBe('auto');
  });

  it('keeps Tab inside', async () => {
    const f = setup();
    f.componentInstance.a.set(true);
    await flush(f);
    const last = f.nativeElement.querySelector('#a-last') as HTMLElement;
    last.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('a-first');
  });
  it('docks the phone sheet edge to edge, with no gap beside or below it', async () => {
    const fixture = setup();
    fixture.componentInstance.a.set(true);
    fixture.detectChanges();
    const overlay = document.querySelector<HTMLElement>('[aria-labelledby="a-title"]')!.parentElement!;
    const classes = overlay.className.split(/\s+/);
    expect(classes).toContain('items-end');
    expect(classes.some(c => /^(p|px|pb)-/.test(c))).toBe(false);
    fixture.destroy();
  });

  it('slides a docked dialog on phones too, popping only from 640px up', async () => {
    const f = setup();
    f.componentInstance.a.set(true);
    await flush(f);
    const overlay = document.querySelector<HTMLElement>('[aria-labelledby="a-title"]')!.parentElement!;
    expect(overlay.classList).toContain('qs-sheet-phone');
    expect(overlay.classList).not.toContain('qs-sheet-slide');
  });

  it('lets a small sheet span the whole phone width, capping it only from 640px up', async () => {
    const f = setup();
    f.componentInstance.c.set(true);
    await flush(f);
    const classes = document.querySelector<HTMLElement>('[aria-labelledby="c-title"]')!.className.split(/\s+/);
    expect(classes).toContain('w-full');
    expect(classes).toContain('sm:max-w-sm');
    expect(classes.some(c => c.startsWith('max-w-'))).toBe(false);
  });

  it('slides a sheet up and back down, staying on the page until it is out of view', async () => {
    const f = setup();
    f.componentInstance.c.set(true);
    await flush(f);
    const panel = document.querySelector<HTMLElement>('[aria-labelledby="c-title"]')!;
    expect(panel.parentElement!.classList).toContain('qs-sheet-slide');
    expect(panel.classList).not.toContain('animate-modal-in');
    f.componentInstance.c.set(false);
    f.detectChanges();
    await new Promise(r => setTimeout(r, 100));
    f.detectChanges();
    expect(panel.parentElement!.classList).toContain('qs-modal-leave');
    await new Promise(r => setTimeout(r, 80));
    f.detectChanges();
    expect(document.querySelector('[aria-labelledby="c-title"]')).toBeNull();
    f.destroy();
  });
});
