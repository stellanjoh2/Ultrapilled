# Ultrapilled guestbook

[Isso](https://github.com/isso-comments/isso) behind a spam gate (`gate.py`), served at `https://guestbook.ultrapilled.com` from Fly.io. The site's overlay (`src/guestbookPanel.ts`) talks to it directly.

## Spam protection

| Layer | Where |
| --- | --- |
| Origin allowlist (`https://ultrapilled.com` only) | gate |
| Cloudflare Turnstile, verified server-side incl. hostname + `guestbook` action; fails closed if the secret is missing | gate |
| Honeypot field — bots get a fake "pending" reply, nothing stored | gate |
| No links / emails, 1–40 char name, ≥5 words / ≤500 chars, control + bidi chars stripped | gate (+ mirrored in the client) |
| 3 entries / 10 min and 6 / day per IP; 30 / hour and 150 / day site-wide | gate |
| 1 entry / minute and 3 entries total per /24 network | Isso guard |
| Every entry held for approval by email; unapproved entries purged after 30 days | Isso moderation |
| Only `GET /`, `POST /new` for `/guestbook` and moderation links reachable; admin, edit, delete, votes, feeds, embed JS all 404 | gate |

## Local

```bash
cd guestbook
uv venv && uv pip install -r requirements.txt
python -m unittest -v
GUESTBOOK_DEV=1 ISSO_DBPATH=/tmp/gb.db ALLOWED_ORIGINS=http://localhost:5173 \
  .venv/bin/gunicorn --bind 127.0.0.1:8080 app:application
```

`GUESTBOOK_DEV=1` skips Turnstile and prints approve/delete links to stdout instead of emailing. `npm run dev` points at `localhost:8080` automatically.

## Deploy (first time)

```bash
brew install flyctl && fly auth login
cd guestbook
fly launch --copy-config --no-deploy
fly volumes create guestbook_data --region arn --size 1
fly secrets set \
  TURNSTILE_SECRET_KEY=... \
  ISSO_HASH_SALT="$(openssl rand -hex 32)" \
  SMTP_PASSWORD=re_... \
  SMTP_FROM="Ultrapilled Guestbook <guestbook@YOUR-RESEND-VERIFIED-DOMAIN>" \
  SMTP_TO=you@example.com
fly deploy
fly certs add guestbook.ultrapilled.com
```

Then add the DNS record `fly certs add` prints (a `CNAME guestbook → ultrapilled-guestbook.fly.dev`) at the ultrapilled.com registrar, and wait for `fly certs check guestbook.ultrapilled.com` to go green.

- `TURNSTILE_SECRET_KEY` is the same widget secret the Orby bug-report API uses; the widget must list `ultrapilled.com`.
- Production sends through Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURITY=ssl`, `SMTP_USERNAME` = the Gmail address, `SMTP_PASSWORD` = a Google app password. Without those overrides, `isso.cfg` defaults to Resend (`SMTP_PASSWORD` = API key, sender on a verified domain).

Later deploys: `cd guestbook && fly deploy`.

## Moderating

Each new entry emails `SMTP_TO` with **Activate** and **Delete** links. To remove an approved entry later, use its Delete link from that email.
