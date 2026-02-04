# Football Squares (Angular Squares)

Real-time multiplayer Super Bowl squares game with Firebase backend.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Angular 17 (standalone components) |
| **Styling** | Tailwind CSS 3.4 + SCSS |
| **State** | Angular Signals + RxJS |
| **Backend** | Firebase (Auth + Realtime Database) |
| **Deployment** | GitHub Pages |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Angular App                          │
├─────────────────────────────────────────────────────────┤
│  Routes: / (welcome) | /dashboard | /game/:gameId       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ AuthService │  │ GameService │  │  Firebase   │     │
│  │  (Signals)  │  │ (RxJS/RTDB) │  │    Auth     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Key Directories

```
src/app/
├── core/           # Services (Auth, Game), guards
├── features/       # Pages (welcome, dashboard, super-bowl-squares)
├── components/ui/  # Reusable components (toggle, dialog)
└── shared/         # Directives, utilities
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
npm install
npm start  # Dev server at localhost:4200
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server |
| `npm run build` | Production build |
| `npm test` | Run Karma + Jasmine tests |

## Features

- 10x10 game board with player colors (31 color variants)
- Real-time score tracking (4 quarters)
- Number randomization with animation
- Payment tracking (Venmo integration)
- Probability heatmap (historical NFL data)
- Multi-game support with shareable 6-character codes
- Google/Email/Guest authentication
- Game ownership and permissions

## Documentation

- [Enhancement Plan](./ENHANCEMENT_PLAN.md) - Full roadmap
- [TODO](./docs/TODO.md) - Current task tracking
