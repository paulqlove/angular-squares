import { Injectable, inject } from '@angular/core';
import { get, ref, set, update } from 'firebase/database';
import { GameGroup, GroupChoice, GroupedBoard, cleanGroupName, deleteGroupUpdates, parseGroups } from '../utils/game-groups';
import { GroupCoHost, groupCoHostUpdates, validCoHost } from '../utils/group-cohost';
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
  /**
   * The owner's groups, oldest first. Empty on any error or for a reader the rules turn away. Each group's co-host
   * is read only for the owner: co-hosts get the groups without them, as the rules allow.
   */
  public async getGroups(ownerId: string): Promise<GameGroup[]> {
    if (!this.database.isBrowser || !ownerId) return [];
    try {
      const isOwner = this.authService.currentUser()?.uid === ownerId;
      const [groups, coHosts] = await Promise.all([
        this.read(`groupLists/${ownerId}/groups`),
        isOwner ? this.read(`groupCoHosts/${ownerId}`).catch(() => null) : null
      ]);
      return parseGroups(groups, coHosts);
    } catch {
      return [];
    }
  }

  /** Makes a group, with its co-host when one is given (Create game's new group). */
  public async createGroup(ownerId: string, name: string, coHost?: GroupCoHost): Promise<GameGroup> {
    this.guardWrite();
    const group: GameGroup = { id: newListKey(), name, createdAt: Date.now(), ...(coHost ? { coHost } : {}) };
    const { id, ...stored } = group;
    await this.save(`groupLists/${ownerId}/groups/${id}`, stored);
    return group;
  }

  /** Renames in place: every board in the group keeps pointing at the same id, so nothing else changes. */
  public async renameGroup(ownerId: string, groupId: string, name: string): Promise<void> {
    this.guardWrite();
    await this.save(`groupLists/${ownerId}/groups/${groupId}/name`, name);
  }

  /**
   * Sets a group's co-host (null removes it) in one write, giving it to the games in `addTo` and clearing it
   * from the games in `clearFrom`. The caller picks the games (group-cohost utils), so no game's own co-host is replaced.
   */
  public async setGroupCoHost(ownerId: string, groupId: string, coHost: GroupCoHost | null, games: { addTo: string[]; clearFrom: string[] }): Promise<void> {
    this.guardWrite();
    await this.patch(groupCoHostUpdates(ownerId, groupId, coHost, games));
  }

  /** Deletes a group and moves its boards to No group in one write. `boards` are the owner's boards. Returns the No group key. */
  public async deleteGroup(ownerId: string, groupId: string, boards: GroupedBoard[]): Promise<string> {
    this.guardWrite();
    const ungrouped = await this.boardSettings.ungroupedKey(ownerId);
    await this.patch(deleteGroupUpdates(ownerId, groupId, ungrouped, boards));
    return ungrouped;
  }

  /**
   * Files a board into a group, or into No group when `groupId` is null. A board in a group is always shown in
   * its More tab; No group keeps the board's switch. Returns the board's new list id.
   */
  public async fileBoard(board: GroupedBoard, groupId: string | null): Promise<string> {
    this.guardWrite();
    const listId = groupId ?? await this.boardSettings.ungroupedKey(board.ownerId);
    await this.patch(fileBoardUpdates(board, listId, !!groupId || !!board.showInOpenBoards));
    return listId;
  }

  /**
   * Saves the Edit game picker: makes the new group first when one was named (owner only), then files the board.
   * Returns the board's new list id and the group it made, if any.
   */
  public async saveChoice(board: GroupedBoard, choice: GroupChoice): Promise<{ listId: string; created?: GameGroup }> {
    const name = cleanGroupName(choice.newName ?? '');
    const email = validCoHost(choice.newCoHost);
    const created = name ? await this.createGroup(board.ownerId, name, email ? { email } : undefined) : undefined;
    const listId = await this.fileBoard(board, created?.id ?? choice.groupId);
    return { listId, created };
  }

  /**
   * Marks a player as one of the owner's co-hosts, or not, so they can read the owner's group names
   * to file a game they co-host. Only the owner writes it.
   */
  public async setCoHost(ownerId: string, uid: string, on: boolean): Promise<void> {
    this.guardWrite();
    await this.save(`coHosts/${ownerId}/${uid}`, on ? true : null);
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
