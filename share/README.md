# Ultrapilled temporary share links

Stores opt-in `.pill` projects for **14 days**, served at `https://share.ultrapilled.com`. The site opens them via `https://ultrapilled.com/?r=<id>`.

## Local

```bash
cd share
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
SHARE_DEV=1 SHARE_DATA_DIR=/tmp/ultrapilled-share \
  ALLOWED_ORIGINS="http://localhost:5173 http://127.0.0.1:5173" \
  .venv/bin/gunicorn --bind 127.0.0.1:8081 app:application
```

`SHARE_DEV=1` skips Turnstile. `npm run dev` points at `localhost:8081` when `VITE_SHARE_API_URL` is unset.

```bash
cd share && python3 -m unittest -v
```

## Deploy (first time)

```bash
brew install flyctl && fly auth login
cd share
fly launch --copy-config --no-deploy
fly volumes create share_data --region arn --size 3
fly secrets set TURNSTILE_SECRET_KEY=...
fly deploy
fly certs add share.ultrapilled.com
```

DNS: `CNAME share → ultrapilled-share.fly.dev` (whatever `fly certs add` prints).

Reuse the same Turnstile widget as the guestbook / bug report (`ultrapilled.com` + `localhost` hostnames). The client sends `action: share`.

Later deploys: `cd share && fly deploy`.

## Limits

| Rule | Value |
| --- | --- |
| TTL | 14 days, then hard delete |
| Max body | 8 MiB |
| Creates / IP | 5 / hour, 20 / day |
| No public index | unlisted IDs only |
