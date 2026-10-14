"""WSGI gate in front of Isso.

Isso only ships a per-minute IP limit and a moderation queue. Everything else
lives here: Turnstile, honeypot, origin allowlist, content rules, extra rate
limits, and a route allowlist so only the guestbook thread and moderation
links are reachable.
"""

from __future__ import annotations

import io
import json
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

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

THREAD_URI = "/guestbook"
THREAD_TITLE = "Guestbook"
TURNSTILE_ACTION = "guestbook"
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

MAX_BODY_BYTES = 8 * 1024
MIN_NAME = 1
MAX_NAME = 40
MIN_WORDS = 5
MAX_TEXT = 500
# Match Isso purge-after for pending entries — Activate stays usable until purge.
MODERATION_MAX_AGE = 30 * 24 * 60 * 60

# No edit — same signed email key must not rewrite approved entries.
_MODERATE_PATH = re.compile(r"^/id/(?P<id>\d+)/(?P<action>activate|delete)/(?P<key>[^/]+)$")

# No links of any kind — the guestbook has no use for them and they are the spam payload.
_LINK = re.compile(
    r"(?:https?:|ftp:|mailto:|www\.|\]\(|<a\s|\[url"
    r"|\b[\w-]+\.(?:com|net|org|info|biz|ru|cn|xyz|top|io|co|me|ly|link|click|site|online|shop|app|dev|gg|tk|ml|ga|cf|bit)\b"
    r"|[\w.+-]+@[\w-]+\.[\w.-]+)",
    re.IGNORECASE,
)
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069]")

Verifier = Callable[[str, str], dict]


@dataclass
class Window:
    limit: int
    seconds: float


@dataclass
class GateSettings:
    allowed_origins: tuple[str, ...]
    turnstile_hostnames: tuple[str, ...]
    turnstile_secret: str = ""
    allow_missing_turnstile: bool = False
    trust_fly_client_ip: bool = False
    isso_dbpath: str = ""
    rate_dbpath: str = ""
    moderation_max_age: int = MODERATION_MAX_AGE
    per_ip: tuple[Window, ...] = (Window(3, 600), Window(6, 86400))
    global_windows: tuple[Window, ...] = (Window(30, 3600), Window(150, 86400))
    # Generous vs posts — still caps scrapers / bandwidth burn after Fly wake.
    read_per_ip: tuple[Window, ...] = (Window(60, 60), Window(600, 3600))
    read_global: tuple[Window, ...] = (Window(300, 60), Window(5000, 3600))


def moderation_key_valid(dbpath: str, comment_id: int, key: str, max_age: int) -> bool:
    """Re-check Isso's signed moderation key with a finite lifetime (Isso itself uses ~forever)."""
    if not dbpath or not key:
        return False
    try:
        with sqlite3.connect(dbpath) as db:
            row = db.execute("SELECT value FROM preferences WHERE key = ?", ("session-key",)).fetchone()
        if not row or not row[0]:
            return False
        payload = URLSafeTimedSerializer(row[0]).loads(key, max_age=max_age)
        return payload == comment_id
    except (BadSignature, SignatureExpired, TypeError, ValueError, sqlite3.Error, OSError):
        return False


class RateLimiter:
    """Sliding windows. With dbpath, persists to SQLite so Fly auto-stop doesn't reset budgets."""

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
        # Wall clock when persisting — monotonic resets / isn't comparable across process restarts.
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
        """Return seconds to wait (0 = allowed) and record the hit when allowed."""
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
            ip_hits = [row[0] for row in db.execute(
                "SELECT ts FROM hits WHERE bucket = ? AND ts >= ? ORDER BY ts", (ip_bucket, cutoff)
            )]
            global_hits = [row[0] for row in db.execute(
                "SELECT ts FROM hits WHERE bucket = ? AND ts >= ? ORDER BY ts", (global_bucket, cutoff)
            )]
            wait = max(self._retry(ip_hits, self.per_key, now), self._retry(global_hits, self.global_windows, now))
            if wait > 0:
                return wait
            db.executemany("INSERT INTO hits (bucket, ts) VALUES (?, ?)", ((ip_bucket, now), (global_bucket, now)))
        return 0.0


