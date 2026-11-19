import { emptyBoard, fillingBoard, openCount, winningCorner } from './home-grids';

describe('home grids', () => {
  it('draws each board size with the right axes', () => {
    const shapes = ([100, 50, 25] as const).map(size => {
      const grid = emptyBoard(size);
      return [grid.rows.length, grid.cols.length, grid.squares.length];
    });
    expect(shapes).toEqual([[10, 10, 100], [5, 10, 50], [5, 5, 25]]);
  });

  it('pairs the away digits on 50 and both on 25', () => {
    expect(emptyBoard(100).rows[0].label).toBe('0');
    expect(emptyBoard(50).rows[0].label).toBe('0,1');
    expect(emptyBoard(50).cols[0].label).toBe('0');
    expect(emptyBoard(25).cols[4].label).toBe('8,9');
  });

  it('leaves some squares open on the filling board and names the count', () => {
    const grid = fillingBoard();
    const open = openCount(grid);
    expect(open).toBeGreaterThan(0);
    expect(open).toBeLessThan(100);
    expect(grid.label).toContain(`${open} squares still open`);
    expect(grid.squares.filter(s => s.state === 'claimed').every(s => !!s.initials && !!s.color)).toBe(true);
  });

  it('lights the winning square and only its row and column', () => {
    const grid = winningCorner();
    expect(grid.squares.filter(s => s.state === 'win').length).toBe(1);
    expect(grid.squares[4].state).toBe('win');
    expect(grid.rows.map(r => r.hot)).toEqual([false, true, false]);
    expect(grid.cols.map(c => c.hot)).toEqual([false, true, false]);
  });
});
