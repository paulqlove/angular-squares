import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { PreviewRole } from '../../../core/services/role-preview.service';
import { SanitizationService } from '../../../core/services/sanitization.service';
import { ToastService } from '../../../core/services/toast.service';
import { renamePlayer } from '../utils/board-math';
import { GamePageUiService } from './game-page-ui.service';
import { GameStateService } from './game-state.service';

/**
 * The name this viewer plays as: the auth name by default, typed in by a signed-out visitor, or changed in the Edit
 * name dialog. A name another account already plays under on this board is refused, and a clash with the viewer's own
 * profile name opens the forced rename dialog.
 */
@Injectable()
export class PlayerNameService {
  // Public properties

  /** The name typed into the player field, sanitized on the way in. */
  public get currentPlayer(): string {
    return this.state.currentPlayerName;
  }
  public set currentPlayer(value: string) {
    this.state.currentPlayerName = this.sanitizationService.sanitizePlayerName(value);
    this.checkDuplicateName();
  }

  public readonly duplicateNameWarning: WritableSignal<string | null> = signal<string | null>(null);
  public editingName: string = '';
  public forceNameValue: string = '';
  public readonly isSavingForceName: WritableSignal<boolean> = signal(false);
  public readonly isSavingName: WritableSignal<boolean> = signal(false);

  // Public functions

  /** Play as the signed-in user's name, when they have one. */
  public adoptAuthName(): void {
    const user = this.authService.currentUser();
    if (user?.displayName) this.state.currentPlayerName = user.displayName;
  }

  /** Warns when the name is held on this board by another account; forces a rename when it is their profile name. */
  public checkDuplicateName(): void {
    const state = this.state;
    const sanitizedName = this.sanitizationService.sanitizePlayerName(state.currentPlayerName);
    if (!sanitizedName) return this.clearDuplicate();

    const currentUser = this.authService.currentUser();
    const currentUid = currentUser?.uid;

    // Check if this name already exists in the game (case-insensitive)
    const existingName = Object.values(state.selectedSquares).find(p => p.toLowerCase() === sanitizedName.toLowerCase());
    if (!existingName) return this.clearDuplicate();

    // Name exists in game — check playerUserIds for ownership
    const ownerUid = state.playerUserIds[existingName];
    // Same user — allow
    if (ownerUid && currentUid && ownerUid === currentUid) return this.clearDuplicate();
    // Legacy data — no userId mapping. Allow if it matches their auth name.
    if (!ownerUid && currentUser?.displayName?.toLowerCase() === sanitizedName.toLowerCase()) return this.clearDuplicate();

    // Real conflict — another user owns this name
    if (currentUser?.displayName?.toLowerCase() === sanitizedName.toLowerCase()) {
      // Their auth profile name conflicts — force modal
      this.ui.showForceNameChangeModal.set(true);
      this.forceNameValue = '';
    }
    this.duplicateNameWarning.set(`"${sanitizedName}" is already in use`);
  }

  public isEditingNameTaken(): boolean {
    if (!this.editingName.trim()) return false;
    return this.isTakenByOther(this.sanitizationService.sanitizePlayerName(this.editingName));
  }

  public isForceNameTaken(): boolean {
    if (!this.forceNameValue.trim()) return false;
    const sanitized = this.sanitizationService.sanitizePlayerName(this.forceNameValue);
    return Object.values(this.state.selectedSquares).some(p => p.toLowerCase() === sanitized.toLowerCase());
  }

  public openNameEditModal(): void {
    const user = this.authService.currentUser();
    this.editingName = user?.displayName || '';
    this.ui.showNameEditModal.set(true);
  }

  public async saveForceNameChange(): Promise<void> {
    const sanitized = this.sanitizationService.sanitizePlayerName(this.forceNameValue);
    if (!sanitized || this.isForceNameTaken()) return;

    this.isSavingForceName.set(true);
    try {
      const user = this.authService.currentUser();
      if (!user) return;

      if (user.isGuest) {
        this.authService.updateGuestName(sanitized);
      } else {
        await this.authService.updateDisplayName(sanitized);
      }

      // Record new name in playerUserIds
      this.state.playerUserIds[sanitized] = user.uid;
      await this.gameService.updateGame(this.state.gameId, { playerUserIds: this.state.playerUserIds });

      this.state.currentPlayerName = sanitized;
      this.ui.showForceNameChangeModal.set(false);
      this.duplicateNameWarning.set(null);
    } catch (error) {
      this.toastService.error('Could not save your name. Try again.');
    } finally {
      this.isSavingForceName.set(false);
    }
  }

  /** Saves the Edit name dialog, and carries the old name's squares, color, paid mark and account link over to the new one. */
  public async saveNameEdit(): Promise<void> {
    if (!this.editingName.trim()) return;
    const state = this.state;

    // Check for duplicate name (case-insensitive)
    const sanitizedName = this.sanitizationService.sanitizePlayerName(this.editingName);
    const currentUserName = this.authService.currentUser()?.displayName;
    if (this.isTakenByOther(sanitizedName)) {
      this.toastService.error(`"${sanitizedName}" is already in use. Please use a different name.`);
      return;
    }

    this.isSavingName.set(true);
    try {
      const user = this.authService.currentUser();
      if (user?.isGuest) {
        this.authService.updateGuestName(this.editingName);
      } else {
        await this.authService.updateDisplayName(this.editingName);
      }

      // Propagate name change across all game data
      const oldName = currentUserName;
      if (oldName && oldName !== sanitizedName) {
        await this.gameService.updateGame(state.gameId, renamePlayer(state, oldName, sanitizedName));
      }

      state.currentPlayerName = this.editingName.trim();
      this.ui.showNameEditModal.set(false);
    } catch (error) {
      this.toastService.error('Could not save your name. Try again.');
    } finally {
      this.isSavingName.set(false);
    }
  }

  /**
   * Keeps the name in step with auth (run from an effect): a role preview switch plays as the previewed user (or nobody
   * when signed out), and a sign-in after page load fills an empty name.
   */
  public syncWithAuth(): void {
    const user = this.authService.currentUser();
    const previewRole = this.authService.previewRole();
    if (previewRole !== this.lastPreviewRole) {
      this.lastPreviewRole = previewRole;
      this.state.currentPlayerName = user?.displayName || '';
      return;
    }
    if (user?.displayName && !this.state.currentPlayerName) {
      this.state.currentPlayerName = user.displayName;
    }
  }

  // Private properties

  private readonly authService: AuthService = inject(AuthService);
  private readonly gameService: GameService = inject(GameService);
  private lastPreviewRole: PreviewRole = 'actual';
  private readonly sanitizationService: SanitizationService = inject(SanitizationService);
  private readonly state: GameStateService = inject(GameStateService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly ui: GamePageUiService = inject(GamePageUiService);

  // Private functions

  private clearDuplicate(): void {
    this.duplicateNameWarning.set(null);
    this.ui.showForceNameChangeModal.set(false);
  }

  /** The name is on this board and is not the viewer's own auth name. */
  private isTakenByOther(sanitizedName: string): boolean {
    const existingPlayers = new Set(Object.values(this.state.selectedSquares).map(p => p.toLowerCase()));
    const currentUserName = this.authService.currentUser()?.displayName;
    return existingPlayers.has(sanitizedName.toLowerCase()) && currentUserName?.toLowerCase() !== sanitizedName.toLowerCase();
  }
}
