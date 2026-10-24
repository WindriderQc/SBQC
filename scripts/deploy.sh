#!/usr/bin/env sh
set -eu

DEPLOY_PATH="${DEPLOY_PATH:-/srv/specialblend/SBQC}"
PUBLIC_ASSET_HOST_PATH="${PUBLIC_ASSET_HOST_PATH:-/srv/specialblend/public-agentx}"
SBQC_PUBLIC_PORT="${SBQC_PUBLIC_PORT:-3001}"
export SBQC_ENV_FILE="${SBQC_ENV_FILE:-.env}"
STOP_PM2_AFTER_HEALTH="${STOP_PM2_AFTER_HEALTH:-false}"
OLD_PM2_NAME="${OLD_PM2_NAME:-sbqc_serv}"

cd "$DEPLOY_PATH"

mkdir -p "$PUBLIC_ASSET_HOST_PATH"

if [ ! -f .env ]; then
  echo "Missing .env in $DEPLOY_PATH. Copy .env.example and fill secrets before deploying." >&2
  exit 1
fi

docker compose build sbqc-public
docker compose up -d sbqc-public

echo "Waiting for local health check..."
i=0
until curl -fsS "http://127.0.0.1:${SBQC_PUBLIC_PORT}/healthz" >/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 30 ]; then
    echo "Health check failed; recent container logs:" >&2
    docker compose logs --tail=80 sbqc-public >&2
    exit 1
  fi
  sleep 2
done

if [ "$STOP_PM2_AFTER_HEALTH" = "true" ] && command -v pm2 >/dev/null 2>&1; then
  pm2 stop "$OLD_PM2_NAME" || true
  pm2 save || true
fi

echo "SBQC public Docker deployment is healthy on 127.0.0.1:${SBQC_PUBLIC_PORT}."
