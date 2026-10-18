"""Temporary .pill share links for Ultrapilled.

Gunicorn: `gunicorn app:application`

Env:
  TURNSTILE_SECRET_KEY   Cloudflare Turnstile secret (required unless SHARE_DEV=1)
  ALLOWED_ORIGINS        Space-separated, default https://ultrapilled.com
  TURNSTILE_HOSTNAMES    Space-separated, default ultrapilled.com
  SHARE_DATA_DIR         Default /data
  SHARE_TTL_DAYS         Default 14
  SHARE_MAX_BYTES        Default 8388608 (8 MiB)
  SHARE_DEV=1            Local only: skip Turnstile
  SITE_ORIGIN            Human redirect target, default https://ultrapilled.com
"""

from __future__ import annotations

import base64
import html
import json
import logging
import os
import re
import sqlite3
import threading
import time
import urllib.parse
import urllib.request
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

from store import ShareStore

TURNSTILE_ACTION = "share"
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
ID_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")
PREVIEW_MAX_BYTES = 200_000
# Pill + base64 preview envelope headroom.
CREATE_ENVELOPE_EXTRA = PREVIEW_MAX_BYTES + 80_000

Verifier = Callable[[str, str], dict]


@dataclass
class Window:
    limit: int
    seconds: float


@dataclass
class Settings:
    allowed_origins: tuple[str, ...]
    turnstile_hostnames: tuple[str, ...]
    turnstile_secret: str = ""
    allow_missing_turnstile: bool = False
    trust_fly_client_ip: bool = False
    rate_dbpath: str = ""
    # Where humans land after the OG card (ultrapilled.com).
    site_origin: str = "https://ultrapilled.com"
    # 5 / hour and 20 / day per IP; modest global caps.
    write_per_ip: tuple[Window, ...] = (Window(5, 3600), Window(20, 86400))
    write_global: tuple[Window, ...] = (Window(120, 3600), Window(800, 86400))
    read_per_ip: tuple[Window, ...] = (Window(120, 60), Window(1200, 3600))
    read_global: tuple[Window, ...] = (Window(600, 60), Window(10000, 3600))


class RateLimiter:
    GLOBAL = "__global__"

    def __init__(
        self,
        per_key: Iterable[Window],
        global_windows: Iterable[Window],
        clock=None,
        dbpath: str | None = None,
        namespace: str = "",
    ):
        self.per_key = tuple(per_key)
        self.global_windows = tuple(global_windows)
        self.clock = clock or (time.monotonic if not dbpath else time.time)
        self.dbpath = dbpath
        self.namespace = namespace
        self.lock = threading.Lock()
        self.hits: dict[str, deque[float]] = {}
        self.global_hits: deque[float] = deque()
        if dbpath:
            parent = Path(dbpath).parent
            if str(parent) not in ("", "."):
                parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(dbpath) as db:
                db.execute("CREATE TABLE IF NOT EXISTS hits (bucket TEXT NOT NULL, ts REAL NOT NULL)")
                db.execute("CREATE INDEX IF NOT EXISTS idx_hits_bucket_ts ON hits (bucket, ts)")

    def _bucket(self, key: str) -> str:
        return f"{self.namespace}:{key}" if self.namespace else key

    @staticmethod
    def _retry(hits: list[float] | deque[float], windows: tuple[Window, ...], now: float) -> float:
        wait = 0.0
        for window in windows:
            recent = [t for t in hits if now - t < window.seconds]
            if len(recent) >= window.limit:
                wait = max(wait, window.seconds - (now - recent[-window.limit]))
        return wait

    def check(self, key: str) -> float:
        with self.lock:
            if self.dbpath:
                return self._check_db(key)
            return self._check_memory(key)

    def _check_memory(self, key: str) -> float:
        now = self.clock()
        horizon = max([w.seconds for w in self.per_key + self.global_windows] or [0])
        hits = self.hits.setdefault(self._bucket(key), deque())
        for bucket in (hits, self.global_hits):
            while bucket and now - bucket[0] >= horizon:
                bucket.popleft()
        wait = max(self._retry(hits, self.per_key, now), self._retry(self.global_hits, self.global_windows, now))
        if wait > 0:
            return wait
        hits.append(now)
        self.global_hits.append(now)
        if len(self.hits) > 10000:
            self.hits = {k: v for k, v in self.hits.items() if v}
        return 0.0

    def _check_db(self, key: str) -> float:
        now = float(self.clock())
        horizon = max([w.seconds for w in self.per_key + self.global_windows] or [0])
        cutoff = now - horizon
        ip_bucket = self._bucket(key)
        global_bucket = self._bucket(self.GLOBAL)
        with sqlite3.connect(self.dbpath) as db:
            db.execute("DELETE FROM hits WHERE ts < ?", (cutoff,))
            ip_hits = [
                row[0]
                for row in db.execute(
                    "SELECT ts FROM hits WHERE bucket = ? AND ts >= ? ORDER BY ts",
                    (ip_bucket, cutoff),
                )
            ]
            global_hits = [
                row[0]
                for row in db.execute(
                    "SELECT ts FROM hits WHERE bucket = ? AND ts >= ? ORDER BY ts",
                    (global_bucket, cutoff),
                )
            ]
            wait = max(self._retry(ip_hits, self.per_key, now), self._retry(global_hits, self.global_windows, now))
            if wait > 0:
                return wait
            db.executemany(
                "INSERT INTO hits (bucket, ts) VALUES (?, ?)",
                ((ip_bucket, now), (global_bucket, now)),
            )
        return 0.0


