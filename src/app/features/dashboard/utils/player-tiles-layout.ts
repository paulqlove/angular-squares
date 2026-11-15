/** A player tile is 14px square with 4px between tiles, across and down. */
export const TILE_PX = 14;
const TILE_GAP_PX = 4;

/** Room the "N games" count needs beside one line of tiles: its 16px gap plus the widest count, "100 games" in text-sm. */
const COUNT_ROOM_PX = 16 + 72;

/** How a card's tiles sit in its width. */
export interface TileLayout {
  /** Tiles a line. */
  columns: number;
  /** Tiles shown: every game, or the newest two lines' worth. */
  shown: number;
  /** The game count fits beside one line of tiles; otherwise it goes under them. */
  countBeside: boolean;
}

/**
 * Lays `total` tiles (one per game the host runs) in a row `width` px wide: as many a line as fit, two lines at most.
 * When there are more games than two lines hold, only the newest show. It depends on the width and the host's game
 * count alone, never on the player, so every card in a list gets the same tiles and the same height.
 */
export function tileLayout(width: number, total: number): TileLayout {
  const fit = Math.max(0, Math.floor((width + TILE_GAP_PX) / (TILE_PX + TILE_GAP_PX)));
  const columns = Math.min(total, fit);
  const shown = Math.min(total, fit * 2);
  const lineWidth = columns * (TILE_PX + TILE_GAP_PX) - TILE_GAP_PX;
  return { columns, shown, countBeside: shown === columns && lineWidth + COUNT_ROOM_PX <= width };
}

/** The newest `count` tiles, in season order. */
export function newestTiles<T>(tiles: readonly T[], count: number): T[] {
  return tiles.slice(Math.max(0, tiles.length - count));
}
