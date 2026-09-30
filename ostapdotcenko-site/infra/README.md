# Deploy infrastructure (VPS 80.78.241.224)

Backup of the server-side setup that is NOT tracked anywhere else in git — the
site's own repo history only covers the code/content, not the VPS config.
If the server is ever rebuilt, restore in this order:

1. Install nginx + certbot, put `nginx-ostapdotcenko.ru.conf` into
   `/etc/nginx/sites-available/ostapdotcenko.ru`, symlink into
   `sites-enabled/`, and re-issue the Let's Encrypt cert for
   `ostapdotcenko.ru` + `www.ostapdotcenko.ru`.
2. Clone `Ostap-87/MyFirst` (branch `ostapdotcenko-deploy`) to
   `/opt/ostapdotcenko-myfirst`, using a **read-only deploy key** for that repo
   at `/root/.ssh/myfirst_deploy` (generate a new keypair, add the public half
   as a deploy key on the GitHub repo — the private key itself was never
   committed anywhere and needs to be regenerated).
3. Put `deploy-ostapdotcenko.sh` at `/opt/deploy-ostapdotcenko.sh`
   (`chmod +x`).
4. Add this crontab entry (`crontab -e` as root):
   ```
   */2 * * * * /opt/deploy-ostapdotcenko.sh >> /var/log/ostapdotcenko-deploy.log 2>&1
   ```
5. Ensure `/var/www/ostapdotcenko.ru` exists and is writable by root — the
   poller copies the built `dist/` there every ~2 minutes when
   `ostapdotcenko-deploy` has a new commit.
6. **Auto-post to Facebook/LinkedIn (added 30.09.2026).** After every deploy
   that picks up a new commit, the poller now also runs
   `scripts/auto-post-new-articles.mjs` — it diffs the slugs in
   `src/i18n/ru.ts` against `/opt/.ostapdotcenko-posted-slugs` and posts any
   new, already-translated (has an `en.ts` entry) article to Facebook (RU) +
   LinkedIn (EN) via `scripts/post-to-facebook.mjs`, then records the slug so
   it's never posted twice. **This state file must be seeded manually before
   the first run**, or every already-published article will get posted at
   once:
   ```
   cat > /opt/.ostapdotcenko-posted-slugs <<'EOF'
   megamarket-seller-growth-350
   asia-robot-coffee-2026
   three-days-shanghai-china-expert
   chicken-palate-noodles-no-regrets
   wrc-2026-beijing-robots-stopped-dancing
   china-central-kitchens-food-industry
   china-central-kitchens-drinks-industry
   china-central-kitchens-russia-vs-china
   asia-drinks-japan-coffee-bubble-tea
   asia-drinks-korea-coffee-war-bubble-tea
   asia-drinks-vietnam-robusta-coffee-egg-coffee
   asia-drinks-thailand-cafe-amazon-chatramue
   asia-drinks-malaysia-zus-tealive-oldtown
   asia-drinks-india-coffee-tea-paradox
   asia-drinks-indonesia-charcoal-civet-coffee
   asia-drinks-laos-cambodia-coffee-superpower-gas-station
   EOF
   ```
   (This list is the full slug set as of 30.09.2026, including the
   Laos/Cambodia article, which was published to the blog that day but not
   yet cross-posted — seeded here deliberately so the new automation doesn't
   fire on it without being asked; post it manually with
   `node scripts/post-to-facebook.mjs asia-drinks-laos-cambodia-coffee-superpower-gas-station`
   if it should go out too.) Every article published *after* this seed step
   is picked up automatically on the next deploy — no manual step 2.5.1 run
   needed going forward. `AGENT_GUIDE.md` section 2.5.1 stays as a manual
   fallback (e.g. to re-post something, or if the VPS-side step ever fails).

The poller tracks the last-deployed commit SHA in `/opt/.ostapdotcenko-last-sha`
and only rebuilds when `origin/ostapdotcenko-deploy` moves.