def verify_turnstile(secret: str, token: str, remote_ip: str) -> dict:
    data = urllib.parse.urlencode({"secret": secret, "response": token, "remoteip": remote_ip}).encode()
    req = urllib.request.Request(TURNSTILE_VERIFY_URL, data=data, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return {"success": False, "error-codes": ["verify-unreachable"]}


def clean_text(value: str) -> str:
    value = _CONTROL.sub("", value.replace("\r\n", "\n").replace("\r", "\n"))
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def entry_problem(author: str, text: str) -> tuple[str, str] | None:
    """Return (code, message) when the entry breaks a content rule."""
    if not (MIN_NAME <= len(author) <= MAX_NAME):
        return "name_length", f"Name must be 1–{MAX_NAME} characters."
    if "\n" in author:
        return "name_length", "Name must be a single line."
    words = [w for w in text.split() if w]
    if len(words) < MIN_WORDS:
        return "too_short", f"Message must be at least {MIN_WORDS} words."
    if len(text) > MAX_TEXT:
        return "text_length", f"Message must be at most {MAX_TEXT} characters."
    if _LINK.search(author) or _LINK.search(text):
        return "links_not_allowed", "Links and email addresses aren’t allowed in the guestbook."
    if re.search(r"(.)\1{14,}", text):
        return "repeated", "That message looks like keyboard mashing."
    return None


class GuestbookGate:
    def __init__(
        self,
        app,
        settings: GateSettings,
        verifier: Verifier | None = None,
        limiter: RateLimiter | None = None,
        read_limiter: RateLimiter | None = None,
    ):
        self.app = app
        self.settings = settings
        self.verifier = verifier or (lambda token, ip: verify_turnstile(settings.turnstile_secret, token, ip))
        rate_db = settings.rate_dbpath or None
        self.write_limiter = limiter or RateLimiter(
            settings.per_ip, settings.global_windows, dbpath=rate_db, namespace="write"
        )
        self.read_limiter = read_limiter or RateLimiter(
            settings.read_per_ip, settings.read_global, dbpath=rate_db, namespace="read"
        )

    def __call__(self, environ, start_response):
        if self.settings.trust_fly_client_ip:
            fly_ip = environ.get("HTTP_FLY_CLIENT_IP", "").strip()
            if fly_ip:
                environ["REMOTE_ADDR"] = fly_ip
        # Isso must only see the client IP we decided on, not a spoofable chain.
        environ.pop("HTTP_X_FORWARDED_FOR", None)
        environ.pop("HTTP_X_SCRIPT_NAME", None)

        method = environ.get("REQUEST_METHOD", "GET")
        path = environ.get("PATH_INFO", "") or "/"
        query = urllib.parse.parse_qs(environ.get("QUERY_STRING", ""))
        uri = (query.get("uri") or [""])[0]
        ip = environ.get("REMOTE_ADDR", "") or "unknown"

        if path == "/healthz" and method in ("GET", "HEAD"):
            return self._json(environ, start_response, 200, {"ok": True})

        moderate = _MODERATE_PATH.match(path)
        if moderate and method in ("GET", "POST"):
            comment_id = int(moderate.group("id"))
            if not moderation_key_valid(
                self.settings.isso_dbpath,
                comment_id,
                moderate.group("key"),
                self.settings.moderation_max_age,
            ):
                return self._json(
                    environ,
                    start_response,
                    403,
                    {"error": "Moderation link expired or invalid", "code": "moderation_expired"},
                )
            return self.app(environ, start_response)

        if path not in ("/", "/new"):
            return self._json(environ, start_response, 404, {"error": "Not found", "code": "not_found"})

        if uri != THREAD_URI:
            return self._json(environ, start_response, 404, {"error": "Not found", "code": "not_found"})

        if method == "OPTIONS":
            if not self._origin_ok(environ):
                return self._json(environ, start_response, 403, {"error": "Origin not allowed", "code": "origin_denied"})
            return self.app(environ, start_response)

        if path == "/" and method in ("GET", "HEAD"):
            return self._read(environ, start_response, ip)

        if path == "/new" and method == "POST":
            return self._new(environ, start_response)

        return self._json(environ, start_response, 405, {"error": "Method not allowed", "code": "method"})

    def _origin_ok(self, environ) -> bool:
        return environ.get("HTTP_ORIGIN", "") in self.settings.allowed_origins

    def _rate_limited(self, environ, start_response, wait: float):
        return self._json(
            environ,
            start_response,
            429,
            {"error": "Too many requests", "code": "rate_limited", "retryAfter": int(wait) + 1},
            extra=[("Retry-After", str(int(wait) + 1))],
        )

    def _read(self, environ, start_response, ip: str):
        # Foreign browser origins can't read the list; missing Origin (curl) is still rate-limited.
        origin = environ.get("HTTP_ORIGIN", "")
        if origin and origin not in self.settings.allowed_origins:
            return self._json(environ, start_response, 403, {"error": "Origin not allowed", "code": "origin_denied"})
        wait = self.read_limiter.check(ip)
        if wait > 0:
            return self._rate_limited(environ, start_response, wait)
        return self.app(environ, start_response)

    def _new(self, environ, start_response):
        if not self._origin_ok(environ):
            return self._json(environ, start_response, 403, {"error": "Origin not allowed", "code": "origin_denied"})

        if not environ.get("CONTENT_TYPE", "").startswith("application/json"):
            return self._json(environ, start_response, 415, {"error": "JSON only", "code": "content_type"})

        try:
            length = int(environ.get("CONTENT_LENGTH") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY_BYTES:
            return self._json(environ, start_response, 413, {"error": "Entry is too large", "code": "too_large"})

        try:
            body = json.loads(environ["wsgi.input"].read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self._json(environ, start_response, 400, {"error": "Invalid JSON", "code": "bad_json"})
        if not isinstance(body, dict):
            return self._json(environ, start_response, 400, {"error": "Invalid JSON", "code": "bad_json"})

        # Bots that fill the hidden field get a convincing "pending" reply and nothing is stored.
        if str(body.get("honeypot") or "").strip():
            return self._json(environ, start_response, 202, {"mode": 2})

        author = body.get("author")
        text = body.get("text")
        if not isinstance(author, str) or not isinstance(text, str):
            return self._json(environ, start_response, 400, {"error": "Name and message are required", "code": "missing"})
        author = clean_text(author)
        text = clean_text(text)
        problem = entry_problem(author, text)
        if problem:
            code, message = problem
            return self._json(environ, start_response, 400, {"error": message, "code": code})

        ip = environ.get("REMOTE_ADDR", "") or "unknown"
        rejected = self._turnstile_rejection(body, ip)
        if rejected:
            status, payload = rejected
            return self._json(environ, start_response, status, payload)

        wait = self.write_limiter.check(ip)
        if wait > 0:
            return self._rate_limited(environ, start_response, wait)

        clean = json.dumps(
            {"author": author, "text": text, "title": THREAD_TITLE, "email": None, "website": None, "parent": None},
            ensure_ascii=False,
        ).encode("utf-8")
        environ["wsgi.input"] = io.BytesIO(clean)
        environ["CONTENT_LENGTH"] = str(len(clean))
        environ["CONTENT_TYPE"] = "application/json"
        return self.app(environ, start_response)

    def _turnstile_rejection(self, body: dict, ip: str) -> tuple[int, dict] | None:
        if not self.settings.turnstile_secret:
            if self.settings.allow_missing_turnstile:
                return None
            return 503, {"error": "Guestbook is not configured", "code": "turnstile_unconfigured"}

        token = body.get("turnstileToken")
        if not isinstance(token, str) or not token or len(token) > 2048:
            return 400, {"error": "Complete the security check", "code": "turnstile_required"}

        result = self.verifier(token, ip)
        hostname_ok = result.get("hostname") in self.settings.turnstile_hostnames
        action_ok = result.get("action") == TURNSTILE_ACTION
        if not (result.get("success") and hostname_ok and action_ok):
            return 403, {"error": "Security check failed", "code": "turnstile_failed"}
        return None

    def _json(self, environ, start_response, status: int, payload: dict, extra=None):
        reason = {200: "OK", 202: "Accepted", 400: "Bad Request", 403: "Forbidden", 404: "Not Found",
                  405: "Method Not Allowed", 413: "Payload Too Large", 415: "Unsupported Media Type",
                  429: "Too Many Requests", 503: "Service Unavailable"}.get(status, "")
        data = json.dumps(payload).encode("utf-8")
        headers = [("Content-Type", "application/json"), ("Content-Length", str(len(data))),
                   ("Cache-Control", "no-store")]
        origin = environ.get("HTTP_ORIGIN", "")
        if origin in self.settings.allowed_origins:
            headers += [("Access-Control-Allow-Origin", origin), ("Vary", "Origin")]
        headers += list(extra or [])
        start_response(f"{status} {reason}", headers)
        return [data]
