"""Run: python -m unittest -v (from guestbook/, with requirements installed)."""

from __future__ import annotations

import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from itsdangerous import URLSafeTimedSerializer
from werkzeug.test import Client

from gate import GateSettings, GuestbookGate, RateLimiter, Window

ORIGIN = "https://ultrapilled.com"
GOOD_TOKEN = {"success": True, "hostname": "ultrapilled.com", "action": "guestbook"}
SESSION_KEY = "test-session-key-for-moderation"


class FakeIsso:
    def __init__(self):
        self.calls = []

    def __call__(self, environ, start_response):
        body = environ["wsgi.input"].read(int(environ.get("CONTENT_LENGTH") or 0))
        self.calls.append((environ["REQUEST_METHOD"], environ["PATH_INFO"], environ.get("REMOTE_ADDR"), body))
        start_response("202 Accepted", [("Content-Type", "application/json")])
        return [b'{"mode": 2}']


def make_mod_db(directory: str) -> tuple[str, URLSafeTimedSerializer]:
    path = str(Path(directory) / "prefs.db")
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE preferences (key VARCHAR PRIMARY KEY, value VARCHAR)")
        db.execute("INSERT INTO preferences (key, value) VALUES (?, ?)", ("session-key", SESSION_KEY))
    return path, URLSafeTimedSerializer(SESSION_KEY)


def mod_path(signer: URLSafeTimedSerializer, comment_id: int, action: str) -> str:
    return f"/id/{comment_id}/{action}/{signer.dumps(comment_id)}"


def make(verify=None, per_ip=(Window(3, 600),), global_windows=(Window(30, 3600),), **kw):
    isso = FakeIsso()
    settings = GateSettings(
        allowed_origins=(ORIGIN,),
        turnstile_hostnames=("ultrapilled.com",),
        turnstile_secret=kw.pop("secret", "secret"),
        **kw,
    )
    limiter = RateLimiter(per_ip, global_windows)
    gate = GuestbookGate(isso, settings, verifier=verify or (lambda token, ip: GOOD_TOKEN), limiter=limiter)
    return Client(gate), isso


def post(client, body, origin=ORIGIN, headers=None, ip="203.0.113.7"):
    return client.post(
        "/new?uri=/guestbook",
        data=json.dumps(body),
        content_type="application/json",
        headers={"Origin": origin, **(headers or {})},
        environ_base={"REMOTE_ADDR": ip},
    )


ENTRY = {"author": "Ada", "text": "Love the bouncy pills a lot!", "turnstileToken": "tok", "honeypot": ""}


class RouteTests(unittest.TestCase):
    def test_only_guestbook_thread_is_readable(self):
        client, isso = make()
        self.assertEqual(client.get("/?uri=/guestbook").status_code, 202)
        self.assertEqual(client.get("/?uri=/other").status_code, 404)
        self.assertEqual(len(isso.calls), 1)

    def test_blocks_everything_else(self):
        client, isso = make()
        for method, path in [
            ("GET", "/admin/"), ("GET", "/js/embed.min.js"), ("GET", "/demo/"), ("GET", "/feed?uri=/guestbook"),
            ("GET", "/latest"), ("GET", "/config"), ("POST", "/count"), ("POST", "/preview"),
            ("PUT", "/id/1"), ("DELETE", "/id/1"), ("POST", "/id/1/like"), ("POST", "/login/"),
        ]:
            res = client.open(path, method=method, headers={"Origin": ORIGIN})
            self.assertEqual(res.status_code, 404, f"{method} {path}")
        self.assertEqual(isso.calls, [])

    def test_moderation_links_pass_through(self):
        with tempfile.TemporaryDirectory() as tmp:
            dbpath, signer = make_mod_db(tmp)
            client, isso = make(isso_dbpath=dbpath)
            self.assertEqual(client.get(mod_path(signer, 4, "activate")).status_code, 202)
            self.assertEqual(client.post(mod_path(signer, 4, "delete")).status_code, 202)
            self.assertEqual(len(isso.calls), 2)

    def test_edit_moderation_path_is_blocked(self):
        with tempfile.TemporaryDirectory() as tmp:
            dbpath, signer = make_mod_db(tmp)
            client, isso = make(isso_dbpath=dbpath)
            res = client.post(mod_path(signer, 4, "edit"), data="{}", content_type="application/json")
            self.assertEqual(res.status_code, 404)
            self.assertEqual(isso.calls, [])

    def test_expired_moderation_key_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            dbpath, signer = make_mod_db(tmp)
            client, isso = make(isso_dbpath=dbpath, moderation_max_age=1)
            key = signer.dumps(4)
            import time

            time.sleep(2)
            res = client.get(f"/id/4/activate/{key}")
            self.assertEqual(res.status_code, 403)
            self.assertEqual(res.json["code"], "moderation_expired")
            self.assertEqual(isso.calls, [])

    def test_healthz(self):
        client, _ = make()
        self.assertEqual(client.get("/healthz").status_code, 200)

    def test_preflight_requires_allowed_origin(self):
        client, _ = make()
        bad = client.open("/new?uri=/guestbook", method="OPTIONS", headers={"Origin": "https://evil.example"})
        self.assertEqual(bad.status_code, 403)


