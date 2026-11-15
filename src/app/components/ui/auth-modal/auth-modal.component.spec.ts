import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalComponent } from './auth-modal.component';

describe('AuthModalComponent name pre-fill', () => {
  function open(suggestedName: string): AuthModalComponent {
    const fixture = TestBed.createComponent(AuthModalComponent);
    fixture.componentRef.setInput('suggestedName', suggestedName);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { ensureInitialized: () => Promise.resolve(), isAuthenticated: () => false, isLoading: signal(false) }
        }
      ]
    })
  );

  it('pre-fills the guest and email name fields with the name typed on the board', () => {
    const modal = open('  Paul ');
    expect(modal.guestName).toBe('Paul');
    expect(modal.linkName).toBe('Paul');
  });

  it('leaves the name fields blank when nothing was typed on the board', () => {
    const modal = open('');
    expect(modal.guestName).toBe('');
    expect(modal.linkName).toBe('');
  });
});
