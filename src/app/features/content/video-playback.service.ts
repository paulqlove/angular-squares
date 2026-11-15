import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Where the how-to players live. Their messages are trusted only from here, and ours are sent only there. */
export const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';
/** YouTube's player state for "playing". */
const PLAYING = 1;
/** How often, and how many times, a loaded player is asked to start reporting, as YouTube's own embed API does. */
const HANDSHAKE_MS = 250;
const HANDSHAKE_TRIES = 40;

/** One player on the page: its id in our messages, whether it has answered yet, and the last state it reported. */
interface Player {
  answered: boolean;
  id: number;
  state: number | null;
  timer?: ReturnType<typeof setInterval>;
}

/** The player state in a message from a YouTube embed, or null when the message carries none. */
export function playerState(data: unknown): number | null {
  if (typeof data !== 'string') {
    return null;
  }
  let message: { event?: unknown; info?: unknown };
  try {
    message = JSON.parse(data) ?? {};
  } catch {
    return null; // Other scripts post their own messages to the page; text that isn't JSON isn't a player's.
  }
  const info = message.info;
  if (message.event === 'onStateChange') {
    return typeof info === 'number' ? info : null;
  }
  const state = message.event === 'infoDelivery' && typeof info === 'object' && info ? (info as { playerState?: unknown }).playerState : null;
  return typeof state === 'number' ? state : null;
}

/**
 * Keeps one how-to clip playing at a time. A new player pauses every other one on the page as it opens, and a player
 * that starts later from its own play button pauses the rest. Talks to the players over postMessage, the protocol
 * YouTube's embed API uses, so no extra script loads.
 */
@Injectable({ providedIn: 'root' })
export class VideoPlaybackService {
  /** Adds a player that just opened and pauses the others. The returned function forgets it again. */
  public register(frame: HTMLIFrameElement): () => void {
    this.listen();
    this.pauseAllExcept(frame);
    const player: Player = { answered: false, id: ++this.lastId, state: null };
    this.players.set(frame, player);
    const greet = () => this.greet(frame, player);
    frame.addEventListener('load', greet);
    return () => {
      clearInterval(player.timer);
      frame.removeEventListener('load', greet);
      this.players.delete(frame);
    };
  }

  private readonly document = inject(DOCUMENT);
  private lastId = 0;
  private listening = false;
  private readonly players = new Map<HTMLIFrameElement, Player>();

  /** Asks a freshly loaded player to report its state, until it answers or the tries run out. */
  private greet(frame: HTMLIFrameElement, player: Player): void {
    let tries = 0;
    clearInterval(player.timer);
    player.timer = setInterval(() => {
      if (player.answered || ++tries > HANDSHAKE_TRIES) {
        clearInterval(player.timer);
        return;
      }
      this.send(frame, { event: 'listening' });
    }, HANDSHAKE_MS);
  }

  private listen(): void {
    const window = this.document.defaultView;
    if (this.listening || !window) {
      return;
    }
    this.listening = true;
    window.addEventListener('message', (event) => this.onMessage(event));
  }

  private onMessage(event: MessageEvent): void {
    if (event.origin !== PLAYER_ORIGIN) {
      return;
    }
    const entry = [...this.players].find(([frame]) => frame.contentWindow !== null && frame.contentWindow === event.source);
    if (!entry) {
      return;
    }
    const [frame, player] = entry;
    if (!player.answered) {
      player.answered = true;
      this.send(frame, { event: 'command', func: 'addEventListener', args: ['onStateChange'] });
    }
    const state = playerState(event.data);
    if (state === null || state === player.state) {
      return;
    }
    player.state = state;
    if (state === PLAYING) {
      this.pauseAllExcept(frame);
    }
  }

  private pauseAllExcept(playing: HTMLIFrameElement): void {
    for (const frame of this.players.keys()) {
      if (frame !== playing) {
        this.send(frame, { event: 'command', func: 'pauseVideo', args: [] });
      }
    }
  }

  private send(frame: HTMLIFrameElement, message: Record<string, unknown>): void {
    const id = this.players.get(frame)?.id;
    frame.contentWindow?.postMessage(JSON.stringify({ ...message, id, channel: 'widget' }), PLAYER_ORIGIN);
  }
}