class NewEntryTests(unittest.TestCase):
    def test_happy_path_strips_extra_fields(self):
        client, isso = make()
        res = post(client, {**ENTRY, "email": "x@y.z", "website": "https://spam", "parent": 3, "mode": 1})
        self.assertEqual(res.status_code, 202)
        forwarded = json.loads(isso.calls[0][3])
        self.assertEqual(forwarded, {"author": "Ada", "text": "Love the bouncy pills a lot!", "title": "Guestbook",
                                     "email": None, "website": None, "parent": None})

    def test_rejects_foreign_origin(self):
        client, isso = make()
        self.assertEqual(post(client, ENTRY, origin="https://evil.example").status_code, 403)
        self.assertEqual(post(client, ENTRY, origin="").status_code, 403)
        self.assertEqual(isso.calls, [])

    def test_honeypot_fakes_success_without_storing(self):
        client, isso = make()
        res = post(client, {**ENTRY, "honeypot": "buy now"})
        self.assertEqual(res.status_code, 202)
        self.assertEqual(isso.calls, [])

    def test_requires_json(self):
        client, isso = make()
        res = client.post("/new?uri=/guestbook", data="author=a&text=b", content_type="application/x-www-form-urlencoded",
                          headers={"Origin": ORIGIN})
        self.assertEqual(res.status_code, 415)
        self.assertEqual(isso.calls, [])

    def test_body_size_cap(self):
        client, _ = make()
        self.assertEqual(post(client, {**ENTRY, "text": "a " * 5000}).status_code, 413)

    def test_content_rules(self):
        client, isso = make()
        cases = {
            "links_not_allowed": [
                "please visit https://cheap.example right now",
                "please go to www.thing.net right away",
                "please see spam.ru right now",
                "please check [x](y) right now",
                "please mail me@example.com right now",
                "please open <a href=x>hi</a> right now",
            ],
            "too_short": ["hi", "one two three four"],
            "text_length": ["x " * 250 + "x"],
            "repeated": ["aaaaaaaaaaaaaaaaaaaa hey there friend please"],
        }
        for code, texts in cases.items():
            for text in texts:
                res = post(client, {**ENTRY, "text": text})
                self.assertEqual(res.status_code, 400, text)
                self.assertEqual(res.json["code"], code, text)
        self.assertEqual(post(client, {**ENTRY, "author": ""}).json["code"], "name_length")
        self.assertEqual(post(client, {**ENTRY, "author": "n" * 41}).json["code"], "name_length")
        self.assertEqual(post(client, {**ENTRY, "author": "spam.com"}).json["code"], "links_not_allowed")
        self.assertEqual(post(client, {**ENTRY, "author": 5}).json["code"], "missing")
        self.assertEqual(isso.calls, [])

    def test_strips_control_and_bidi_chars(self):
        client, isso = make()
        post(client, {**ENTRY, "author": " A\u202eda\u200b ", "text": "hey\x00 there\n\n\n\nfriend please stay"})
        forwarded = json.loads(isso.calls[0][3])
        self.assertEqual(forwarded["author"], "Ada")
        self.assertEqual(forwarded["text"], "hey there\n\nfriend please stay")


