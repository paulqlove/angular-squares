import { Injectable, signal } from '@angular/core';

/**
 * The group the dashboard's group picker last showed (null for All groups), so TV mode opens on the same group.
 * Kept in memory for this visit only. The dashboard writes it; TV mode only reads it.
 */
@Injectable({
  providedIn: 'root'
})
export class LastGroupService {
  public readonly id = signal<string | null>(null);
}
