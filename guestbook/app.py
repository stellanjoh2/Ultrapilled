"""Gunicorn entry: `gunicorn app:application`.

Env (Fly secrets in production):
  TURNSTILE_SECRET_KEY   Cloudflare Turnstile secret (required unless GUESTBOOK_DEV=1)
  ISSO_HASH_SALT         Long random string for author hashes
  SMTP_PASSWORD          SMTP password (Gmail app password, or a Resend API key)
  SMTP_FROM              Sender, e.g. "Ultrapilled Guestbook <you@gmail.com>"
  SMTP_TO                Moderator inbox for approve / delete links
  SMTP_HOST / SMTP_PORT / SMTP_USERNAME / SMTP_SECURITY
                         Override isso.cfg's Resend defaults (smtp.resend.com:465, ssl, "resend")
  ALLOWED_ORIGINS        Space-separated, default https://ultrapilled.com
  TURNSTILE_HOSTNAMES    Space-separated, default ultrapilled.com
  ISSO_DBPATH            Default /data/guestbook.db
  ISSO_PUBLIC_ENDPOINT   Default https://guestbook.ultrapilled.com
  GUESTBOOK_DEV=1        Local only: skip Turnstile, log moderation links to stdout
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from isso import config, make_app

from gate import GateSettings, GuestbookGate

HERE = Path(__file__).resolve().parent


def _env_list(name: str, default: str) -> tuple[str, ...]:
    return tuple(v for v in os.environ.get(name, default).split() if v)


def build_conf():
    conf = config.load(config.default_file(), str(HERE / "isso.cfg"))
    dev = os.environ.get("GUESTBOOK_DEV") == "1"
    origins = _env_list("ALLOWED_ORIGINS", "https://ultrapilled.com")

    conf.set("general", "host", "\n".join(origins))
    conf.set("general", "dbpath", os.environ.get("ISSO_DBPATH", "/data/guestbook.db"))
    conf.set("server", "public-endpoint", os.environ.get("ISSO_PUBLIC_ENDPOINT", "https://guestbook.ultrapilled.com"))

    salt = os.environ.get("ISSO_HASH_SALT", "")
    if not salt and not dev:
        raise RuntimeError("ISSO_HASH_SALT is required")
    conf.set("hash", "salt", salt or "dev-only-salt")

    if dev:
        conf.set("general", "notify", "stdout")
    else:
        for key, env in (("password", "SMTP_PASSWORD"), ("from", "SMTP_FROM"), ("to", "SMTP_TO")):
            value = os.environ.get(env, "")
            if not value:
                raise RuntimeError(f"{env} is required so new entries reach the moderation inbox")
            conf.set("smtp", key, value)
        for key, env in (("host", "SMTP_HOST"), ("port", "SMTP_PORT"), ("username", "SMTP_USERNAME"),
                         ("security", "SMTP_SECURITY")):
            if os.environ.get(env):
                conf.set("smtp", key, os.environ[env])
    return conf, origins, dev


def build_app():
    logging.basicConfig(level=logging.INFO)
    conf, origins, dev = build_conf()
    settings = GateSettings(
        allowed_origins=origins,
        turnstile_hostnames=_env_list("TURNSTILE_HOSTNAMES", "ultrapilled.com"),
        turnstile_secret=os.environ.get("TURNSTILE_SECRET_KEY", ""),
        allow_missing_turnstile=dev,
        trust_fly_client_ip=bool(os.environ.get("FLY_APP_NAME")),
    )
    return GuestbookGate(make_app(conf), settings)


application = build_app()
