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

The poller tracks the last-deployed commit SHA in `/opt/.ostapdotcenko-last-sha`
and only rebuilds when `origin/ostapdotcenko-deploy` moves.
