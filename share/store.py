"""SQLite index + filesystem blobs for temporary .pill shares."""

from __future__ import annotations

import secrets
import sqlite3
import threading
import time
from pathlib import Path


def new_share_id() -> str:
    # ~22 URL-safe chars; unlisted, unguessable enough for temporary friend links.
    return secrets.token_urlsafe(16).rstrip("=")


def truncate_ip(ip: str) -> str:
    ip = (ip or "").strip()
    if not ip or ip == "unknown":
        return "unknown"
    if ":" in ip:
        # IPv6 — keep first 4 hextets.
        parts = ip.split(":")
        return ":".join(parts[:4]) + "::"
    bits = ip.split(".")
    if len(bits) == 4:
        return ".".join(bits[:3]) + ".0"
    return ip


class ShareStore:
    def __init__(self, data_dir: str | Path, ttl_seconds: int, max_bytes: int):
        self.data_dir = Path(data_dir)
        self.blobs = self.data_dir / "blobs"
        self.dbpath = self.data_dir / "shares.db"
        self.ttl_seconds = max(60, int(ttl_seconds))
        self.max_bytes = max(1, int(max_bytes))
        self.lock = threading.Lock()
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.blobs.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.dbpath) as db:
            db.execute(
                """
                CREATE TABLE IF NOT EXISTS shares (
                  id TEXT PRIMARY KEY,
                  created REAL NOT NULL,
                  expires REAL NOT NULL,
                  bytes INTEGER NOT NULL,
                  ip TEXT NOT NULL
                )
                """
            )
            db.execute("CREATE INDEX IF NOT EXISTS idx_shares_expires ON shares (expires)")

    def purge_expired(self, now: float | None = None) -> int:
        now = time.time() if now is None else now
        with self.lock:
            with sqlite3.connect(self.dbpath) as db:
                rows = db.execute("SELECT id FROM shares WHERE expires <= ?", (now,)).fetchall()
                ids = [row[0] for row in rows]
                if ids:
                    db.executemany("DELETE FROM shares WHERE id = ?", [(i,) for i in ids])
        for share_id in ids:
            self._unlink_blob(share_id)
        return len(ids)

    def preview_path(self, share_id: str) -> Path:
        return self.blobs / f"{share_id}.jpg"

    def _unlink_blob(self, share_id: str) -> None:
        for path in (self.blobs / share_id, self.preview_path(share_id)):
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass

    def put(self, body: bytes, ip: str, preview: bytes | None = None) -> tuple[str, float, float]:
        if len(body) > self.max_bytes:
            raise ValueError("too_large")
        if preview is not None and len(preview) > 200_000:
            preview = None
        now = time.time()
        self.purge_expired(now)
        expires = now + self.ttl_seconds
        truncated = truncate_ip(ip)
        with self.lock:
            for _ in range(8):
                share_id = new_share_id()
                path = self.blobs / share_id
                if path.exists() or self.preview_path(share_id).exists():
                    continue
                try:
                    with sqlite3.connect(self.dbpath) as db:
                        db.execute(
                            "INSERT INTO shares (id, created, expires, bytes, ip) VALUES (?, ?, ?, ?, ?)",
                            (share_id, now, expires, len(body), truncated),
                        )
                    path.write_bytes(body)
                    if preview:
                        try:
                            self.preview_path(share_id).write_bytes(preview)
                        except OSError:
                            pass
                    return share_id, now, expires
                except sqlite3.IntegrityError:
                    continue
        raise RuntimeError("could not allocate id")

    def get(self, share_id: str) -> tuple[bytes, float] | None:
        """Return (body, expires) or None. Deletes and returns None when expired."""
        if not share_id or "/" in share_id or ".." in share_id or len(share_id) > 64:
            return None
        now = time.time()
        with self.lock:
            with sqlite3.connect(self.dbpath) as db:
                row = db.execute(
                    "SELECT expires FROM shares WHERE id = ?", (share_id,)
                ).fetchone()
                if not row:
                    return None
                expires = float(row[0])
                if expires <= now:
                    db.execute("DELETE FROM shares WHERE id = ?", (share_id,))
                    expired = True
                else:
                    expired = False
        if expired:
            self._unlink_blob(share_id)
            return None
        path = self.blobs / share_id
        try:
            body = path.read_bytes()
        except OSError:
            return None
        return body, expires

    def get_preview(self, share_id: str) -> tuple[bytes, float] | None:
        """Return (jpeg bytes, expires) when the share and preview still exist."""
        if not share_id or "/" in share_id or ".." in share_id or len(share_id) > 64:
            return None
        now = time.time()
        with self.lock:
            with sqlite3.connect(self.dbpath) as db:
                row = db.execute(
                    "SELECT expires FROM shares WHERE id = ?", (share_id,)
                ).fetchone()
                if not row:
                    return None
                expires = float(row[0])
                if expires <= now:
                    db.execute("DELETE FROM shares WHERE id = ?", (share_id,))
                    expired = True
                else:
                    expired = False
        if expired:
            self._unlink_blob(share_id)
            return None
        try:
            jpeg = self.preview_path(share_id).read_bytes()
        except OSError:
            return None
        if not jpeg.startswith(b"\xff\xd8"):
            return None
        return jpeg, expires
