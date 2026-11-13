---
name: quarterscore-engineering
description: How to build, fix and ship code on QuarterScore (repo paulqlove/angular-squares, Angular 17 + Firebase). Use for any code change, bug fix, refactor, pull request, Firebase rules change or Cloud Function change on QuarterScore, and for the daily site check. Covers architecture and separation of concerns, clean-code rules (DRY, KISS, YAGNI, single responsibility), performance budgets, security checks and the definition of done. Before a PR goes to Paul, run the consolidator skill.
---

# QuarterScore Engineering

Build small, clean, tested changes that fit the code already there. Every rule below is a check you can run against your own diff.

**Source docs (read them, don't repeat them here):**
- `CLAUDE.md`: commands, directory structure, Firebase data shape, game logic, deployment, code-organization order. It wins if it disagrees with this skill.
- `docs/ARCHITECTURE.md`: patterns (standalone components, signals vs BehaviorSubject, SSR lazy-init, service layer, guards), security status and testing approach.
- `docs/DECISIONS.md`: D-017 (Consolidator is its own skill), D-018 (lighter tests), D-019 (split the three oversized files now).

## 1. Before you write code

- [ ] Read `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md` and `docs/DECISIONS.md`. Paul's past picks in DECISIONS.md are settled; don't reopen them.
- [ ] Find the existing pattern for what you're adding (search for a similar component, service or util). Match it. Add a new pattern only when no existing one fits, and say why in the PR.
- [ ] UI work: wait for the CCO design pass, unless Paul said it's a small tweak to just do. Flag any change to where something sits on screen before building it.
- [ ] Write a 3 to 6 line plan: files you'll touch, what changes, how you'll prove it works.

## 2. Architecture and separation of concerns

**Layers**
- Components display state and forward user actions. No Firebase calls, no scoring math, no data reshaping in a component or its template.
- Services in `src/app/core/services/` own data access and app state. Only services import Firebase.
- Pure logic (scoring, winners, splits, formatting) lives in plain functions in a `utils/` file next to the feature, with no Angular or Firebase imports, so it can be unit-tested directly.
- Keep the SSR lazy-getter pattern for every Firebase object (CLAUDE.md, ARCHITECTURE.md). Never init Firebase in a constructor.
- State follows ARCHITECTURE.md: signals for sync state (auth, theme, UI), BehaviorSubject for Firebase streams. No state library.

**Files**
- One concept per file. File name matches the main export (`game-score.utils.ts` exports game score helpers).
- Organize by feature folder (`features/<feature>/...`). Shared UI components go in `components/ui/`, shared directives and helpers in `shared/`, and only once two features use them.
- Follow the section order in `instuctions.md` (constructor, public props, public functions, protected, private; alphabetical inside each).

**Size limits** (hard checks)
| Thing | Limit | When over |
|---|---|---|
| Component or service `.ts` | 400 lines | Split before adding more. Never grow an oversized file. |
| Template | 200 lines | Pull sections into child components. |
| Function or method | 40 lines | Extract named helpers. |
| Function parameters | 4 | Pass an options object or rethink the function. |
| Nesting depth | 3 levels | Early returns, extract a function. |

- No catch-all `utils.ts`, `helpers.ts` or `common.ts`. Name files by what they do.

## 3. Clean code rules

- **DRY, rule of three:** the third copy of the same logic gets one shared home. Two similar blocks may stay apart if they could change for different reasons.
- **YAGNI:** no parameters, options, flags or settings nobody asked for. No "for later" wrappers or abstract base classes with one child.
- **KISS:** the simplest code that passes the tests wins. If a line needs a comment to explain what it does, rewrite the line.
- **Single responsibility:** if you can't name a function or file in a few plain words, it does too much. Split it.
- **Names:** say what it is or does (`lockBoard`, not `handleClick`; `homeNumbers`, not `arr`). Event handlers are named for the action.
- **Types:** no `any`. Use access modifiers and types on every property and function. Prefer `readonly` and `protected` for template-only members.
- **Remove:** dead code, commented-out code, unused imports, `console.log`, TODOs without an owner.
- **Comments** explain why, never what.

## 4. Performance

**Budgets** (field data, 75th percentile, phone)
- Page load (LCP) 2.5 s or less. Tap response (INP) 200 ms or less. Layout shift (CLS) 0.1 or less.
- Keep the `angular.json` bundle budgets (initial warn 1 MB, error 2 MB; component styles warn 2 KB). A PR that grows the initial bundle says by how much.

**Front end**
- `ChangeDetectionStrategy.OnPush` on new components.
- `track` on every `@for`, by a stable id.
- Lazy routes; `@defer` for heavy parts below the fold (videos, heatmap, charts).
- No function calls in templates that do real work; use `computed()`.
- Images and video have width and height set (no layout shift); YouTube stays tap-to-load.

**Firebase and back end**
- Read the narrowest path. Never load a whole list to find one item.
- No database reads or writes inside a loop. Batch with a multi-path `update()`.
- Every `onValue` listener or subscription is cleaned up (`ngOnDestroy`, `takeUntilDestroyed`, or the returned unsubscribe).
- Use the indexes in `liveGames/` and `users/{uid}/games/`; don't scan `games/`. No N+1 fetches (ARCHITECTURE.md flags `getUserGames`).
- Cloud Functions: fetch ESPN once per league per run and share it; keep global setup light for cold starts.

## 5. Security (OWASP Top 10, 2025)

- **Access control (A01):** any change to `database.rules.json` needs a rules test (`npm run test:rules`). Signed in alone never grants write; check owner (`ownerId === auth.uid`) or role. A child rule can't take back what a parent granted, so grant narrowly at the parent.
- **Validation:** rules `.validate` types and lengths for every new field (match existing caps, like hostNote at 140).
- **Injection (A05):** user-typed text never reaches `innerHTML` or `bypassSecurityTrust*`. Those are allowed only on content the app builds itself (the YouTube embed URL, already-escaped marketing copy), with a comment saying why it's safe. Use `SanitizationService` for user text that's displayed.
- **Supply chain (A03):** no new npm package without a one-line reason in the PR and a check that it's maintained. Keep `package-lock.json` committed. Run `npm audit` when deps change.
- **Errors (A10):** no empty `catch`. Failures show the user a short message (toast) and keep the app usable.
- **Secrets:** no keys, tokens or service accounts in the repo or in logs. Firebase web config is public by design; nothing else is.
- Remember: rules deploy separately from hosting (CI deploys hosting only). Say so in the PR when rules change.

## 6. Tests (Paul's call: lighter)

- **Required:** a unit test for any new or changed logic in services and pure utils (scoring, winners, quarter splits, data shaping). The spec file sits next to the file (`x.utils.ts` → `x.utils.spec.ts`).
- **Required:** a rules test for any `database.rules.json` change.
- **UI:** checked by screenshots, not component tests. Phone (Android Chrome width) and desktop, light and dark.
- A bug fix starts with a test that fails without the fix, when the bug is in logic.

## 7. Pull requests

- One purpose per PR. Feature work and cleanup never share a PR.
- Aim for 400 changed lines or fewer. Bigger: split into steps that each build and pass.
- Open as a draft. Description: Before, After, a one-line How, screenshots for UI, bundle size change if any.
- Branch per the session's git rules. Never push to `main`.

## 8. Definition of done

A change is done only when every box is ticked:
- [ ] `npm run build` passes with no new warnings.
- [ ] `npm test` passes; required tests from section 6 exist and pass.
- [ ] `npm run test:rules` passes if rules changed.
- [ ] Size limits in section 2 hold for every file you touched.
- [ ] No `any`, `console.log`, dead or commented-out code in the diff.
- [ ] Screenshots attached for UI changes.
- [ ] The consolidator skill has reviewed the PR and its findings are fixed or listed.
- [ ] Docs updated if behavior changed (CLAUDE.md, DESIGN.md, the agent files named in CLAUDE.md, and DECISIONS.md for any new Paul pick).
- [ ] Nothing goes live without Paul's "Merge N".

## 9. Never

- Ship a feature as one giant file, or paste the same block into several places.
- Add an abstraction, option or layer "for later".
- Skip, disable or weaken a test to get green.
- Touch production data, deploy rules or functions, or merge without Paul's yes.
