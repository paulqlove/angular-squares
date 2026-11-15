import { Injectable, inject } from '@angular/core';
import { get, ref, set, update } from 'firebase/database';
import { GameGroup, GroupedBoard, deleteGroupUpdates, parseGroups } from '../utils/game-groups';
import { fileBoardUpdates, newListKey } from '../utils/open-lists';
import { AuthService } from './auth.service';
import { BoardSettingsService } from './board-settings.service';
import { GameDatabaseService } from './game-database.service';

/**
 * Game groups (Season Pass): the owner's groups at `groupLists/{ownerId}/groups`, and filing a board into one.
 * The rules let only the owner (with Season Pass) change groups; the owner and co-hosts can file a board.
 */
@Injectable({
  providedIn: 'root'
})
export class GameGroupsService {
  /** The owner's groups, oldest first. Empty on any error or for a reader the rules turn away. */
  public async getGroups(ownerId: string): Promise<GameGroup[]> {
    if (!this.database.isBrowser || !ownerId) return [];
    try {
      return parseGroups(await this.read(`groupLists/${ownerId}/groups`));
    } catch {
      return [];
    }
  }

  public async createGroup(ownerId: string, name: string): Promise<GameGroup> {
    this.guardWrite();
    const group: GameGroup = { id: newListKey(), name, createdAt: Date.now() };
    await this.save(`groupLists/${ownerId}/groups/${group.id}`, { name: group.name, createdAt: group.createdAt });
    return group;
  }

  /** Renames in place: every board in the group keeps pointing at the same id, so nothing else changes. */
  public async renameGroup(ownerId: string, groupId: string, name: string): Promise<void> {
    this.guardWrite();
    await this.save(`groupLists/${ownerId}/groups/${groupId}/name`, name);
  }

  /** Deletes a group and moves its boards to No group in one write. `boards` are the owner's boards. Returns the No group key. */
  public async deleteGroup(ownerId: string, groupId: string, boards: GroupedBoard[]): Promise<string> {
    this.guardWrite();
    const ungrouped = await this.boardSettings.ungroupedKey(ownerId);
    await this.patch(deleteGroupUpdates(ownerId, groupId, ungrouped, boards));
    return ungrouped;
  }

  /** Files a board into a group, or into No group when `groupId` is null. Returns the board's new list id. */
  public async fileBoard(board: GroupedBoard, groupId: string | null): Promise<string> {
    this.guardWrite();
    const listId = groupId ?? await this.boardSettings.ungroupedKey(board.ownerId);
    await this.patch(fileBoardUpdates(board, listId, !!board.showInOpenBoards));
    return listId;
  }

  /** The three database calls, kept apart so the tests can stand in for the database. */
  protected async read(path: string): Promise<unknown> {
    return (await get(ref(this.database.db, path))).val();
  }

  protected save(path: string, value: unknown): Promise<void> {
    return set(ref(this.database.db, path), value);
  }

  protected patch(updates: Record<string, unknown>): Promise<void> {
    return update(ref(this.database.db), updates);
  }

  private guardWrite(): void {
    if (!this.database.isBrowser) throw new Error('Not in the browser');
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly boardSettings: BoardSettingsService = inject(BoardSettingsService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
}
