"""Run: python3 -m unittest -v (from share/)."""

from __future__ import annotations

import io
import json
import tempfile
import time
import unittest
from pathlib import Path

from app import RateLimiter, Settings, ShareApp, Window, validate_pill_json
from store import ShareStore, truncate_ip

ORIGIN = "https://ultrapilled.com"
GOOD_TOKEN = {"success": True, "hostname": "ultrapilled.com", "action": "share"}

MIN_PILL = {
    "v": 1,
    "ultrapilled": "project",
    "state": {"slots": [], "physics": {"layoutMode": False}},
}


def call(app, method, path, body=None, origin=ORIGIN, ip="203.0.113.7", content_type="application/json"):
    raw = b""
    if body is not None:
        raw = json.dumps(body).encode("utf-8") if isinstance(body, (dict, list)) else body
    environ = {
        "REQUEST_METHOD": method,
        "PATH_INFO": path,
        "QUERY_STRING": "",
        "CONTENT_TYPE": content_type if raw else "",
        "CONTENT_LENGTH": str(len(raw)),
        "wsgi.input": io.BytesIO(raw),
        "HTTP_ORIGIN": origin,
        "REMOTE_ADDR": ip,
        "SERVER_NAME": "share.test",
        "SERVER_PORT": "80",
        "wsgi.url_scheme": "https",
    }
    status_headers = {}

    def start_response(status, headers, exc_info=None):
        status_headers["status"] = status
        status_headers["headers"] = dict(headers)
        return lambda x: None

    chunks = app(environ, start_response)
    data = b"".join(chunks)
    code = int(status_headers["status"].split()[0])
    try:
        payload = json.loads(data.decode("utf-8")) if data else None
    except ValueError:
        payload = data
    return code, payload, status_headers["headers"]


def make(tmp: str, verify=None, max_bytes=1024 * 1024, ttl_seconds=14 * 86400, **kw):
    store = ShareStore(tmp, ttl_seconds=ttl_seconds, max_bytes=max_bytes)
    settings = Settings(
        allowed_origins=(ORIGIN, "http://localhost:5173"),
        turnstile_hostnames=("ultrapilled.com", "localhost"),
        turnstile_secret=kw.pop("secret", "secret"),
        allow_missing_turnstile=kw.pop("allow_missing_turnstile", False),
        **{k: v for k, v in kw.items() if k in Settings.__dataclass_fields__},
    )
    write = RateLimiter((Window(5, 3600), Window(20, 86400)), (Window(100, 3600),))
    read = RateLimiter((Window(120, 60),), (Window(600, 60),))
    return ShareApp(
        store,
        settings,
        verifier=verify or (lambda token, ip: GOOD_TOKEN),
        write_limiter=write,
        read_limiter=read,
    )


class ValidateTests(unittest.TestCase):
    def test_accepts_min_pill(self):
        raw = json.dumps(MIN_PILL).encode()
        self.assertIsNotNone(validate_pill_json(raw))

    def test_rejects_garbage(self):
        self.assertIsNone(validate_pill_json(b"{}"))
        self.assertIsNone(validate_pill_json(b"not json"))


