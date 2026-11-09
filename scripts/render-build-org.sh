#!/usr/bin/env bash
set -euo pipefail

printf '\n[org build] Node version\n'
node --version
printf '\n[org build] pnpm version\n'
pnpm --version
printf '\n[org build] Install build dependencies\n'
pnpm install --frozen-lockfile --prod=false --reporter=append-only
printf '\n[org build] Generate database client\n'
pnpm -F @mgl/database run db:generate
printf '\n[org build] Build org application\n'
pnpm turbo build --filter=@mgl/org