class TurnstileTests(unittest.TestCase):
    def test_token_required(self):
        client, isso = make()
        res = post(client, {**ENTRY, "turnstileToken": ""})
        self.assertEqual(res.json["code"], "turnstile_required")
        self.assertEqual(isso.calls, [])

    def test_failed_wrong_host_or_action(self):
        for result in (
            {"success": False},
            {"success": True, "hostname": "evil.example", "action": "guestbook"},
            {"success": True, "hostname": "ultrapilled.com", "action": "other"},
            {"success": True, "hostname": "ultrapilled.com"},
        ):
            client, isso = make(verify=lambda token, ip, r=result: r)
            res = post(client, ENTRY)
            self.assertEqual(res.status_code, 403, result)
            self.assertEqual(res.json["code"], "turnstile_failed")
            self.assertEqual(isso.calls, [])

    def test_missing_secret_fails_closed(self):
        client, isso = make(secret="")
        self.assertEqual(post(client, ENTRY).status_code, 503)
        self.assertEqual(isso.calls, [])

    def test_dev_mode_skips_turnstile(self):
        client, isso = make(secret="", allow_missing_turnstile=True)
        self.assertEqual(post(client, {**ENTRY, "turnstileToken": ""}).status_code, 202)

    def test_verifier_gets_client_ip(self):
        seen = []
        client, _ = make(verify=lambda token, ip: seen.append((token, ip)) or GOOD_TOKEN, trust_fly_client_ip=True)
        post(client, ENTRY, headers={"Fly-Client-IP": "198.51.100.9", "X-Forwarded-For": "1.2.3.4"})
        self.assertEqual(seen, [("tok", "198.51.100.9")])


class RateLimitTests(unittest.TestCase):
    def test_per_ip_and_global(self):
        client, isso = make(per_ip=(Window(2, 600),), global_windows=(Window(3, 3600),))
        self.assertEqual(post(client, ENTRY, ip="1.1.1.1").status_code, 202)
        self.assertEqual(post(client, ENTRY, ip="1.1.1.1").status_code, 202)
        limited = post(client, ENTRY, ip="1.1.1.1")
        self.assertEqual(limited.status_code, 429)
        self.assertIn("Retry-After", limited.headers)
        self.assertEqual(post(client, ENTRY, ip="2.2.2.2").status_code, 202)
        self.assertEqual(post(client, ENTRY, ip="3.3.3.3").status_code, 429)
        self.assertEqual(len(isso.calls), 3)

    def test_spoofed_forwarded_for_is_ignored(self):
        client, isso = make(per_ip=(Window(1, 600),))
        post(client, ENTRY, headers={"X-Forwarded-For": "9.9.9.1"})
        res = post(client, ENTRY, headers={"X-Forwarded-For": "9.9.9.2"})
        self.assertEqual(res.status_code, 429)

    def test_window_expires(self):
        now = [0.0]
        limiter = RateLimiter((Window(1, 10),), (), clock=lambda: now[0])
        self.assertEqual(limiter.check("a"), 0)
        self.assertGreater(limiter.check("a"), 0)
        now[0] = 11
        self.assertEqual(limiter.check("a"), 0)


class IssoIntegrationTests(unittest.TestCase):
    """Real Isso + gate: entries land in moderation and stay hidden until approved."""

    def test_entry_is_held_for_moderation(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.environ.update({
                "GUESTBOOK_DEV": "1",
                "ISSO_DBPATH": str(Path(tmp) / "gb.db"),
                "ALLOWED_ORIGINS": ORIGIN,
            })
            import importlib

            import app as app_module

            importlib.reload(app_module)
            client = Client(app_module.application)

            with self.assertLogs(level="INFO") as logs:
                res = post(client, {**ENTRY, "text": "Hello *world* and more words here <b>x</b>"})
            self.assertEqual(res.status_code, 202, res.get_data(as_text=True))
            self.assertEqual(res.json["mode"], 2)

            listing = client.get("/?uri=/guestbook&plain=1", headers={"Origin": ORIGIN})
            self.assertEqual(listing.status_code, 200)
            self.assertEqual(listing.json["replies"], [])
            self.assertEqual(listing.headers["Access-Control-Allow-Origin"], ORIGIN)

            activate = next(line for line in logs.output if "Activate comment:" in line)
            path = "/" + activate.split("Activate comment: ", 1)[1].split("/", 3)[3]
            self.assertEqual(client.post(path).status_code, 200)

            listing = client.get("/?uri=/guestbook&plain=1&sort=newest", headers={"Origin": ORIGIN})
            [entry] = listing.json["replies"]
            self.assertEqual(entry["author"], "Ada")
            self.assertEqual(entry["text"], "Hello *world* and more words here <b>x</b>")
            self.assertNotIn("email", entry)
            self.assertNotIn("remote_addr", entry)


if __name__ == "__main__":
    unittest.main()
