// Pure part of the one-time fix that turns Show in my open boards on for games already in a group. No I/O.

/**
 * The multi-path update that shows every game filed in one of its owner's groups (not No group) with the
 * switch off, and lists it in that group's More tab. Shown games and No group games are left alone, so
 * running it twice changes nothing.
 * @param {{ games?: object, groupLists?: object }} data
 */
export function buildGroupedShownPatch(data) {
  const { games = {}, groupLists = {} } = data;
  const patch = {};
  for (const [id, game] of Object.entries(games)) {
    const ownerId = game?.ownerId;
    const listId = game?.openListId;
    if (typeof ownerId !== 'string' || !ownerId || game.showInOpenBoards === true) continue;
    if (typeof listId !== 'string' || !groupLists[ownerId]?.groups?.[listId]) continue;
    patch[`games/${id}/showInOpenBoards`] = true;
    patch[`openLists/${listId}/${id}`] = ownerId;
  }
  return patch;
}

/** How many games the patch turns on. */
export function countShown(patch) {
  return Object.keys(patch).filter((k) => k.startsWith('games/')).length;
}
