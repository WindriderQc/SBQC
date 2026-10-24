# SBQC Public Docker Deployment

`specialblend.ca` is served by host nginx, which should proxy the app to the
Docker-bound loopback port.

## Runtime

```bash
cd /srv/specialblend/SBQC
cp .env.example .env
# fill secrets
./scripts/deploy.sh
```

The container binds to `127.0.0.1:${SBQC_PUBLIC_PORT:-3001}`. Keep nginx on the
host for TLS and public port 80/443.

## nginx sketch

```nginx
location /public-agentx/ {
  alias /srv/specialblend/public-agentx/;
  add_header Cache-Control "public, max-age=31536000, immutable";
}

location ~ ^/public-agentx/(latest|summary|leaderboard|efficiency|snapshots)\.json$ {
  alias /srv/specialblend/public-agentx/$1.json;
  add_header Cache-Control "no-store";
}

location / {
  proxy_pass http://127.0.0.1:3001;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Rollback

First deploy keeps PM2 available by default. If Docker health passes and nginx
is confirmed, set `STOP_PM2_AFTER_HEALTH=true` for a later deploy.

To roll back quickly, repoint nginx to the previous PM2 port or run:

```bash
pm2 restart sbqc_serv
```
