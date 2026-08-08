#!/usr/bin/env bash
# Redeploy on the Nest container (hackclub.app, user karman):
#   ssh karman@hackclub.app /root/back-to-basics/deploy/deploy.sh
# Secrets live in /root/back-to-basics/.env.local (chmod 600, not in git).
set -euo pipefail

cd "$(dirname "$0")/.."

git pull --ff-only origin main
npm ci
npm run build
systemctl restart b2b
sleep 2
systemctl --no-pager --lines=10 status b2b
