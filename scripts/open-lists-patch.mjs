// Pure part of the one-time move to per-group More lists. No I/O, so it can be tested.
import { randomInt } from 'node:crypto';

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const isKey = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{16,40}$/.test(v);

/** A 20-character list key, the same shape the app makes. */
export function newListKey() {
  let key = '';
  for (let i = 0; i < 20; i++) key += KEY_CHARS[randomInt(KEY_CHARS.length)];
  return key;
}

/**
 * The multi-path update that gives every host a No group key, files every board without a
 * list into it, lists every shown board, and records co-hosts. Existing keys, lists and
 * entries are kept, so running it twice changes nothing.
 * @param {{ games?: object, openBoards?: object, groupLists?: object, coHosts?: object }} data
 * @param {() => string} makeKey
 */
export function buildOpenListsPatch(data, makeKey = newListKey) {
  const { games = {}, openBoards = {}, groupLists = {}, coHosts = {} } = data;
  const patch = {};
  const keys = {};
  const keyFor = (ownerId) => {
    if (keys[ownerId]) return keys[ownerId];
    const existing = groupLists[ownerId]?.ungrouped;
    keys[ownerId] = isKey(existing) ? existing : makeKey();
    if (!isKey(existing)) patch[`groupLists/${ownerId}/ungrouped`] = keys[ownerId];
    return keys[ownerId];
  };
  for (const [id, game] of Object.entries(games)) {
    const ownerId = game?.ownerId;
    if (typeof ownerId !== 'string' || !ownerId) continue;
    const listId = isKey(game.openListId) ? game.openListId : keyFor(ownerId);
    if (listId !== game.openListId) patch[`games/${id}/openListId`] = listId;
    const shown = game.showInOpenBoards === true || openBoards[ownerId]?.[id] === true;
    if (shown && game.showInOpenBoards !== true) patch[`games/${id}/showInOpenBoards`] = true;
    if (shown) patch[`openLists/${listId}/${id}`] = ownerId;
    const managerId = game.managerId;
    if (typeof managerId === 'string' && managerId && managerId !== ownerId && coHosts[ownerId]?.[managerId] !== true) {
      patch[`coHosts/${ownerId}/${managerId}`] = true;
    }
  }
  return patch;
}

/** Counts for the dry run. */
export function summarize(patch) {
  const count = (prefix, suffix = '') => Object.keys(patch).filter((k) => k.startsWith(prefix) && k.endsWith(suffix)).length;
  return {
    hostKeys: count('groupLists/', '/ungrouped'),
    boardsFiled: count('games/', '/openListId'),
    boardsListed: count('openLists/'),
    coHosts: count('coHosts/')
  };
}
