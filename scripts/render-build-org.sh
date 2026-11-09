#!/usr/bin/env bash
set -euo pipefail

printf '\n[org build] Node version\n'
node --version
printf '\n[org build] pnpm version\n'
pnpm --version
printf '\n[org build] Install build dependencies\n'
install_log="$(mktemp)"
if ! pnpm --filter @mgl/org... --filter @mgl/database... --filter mgl-store install --frozen-lockfile --prod=false --reporter=append-only >"$install_log" 2>&1; then
  cat "$install_log"
  rm -f "$install_log"
  exit 1
fi
cat "$install_log"
rm -f "$install_log"
printf '\n[org build] Generate database client\n'
pnpm -F @mgl/database run db:generate
printf '\n[org build] Build org application\n'
pnpm turbo build --filter=@mgl/org
