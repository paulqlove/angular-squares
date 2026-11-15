// Pure part of the one-time move of co-host emails off the games ("Hide them", Paul, Nov 15). No I/O.

/**
 * The multi-path update that moves each game's co-host email from the public game (`games/{id}/managerEmail`)
 * to the owner-only spot (`gameCoHosts/{ownerId}/{id}`), and clears the public copy. An email already in the new
 * spot is kept (the owner saved it since). Games with no email are left alone, so running it twice changes nothing.
 * @param {{ games?: object, gameCoHosts?: object }} data
 */
export function buildCoHostEmailsPatch(data) {
  const { games = {}, gameCoHosts = {} } = data;
  const patch = {};
  for (const [id, game] of Object.entries(games)) {
    const email = typeof game?.managerEmail === 'string' ? game.managerEmail.trim() : '';
    if (!email) continue;
    patch[`games/${id}/managerEmail`] = null;
    const ownerId = game.ownerId;
    const saved = typeof ownerId === 'string' && ownerId ? gameCoHosts[ownerId]?.[id] : undefined;
    if (typeof ownerId === 'string' && ownerId && !(typeof saved === 'string' && saved)) {
      patch[`gameCoHosts/${ownerId}/${id}`] = email.slice(0, 254);
    }
  }
  return patch;
}

/** How many games the patch takes an email off, and how many emails it saves in the owner-only spot. */
export function countMoved(patch) {
  const keys = Object.keys(patch);
  return { cleared: keys.filter((k) => k.startsWith('games/')).length, moved: keys.filter((k) => k.startsWith('gameCoHosts/')).length };
}
