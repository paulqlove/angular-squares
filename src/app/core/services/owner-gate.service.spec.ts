import { TestBed } from '@angular/core/testing';
import { OwnerGateService } from './owner-gate.service';

describe('OwnerGateService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('hides legacy amounts before the allowlist entry is read', () => {
    const service = TestBed.inject(OwnerGateService);
    expect(service.allowlisted()).toBeFalse();
    expect(service.canSeeGame('creator-uid')).toBeFalse();
    expect(service.canSeeGame(null)).toBeFalse();
  });
});
