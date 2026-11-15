import { TestBed } from '@angular/core/testing';
import { EditGameDialogComponent } from './edit-game-dialog.component';

describe('EditGameDialogComponent', () => {
  function open(inputs: Partial<EditGameDialogComponent>) {
    const fixture = TestBed.createComponent(EditGameDialogComponent);
    Object.assign(fixture.componentInstance, inputs);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    return fixture;
  }
  const text = (f: ReturnType<typeof open>) => (f.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => TestBed.configureTestingModule({ imports: [EditGameDialogComponent] }));

  it('shows split and Clear game only when asked, and no name or co-host', () => {
    const t = text(open({ showSplit: true, showClear: true }));
    expect(t).toContain('Quarter split');
    expect(t).toContain('Clear game');
    expect(t).not.toContain('Game name');
    expect(t).not.toContain('Co-host');
  });

  it('shows name, sport and co-host for the dashboard, without split or Clear game', () => {
    const t = text(open({ showGameFields: true }));
    expect(t).toContain('Game name');
    expect(t).toContain('Co-host');
    expect(t).not.toContain('Quarter split');
    expect(t).not.toContain('Clear game');
  });

  it('emits the draft on save and stays open when closeOnSave is false', () => {
    const f = open({ showGameFields: true, closeOnSave: false, values: { awayTeam: '', homeTeam: '', pricePerSquare: 1, hostNote: '', quarterSplit: null, emptyQuarterRule: 'final', newBoardSize: null, showInOpenBoards: false, autoManage: false, maxSquaresPerPlayer: null, name: 'Party' } });
    let saved: unknown, closed = false;
    f.componentInstance.saved.subscribe(v => (saved = v));
    f.componentInstance.closed.subscribe(() => (closed = true));
    f.componentInstance.save();
    expect((saved as { name: string }).name).toBe('Party');
    expect(closed).toBe(false);
  });

  const base = { awayTeam: '', homeTeam: '', pricePerSquare: 1, hostNote: '', quarterSplit: null, emptyQuarterRule: 'final' as const, newBoardSize: null, autoManage: false, maxSquaresPerPlayer: null };

  it('locks Show in my open boards on while a group is picked, and unlocks it on No group', () => {
    const f = open({ canShowInOpenBoards: true, groups: [{ id: 'ChurchGroupKey000001', name: 'Church', createdAt: 1 }], values: { ...base, showInOpenBoards: false, group: { groupId: null } } });
    const c = f.componentInstance;
    const toggle = () => (f.nativeElement as HTMLElement).querySelector('button[role="switch"]') as HTMLButtonElement;
    c.pickGroup({ groupId: 'ChurchGroupKey000001' });
    f.detectChanges();
    expect(c.draft.showInOpenBoards).toBe(true);
    expect(toggle().disabled).toBe(true);
    expect(text(f)).toContain('Games in a group always show in open boards.');
    c.pickGroup({ groupId: null });
    f.detectChanges();
    expect(c.draft.showInOpenBoards).toBe(true);
    expect(toggle().disabled).toBe(false);
  });

  it('opens a game already in a group with the switch on', () => {
    const c = open({ values: { ...base, showInOpenBoards: false, group: { groupId: 'ChurchGroupKey000001' } } }).componentInstance;
    expect(c.draft.showInOpenBoards).toBe(true);
  });
});
