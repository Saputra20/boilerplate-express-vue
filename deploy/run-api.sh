#!/usr/bin/env bash
set -euo pipefail
cd /root/projects/safial_cms/apps/api
set -a
source /root/projects/safial_cms/apps/api/.env
set +a
exec /root/.bun/bin/bun src/server.ts
