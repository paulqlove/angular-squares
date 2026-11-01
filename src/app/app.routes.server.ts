/**
 * Angular 17 has no `@angular/ssr` `outputMode` or `RenderMode` (those arrived
 * in Angular 19). The equivalent is `prerender` in `angular.json`:
 * `discoverRoutes: false` plus `routesFile: prerender-routes.txt`.
 *
 * `scripts/build-content.mjs` writes that file from `app.routes.ts` and
 * `content/blog`. Dashboard and `game/:gameId` are left out, so they stay a
 * client-rendered SPA. Firebase Hosting serves the prerendered HTML files and
 * rewrites every other URL to `/spa.html`.
 */
export const CLIENT_RENDERED_ROUTES = ['dashboard', 'game/:gameId'] as const;
