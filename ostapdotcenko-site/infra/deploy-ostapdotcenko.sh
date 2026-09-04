#!/bin/bash
set -e
REPO_DIR=/opt/ostapdotcenko-myfirst
SITE_DIR=$REPO_DIR/ostapdotcenko-site
STATE_FILE=/opt/.ostapdotcenko-last-sha
export GIT_SSH_COMMAND="ssh -i /root/.ssh/myfirst_deploy -o StrictHostKeyChecking=accept-new"

cd "$REPO_DIR"
git fetch origin ostapdotcenko-deploy --quiet
REMOTE_SHA=$(git rev-parse origin/ostapdotcenko-deploy)
LOCAL_SHA=$(cat "$STATE_FILE" 2>/dev/null || echo "")

if [ "$REMOTE_SHA" != "$LOCAL_SHA" ]; then
  echo "$(date): new commit $REMOTE_SHA, deploying..."
  git reset --hard origin/ostapdotcenko-deploy --quiet
  cd "$SITE_DIR"
  npm install --silent
  npm run build --silent
  cp -a dist/. /var/www/ostapdotcenko.ru/
  echo "$REMOTE_SHA" > "$STATE_FILE"
  echo "$(date): deployed $REMOTE_SHA"
fi
