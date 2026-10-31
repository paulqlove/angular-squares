# Cutover checklist — Tuesday, November 3, 2026

GitHub Pages keeps serving quarterscore.com until the DNS steps below. Merging the hosting PR deploys only `https://squares-4e4f7.web.app`. It does not change DNS, the `gh-pages` branch, or `src/CNAME`.

Do this mid-morning US Central, away from a game. The project is on the Spark plan: Hosting only, no Cloud Functions.

## Before Tuesday

- [ ] Create the Actions secret `FIREBASE_SERVICE_ACCOUNT_SQUARES_4E4F7` (steps are in the hosting PR).
- [ ] Open a pull request and confirm the preview workflow comments with a `squares-4e4f7--pr<N>-….web.app` URL. Re-run it if the first attempt failed before the secret existed.
- [ ] After the first live deploy, check `https://squares-4e4f7.web.app`:
  - [ ] `/`, `/dashboard`, and `/game/<real-id>` return 200. `/` is `cache-control: no-cache`.
  - [ ] A hashed `*.js` bundle is `public, max-age=31536000, immutable`. `/assets/fonts/roboto-latin.woff2` is the same.
  - [ ] `/robots.txt` and `/sitemap.xml` return 200.
  - [ ] `/no-such-page` and `/game/abc/extra` return 404 with the “Page not found” page.
- [ ] Firebase console → Authentication → Settings → Authorized domains: add `squares-4e4f7.web.app` and the preview host if you sign in there.
- [ ] In Cloudflare, write down the live GitHub Pages records before changing them: apex A `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `www` CNAME `paulqlove.github.io`. Note whether each row is DNS only or proxied.

## Monday — verify the domain (Pages still serves traffic)

- [ ] Firebase console → Hosting → Add custom domain → `quarterscore.com`. Set `www.quarterscore.com` to redirect to the apex.
- [ ] Cloudflare → quarterscore.com → DNS → Records. Add the TXT record the console shows. **DNS only (grey cloud).** TTL 5 minutes. This does not move traffic.
- [ ] If the console asks for `_acme-challenge`, add that TXT the same way so the certificate can be issued before the swap.
- [ ] Wait until Hosting says **Verified**.

## Tuesday, November 3 — cut over

Every new Firebase record stays **DNS only (grey cloud)**. An orange-cloud proxy blocks verification and the certificate. Use the IP and hostname from the Firebase console, not a copied example. Add no AAAA record unless the console lists one. TTL 5 minutes.

- [ ] Replace the four GitHub A records with the A record(s) Firebase shows.
- [ ] Point `www` at Firebase (CNAME to `squares-4e4f7.web.app`, or the record the console gives) and remove the `paulqlove.github.io` CNAME.
- [ ] GitHub → Settings → Pages → remove the custom domain `quarterscore.com`. Leave Pages enabled so `paulqlove.github.io/angular-squares` stays up.
- [ ] Watch Hosting move from Pending to Minting certificate to Connected.
- [ ] Confirm `https://quarterscore.com` and `https://www.quarterscore.com` (www redirects to the apex, HTTP redirects to HTTPS), then repeat the URL checks from “Before Tuesday”.

## Rollback

- **Bad release:** Firebase console → Hosting → Release history → Rollback. Or `firebase hosting:clone squares-4e4f7:live@<previous> squares-4e4f7:live`.
- **DNS trouble:** In Cloudflare, put back the four GitHub A records and the `www` CNAME to `paulqlove.github.io`. Re-add `quarterscore.com` under GitHub Pages and turn Enforce HTTPS back on after its certificate returns. At TTL 300 this is about 5 minutes, plus however long Pages takes to reissue the certificate.
- Keep the Pages deploy for two weeks, then retire the `gh-pages` target.

## After 24–48 hours stable

- [ ] Raise the Cloudflare TTLs to 3600.
- [ ] In Google Search Console, add the property and submit `https://quarterscore.com/sitemap.xml`.