def verify_turnstile(secret: str, token: str, remote_ip: str) -> dict:
    data = urllib.parse.urlencode({"secret": secret, "response": token, "remoteip": remote_ip}).encode()
    req = urllib.request.Request(TURNSTILE_VERIFY_URL, data=data, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return {"success": False, "error-codes": ["verify-unreachable"]}


def _env_list(name: str, default: str) -> tuple[str, ...]:
    return tuple(v for v in os.environ.get(name, default).split() if v)


def validate_pill_json(raw: bytes) -> dict | None:
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        return None
    if not isinstance(payload, dict):
        return None
    if payload.get("ultrapilled") != "project":
        return None
    if payload.get("v") != 1:
        return None
    if not isinstance(payload.get("state"), dict):
        return None
    return payload


class ShareApp:
    def __init__(
        self,
        store: ShareStore,
        settings: Settings,
        verifier: Verifier | None = None,
        write_limiter: RateLimiter | None = None,
        read_limiter: RateLimiter | None = None,
    ):
        self.store = store
        self.settings = settings
        self.verifier = verifier or (
            lambda token, ip: verify_turnstile(settings.turnstile_secret, token, ip)
        )
        rate_db = settings.rate_dbpath or None
        self.write_limiter = write_limiter or RateLimiter(
            settings.write_per_ip, settings.write_global, dbpath=rate_db, namespace="write"
        )
        self.read_limiter = read_limiter or RateLimiter(
            settings.read_per_ip, settings.read_global, dbpath=rate_db, namespace="read"
        )
        self.store.purge_expired()

    def __call__(self, environ, start_response):
        if self.settings.trust_fly_client_ip:
            fly_ip = environ.get("HTTP_FLY_CLIENT_IP", "").strip()
            if fly_ip:
                environ["REMOTE_ADDR"] = fly_ip
        environ.pop("HTTP_X_FORWARDED_FOR", None)

        method = environ.get("REQUEST_METHOD", "GET")
        path = environ.get("PATH_INFO", "") or "/"
        ip = environ.get("REMOTE_ADDR", "") or "unknown"

        if path == "/healthz" and method in ("GET", "HEAD"):
            return self._json(environ, start_response, 200, {"ok": True})

        if path == "/r" and method == "OPTIONS":
            if not self._origin_ok(environ):
                return self._json(environ, start_response, 403, {"error": "Origin not allowed", "code": "origin_denied"})
            return self._preflight(environ, start_response)

        if path == "/r" and method == "POST":
            return self._create(environ, start_response, ip)

        open_match = re.fullmatch(r"/o/([A-Za-z0-9_-]{16,64})", path)
        if open_match and method in ("GET", "HEAD"):
            return self._open_card(environ, start_response, open_match.group(1), ip)

        og_match = re.fullmatch(r"/r/([A-Za-z0-9_-]{16,64})/og\.jpg", path)
        if og_match and method in ("GET", "HEAD"):
            return self._og_jpeg(environ, start_response, og_match.group(1), ip)

        match = re.fullmatch(r"/r/([A-Za-z0-9_-]{16,64})", path)
        if match and method in ("GET", "HEAD"):
            return self._fetch(environ, start_response, match.group(1), ip)

        if match and method == "OPTIONS":
            if not self._origin_ok(environ):
                return self._json(environ, start_response, 403, {"error": "Origin not allowed", "code": "origin_denied"})
            return self._preflight(environ, start_response)

        return self._json(environ, start_response, 404, {"error": "Not found", "code": "not_found"})

    def _origin_ok(self, environ) -> bool:
        return environ.get("HTTP_ORIGIN", "") in self.settings.allowed_origins

    def _preflight(self, environ, start_response):
        origin = environ.get("HTTP_ORIGIN", "")
        headers = [
            ("Content-Length", "0"),
            ("Access-Control-Allow-Origin", origin),
            ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
            ("Access-Control-Allow-Headers", "Content-Type"),
            ("Access-Control-Max-Age", "86400"),
            ("Vary", "Origin"),
        ]
        start_response("204 No Content", headers)
        return [b""]

    def _create(self, environ, start_response, ip: str):
        if not self._origin_ok(environ):
            return self._json(environ, start_response, 403, {"error": "Origin not allowed", "code": "origin_denied"})

        if not environ.get("CONTENT_TYPE", "").startswith("application/json"):
            return self._json(environ, start_response, 415, {"error": "JSON only", "code": "content_type"})

        try:
            length = int(environ.get("CONTENT_LENGTH") or 0)
        except ValueError:
            length = 0
        # Envelope overhead; pill itself is capped by max_bytes after parse.
        if length <= 0 or length > self.store.max_bytes + CREATE_ENVELOPE_EXTRA:
            return self._json(environ, start_response, 413, {"error": "Share is too large", "code": "too_large"})

        try:
            body = json.loads(environ["wsgi.input"].read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self._json(environ, start_response, 400, {"error": "Invalid JSON", "code": "bad_json"})
        if not isinstance(body, dict):
            return self._json(environ, start_response, 400, {"error": "Invalid JSON", "code": "bad_json"})

        rejected = self._turnstile_rejection(body, ip)
        if rejected:
            status, payload = rejected
            return self._json(environ, start_response, status, payload)

        project = body.get("project")
        if isinstance(project, str):
            try:
                project = json.loads(project)
            except ValueError:
                return self._json(environ, start_response, 400, {"error": "Invalid project", "code": "bad_pill"})
        if not isinstance(project, dict):
            return self._json(environ, start_response, 400, {"error": "Project is required", "code": "missing"})

        try:
            pill_bytes = json.dumps(project, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        except (TypeError, ValueError):
            return self._json(environ, start_response, 400, {"error": "Invalid project", "code": "bad_pill"})

        if len(pill_bytes) > self.store.max_bytes:
            return self._json(environ, start_response, 413, {"error": "Share is too large", "code": "too_large"})

        if validate_pill_json(pill_bytes) is None:
            return self._json(environ, start_response, 400, {"error": "Not a valid .pill project", "code": "bad_pill"})

        preview = decode_preview_jpeg(body.get("previewJpeg"))

        wait = self.write_limiter.check(ip)
        if wait > 0:
            return self._rate_limited(environ, start_response, wait)

        try:
            share_id, _created, expires = self.store.put(pill_bytes, ip, preview=preview)
        except ValueError:
            return self._json(environ, start_response, 413, {"error": "Share is too large", "code": "too_large"})
        except Exception:
            logging.exception("share put failed")
            return self._json(environ, start_response, 500, {"error": "Could not store share", "code": "store_failed"})

        return self._json(
            environ,
            start_response,
            201,
            {
                "id": share_id,
                "expiresAt": int(expires),
                "urlHint": f"/o/{share_id}",
            },
        )

    def _fetch(self, environ, start_response, share_id: str, ip: str):
        origin = environ.get("HTTP_ORIGIN", "")
        if origin and origin not in self.settings.allowed_origins:
            return self._json(environ, start_response, 403, {"error": "Origin not allowed", "code": "origin_denied"})

        if not ID_RE.fullmatch(share_id):
            return self._json(environ, start_response, 404, {"error": "Not found", "code": "not_found"})

        wait = self.read_limiter.check(ip)
        if wait > 0:
            return self._rate_limited(environ, start_response, wait)

        self.store.purge_expired()
        got = self.store.get(share_id)
        if got is None:
            # Distinguish missing vs expired is nice for UI; we delete on expiry so both are gone.
            return self._json(environ, start_response, 410, {"error": "Share expired or missing", "code": "gone"})

        body, expires = got
        headers = [
            ("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-store"),
            ("X-Share-Expires", str(int(expires))),
        ]
        if origin in self.settings.allowed_origins:
            headers += [("Access-Control-Allow-Origin", origin), ("Vary", "Origin")]
        if environ.get("REQUEST_METHOD") == "HEAD":
            start_response("200 OK", headers)
            return [b""]
        start_response("200 OK", headers)
        return [body]

    def _request_base(self, environ) -> str:
        host = (environ.get("HTTP_HOST") or "share.ultrapilled.com").split(",")[0].strip()
        scheme = environ.get("wsgi.url_scheme") or "https"
        if environ.get("HTTP_X_FORWARDED_PROTO", "").split(",")[0].strip() == "https":
            scheme = "https"
        return f"{scheme}://{host}"

    def _open_card(self, environ, start_response, share_id: str, ip: str):
        """HTML landing with OG tags so Messenger can show a canvas preview."""
        if not ID_RE.fullmatch(share_id):
            return self._json(environ, start_response, 404, {"error": "Not found", "code": "not_found"})

        wait = self.read_limiter.check(ip)
        if wait > 0:
            return self._rate_limited(environ, start_response, wait)

        self.store.purge_expired()
        got = self.store.get(share_id)
        if got is None:
            return self._json(environ, start_response, 410, {"error": "Share expired or missing", "code": "gone"})

        site = self.settings.site_origin.rstrip("/")
        dest = f"{site}/r/{share_id}"
        base = self._request_base(environ)
        has_preview = self.store.preview_path(share_id).is_file()
        image = f"{base}/r/{share_id}/og.jpg" if has_preview else f"{site}/share.jpg"
        safe_dest = html.escape(dest, quote=True)
        safe_image = html.escape(image, quote=True)
        page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Ultrapilled</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Ultrapilled" />
  <meta property="og:description" content="Open this physics scene on Ultrapilled." />
  <meta property="og:url" content="{safe_dest}" />
  <meta property="og:image" content="{safe_image}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Ultrapilled" />
  <meta name="twitter:image" content="{safe_image}" />
  <meta http-equiv="refresh" content="0;url={safe_dest}" />
  <script>location.replace({json.dumps(dest)})</script>
</head>
<body>
  <p><a href="{safe_dest}">Open scene</a></p>
</body>
</html>
"""
        data = page.encode("utf-8")
        headers = [
            ("Content-Type", "text/html; charset=utf-8"),
            ("Content-Length", str(len(data))),
            ("Cache-Control", "no-store"),
        ]
        if environ.get("REQUEST_METHOD") == "HEAD":
            start_response("200 OK", headers)
            return [b""]
        start_response("200 OK", headers)
        return [data]

    def _og_jpeg(self, environ, start_response, share_id: str, ip: str):
        if not ID_RE.fullmatch(share_id):
            return self._json(environ, start_response, 404, {"error": "Not found", "code": "not_found"})

        wait = self.read_limiter.check(ip)
        if wait > 0:
            return self._rate_limited(environ, start_response, wait)

        self.store.purge_expired()
        got = self.store.get_preview(share_id)
        if got is None:
            return self._json(environ, start_response, 404, {"error": "Not found", "code": "not_found"})

        body, expires = got
        headers = [
            ("Content-Type", "image/jpeg"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "public, max-age=3600"),
            ("X-Share-Expires", str(int(expires))),
        ]
        if environ.get("REQUEST_METHOD") == "HEAD":
            start_response("200 OK", headers)
            return [b""]
        start_response("200 OK", headers)
        return [body]

    def _turnstile_rejection(self, body: dict, ip: str) -> tuple[int, dict] | None:
        if not self.settings.turnstile_secret:
            if self.settings.allow_missing_turnstile:
                return None
            return 503, {"error": "Share is not configured", "code": "turnstile_unconfigured"}

        token = body.get("turnstileToken")
        if not isinstance(token, str) or not token or len(token) > 2048:
            return 400, {"error": "Complete the security check", "code": "turnstile_required"}

        result = self.verifier(token, ip)
        hostname_ok = result.get("hostname") in self.settings.turnstile_hostnames
        action_ok = result.get("action") == TURNSTILE_ACTION
        if not (result.get("success") and hostname_ok and action_ok):
            return 403, {"error": "Security check failed", "code": "turnstile_failed"}
        return None

    def _rate_limited(self, environ, start_response, wait: float):
        return self._json(
            environ,
            start_response,
            429,
            {"error": "Too many requests", "code": "rate_limited", "retryAfter": int(wait) + 1},
            extra=[("Retry-After", str(int(wait) + 1))],
        )

    def _json(self, environ, start_response, status: int, payload: dict, extra=None):
        reason = {
            200: "OK",
            201: "Created",
            400: "Bad Request",
            403: "Forbidden",
            404: "Not Found",
            410: "Gone",
            413: "Payload Too Large",
            415: "Unsupported Media Type",
            429: "Too Many Requests",
            500: "Internal Server Error",
            503: "Service Unavailable",
        }.get(status, "")
        data = json.dumps(payload).encode("utf-8")
        headers = [
            ("Content-Type", "application/json"),
            ("Content-Length", str(len(data))),
            ("Cache-Control", "no-store"),
        ]
        origin = environ.get("HTTP_ORIGIN", "")
        if origin in self.settings.allowed_origins:
            headers += [("Access-Control-Allow-Origin", origin), ("Vary", "Origin")]
        headers += list(extra or [])
        start_response(f"{status} {reason}", headers)
        return [data]


def decode_preview_jpeg(raw) -> bytes | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    text = raw.strip()
    if text.startswith("data:"):
        text = text.split(",", 1)[-1]
    try:
        data = base64.b64decode(text, validate=False)
    except (ValueError, TypeError):
        return None
    if len(data) > PREVIEW_MAX_BYTES or not data.startswith(b"\xff\xd8"):
        return None
    return data


def build_app() -> ShareApp:
    logging.basicConfig(level=logging.INFO)
    dev = os.environ.get("SHARE_DEV") == "1"
    origins = _env_list("ALLOWED_ORIGINS", "https://ultrapilled.com")
    data_dir = os.environ.get("SHARE_DATA_DIR", "/data")
    ttl_days = float(os.environ.get("SHARE_TTL_DAYS", "14"))
    max_bytes = int(os.environ.get("SHARE_MAX_BYTES", str(8 * 1024 * 1024)))
    rate_db = os.environ.get("RATE_DBPATH") or str(Path(data_dir) / "rate.db")
    secret = os.environ.get("TURNSTILE_SECRET_KEY", "")
    site_origin = os.environ.get("SITE_ORIGIN", "https://ultrapilled.com").rstrip("/")
    if not secret and not dev:
        raise RuntimeError("TURNSTILE_SECRET_KEY is required")

    store = ShareStore(data_dir, ttl_seconds=int(ttl_days * 86400), max_bytes=max_bytes)
    settings = Settings(
        allowed_origins=origins,
        turnstile_hostnames=_env_list("TURNSTILE_HOSTNAMES", "ultrapilled.com"),
        turnstile_secret=secret,
        allow_missing_turnstile=dev,
        trust_fly_client_ip=not dev,
        rate_dbpath=rate_db,
        site_origin=site_origin,
    )
    return ShareApp(store, settings)


_app: ShareApp | None = None


def application(environ, start_response):
    global _app
    if _app is None:
        _app = build_app()
    return _app(environ, start_response)
