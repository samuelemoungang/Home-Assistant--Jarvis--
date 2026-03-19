#!/usr/bin/env python3

import base64
import os
from datetime import datetime, timezone

import requests

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
PI_DEVICE_ID = os.getenv("PI_DEVICE_ID", "raspberry-pi")


def is_enabled():
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def upsert_pi_runtime_status(payload: dict):
    if not is_enabled():
        return False

    body = {
        "device_id": PI_DEVICE_ID,
        **payload,
        "updated_at": _now_iso(),
    }
    return _post_json("pi_runtime_status", body)


def upsert_camera_snapshot(image_bytes: bytes, content_type: str = "image/jpeg"):
    if not is_enabled():
        return False

    body = {
        "device_id": PI_DEVICE_ID,
        "content_type": content_type,
        "image_base64": base64.b64encode(image_bytes).decode("ascii"),
        "source_updated_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    return _post_json("pi_camera_snapshots", body)


def _post_json(table: str, body: dict):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    response = requests.post(url, headers=headers, json=body, timeout=8)
    response.raise_for_status()
    return True


def _now_iso():
    return datetime.now(timezone.utc).isoformat()
