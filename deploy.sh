#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git pull
docker compose -f docker-compose.app.yml up -d --build
