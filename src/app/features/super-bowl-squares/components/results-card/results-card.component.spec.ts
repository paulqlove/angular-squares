import { shareData } from './results-card.component';

describe('shareData', () => {
  it('shares only the one picture, with no title or text', () => {
    const file = new File(['png'], 'quarterscore-results.png', { type: 'image/png' });
    expect(shareData(file)).toEqual({ files: [file] });
  });
});