class StoreTests(unittest.TestCase):
    def test_truncate_ip(self):
        self.assertEqual(truncate_ip("203.0.113.7"), "203.0.113.0")
        self.assertTrue(truncate_ip("2001:db8::1").endswith("::"))

    def test_put_get_purge(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = ShareStore(tmp, ttl_seconds=1, max_bytes=1000)
            body = json.dumps(MIN_PILL).encode()
            share_id, _, expires = store.put(body, "1.2.3.4")
            got = store.get(share_id)
            self.assertIsNotNone(got)
            self.assertEqual(got[0], body)
            # Force expiry
            with store.lock:
                import sqlite3

                with sqlite3.connect(store.dbpath) as db:
                    db.execute("UPDATE shares SET expires = ?", (time.time() - 1,))
            self.assertIsNone(store.get(share_id))
            self.assertFalse((Path(tmp) / "blobs" / share_id).exists())


class ApiTests(unittest.TestCase):
    def test_healthz(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp)
            code, payload, _ = call(app, "GET", "/healthz", origin="")
            self.assertEqual(code, 200)
            self.assertEqual(payload, {"ok": True})

    def test_create_and_fetch(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp)
            code, payload, _ = call(
                app,
                "POST",
                "/r",
                {"turnstileToken": "tok", "project": MIN_PILL},
            )
            self.assertEqual(code, 201)
            self.assertIn("id", payload)
            self.assertIn("expiresAt", payload)
            self.assertTrue(payload["urlHint"].startswith("/o/"))
            share_id = payload["id"]
            code, pill, headers = call(app, "GET", f"/r/{share_id}")
            self.assertEqual(code, 200)
            self.assertEqual(pill["ultrapilled"], "project")
            self.assertIn("Access-Control-Allow-Origin", headers)

    def test_create_with_preview_and_open_card(self):
        import base64

        jpeg = b"\xff\xd8\xff\xd9" + b"\x00" * 32
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp)
            code, payload, _ = call(
                app,
                "POST",
                "/r",
                {
                    "turnstileToken": "tok",
                    "project": MIN_PILL,
                    "previewJpeg": base64.b64encode(jpeg).decode("ascii"),
                },
            )
            self.assertEqual(code, 201)
            share_id = payload["id"]
            code, page, _ = call(app, "GET", f"/o/{share_id}", origin="")
            self.assertEqual(code, 200)
            raw = page if isinstance(page, (bytes, bytearray)) else str(page).encode()
            self.assertIn(b"og:image", raw)
            self.assertIn(f"/r/{share_id}/og.jpg".encode(), raw)
            code, body, headers = call(app, "GET", f"/r/{share_id}/og.jpg", origin="")
            self.assertEqual(code, 200)
            self.assertEqual(headers.get("Content-Type"), "image/jpeg")
            self.assertEqual(body, jpeg)

    def test_origin_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp)
            code, payload, _ = call(
                app,
                "POST",
                "/r",
                {"turnstileToken": "tok", "project": MIN_PILL},
                origin="https://evil.example",
            )
            self.assertEqual(code, 403)
            self.assertEqual(payload["code"], "origin_denied")

    def test_turnstile_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp)
            code, payload, _ = call(app, "POST", "/r", {"project": MIN_PILL, "turnstileToken": ""})
            self.assertEqual(code, 400)
            self.assertEqual(payload["code"], "turnstile_required")

    def test_dev_skips_turnstile(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp, secret="", allow_missing_turnstile=True)
            code, payload, _ = call(app, "POST", "/r", {"project": MIN_PILL})
            self.assertEqual(code, 201)
            self.assertIn("id", payload)

    def test_bad_pill(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp)
            code, payload, _ = call(
                app,
                "POST",
                "/r",
                {"turnstileToken": "tok", "project": {"hello": 1}},
            )
            self.assertEqual(code, 400)
            self.assertEqual(payload["code"], "bad_pill")

    def test_too_large(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp, max_bytes=200)
            big = {**MIN_PILL, "pad": "x" * 500}
            code, payload, _ = call(app, "POST", "/r", {"turnstileToken": "tok", "project": big})
            self.assertEqual(code, 413)
            self.assertEqual(payload["code"], "too_large")

    def test_gone_when_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp)
            code, payload, _ = call(app, "GET", "/r/" + ("a" * 22))
            self.assertEqual(code, 410)
            self.assertEqual(payload["code"], "gone")

    def test_options_preflight(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = make(tmp)
            code, _, headers = call(app, "OPTIONS", "/r", origin=ORIGIN)
            self.assertEqual(code, 204)
            self.assertEqual(headers.get("Access-Control-Allow-Origin"), ORIGIN)


if __name__ == "__main__":
    unittest.main()
