// Shared settings for the video recorder. Sizes and colors follow the storyboards'
// production notes and docs/DESIGN.md (Field look).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const AUTH_DIR = join(ROOT, '.auth');
export const HOST_STATE = join(AUTH_DIR, 'host.json');
export const LEDGER = join(AUTH_DIR, 'ledger.json');
export const OUT_DIR = join(ROOT, 'out');

export const DEFAULT_BASE_URL = 'https://quarterscore.com';

/** Every board the recorder makes starts with this, so a person can tell it apart at a glance. */
export const DEMO_GAME_NAME = 'Sunday squares';
export const DEMO_AWAY = 'Harbor';
export const DEMO_HOME = 'Riverside';
export const DEMO_NOTE = 'Snacks at halftime!';

/** Invented seed players, per the storyboards. Never real people. */
export const SEED_NAMES = [
  'Sam', 'Alex', 'Priya', 'Marcus', 'Dana', 'Leo', 'Nina', 'Omar', 'Tess', 'Ray',
  'Kai', 'Maya', 'Ben', 'Rosa', 'Eli', 'June', 'Theo', 'Lena', 'Max', 'Ivy',
];

export const COLORS = {
  navy: '#0f172a',
  paper: '#f3efe8',
  emerald: '#047857',
  amber: '#fbbf24',
};

/**
 * Phone: an iPhone-sized viewport at 3x, captured at 1080 wide.
 * Desktop: the storyboards' window (1440x810 at 125% zoom) is a 1152x648 CSS viewport,
 * captured at 1920x1080.
 */
export const DEVICES = {
  phone: {
    label: 'phone',
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
    capture: { width: 1080, height: 2338 },
  },
  desktop: {
    label: 'desktop',
    context: {
      viewport: { width: 1152, height: 648 },
      deviceScaleFactor: 1920 / 1152,
      isMobile: false,
      hasTouch: false,
    },
    capture: { width: 1920, height: 1080 },
  },
};

/** The 9:16 social frame: the phone sits in the top of a paper frame, clear of the bottom 20% and right 12%. */
export const SOCIAL = { width: 1080, height: 1920, phoneHeight: 1430, top: 96 };

export const FPS = 60;
