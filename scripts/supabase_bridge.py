#!/usr/bin/env python3

import base64
import os
from datetime import datetime, timezone

import requests


def _config():
    return {
        "supabase_url": os.getenv("SUPABASE_URL", "").rstrip("/"),
        "service_role_key": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        "device_id": os.getenv("PI_DEVICE_ID", "raspberry-pi"),
    }


def is_enabled():
    cfg = _config()
    return bool(cfg["supabase_url"] and cfg["service_role_key"])


def upsert_pi_runtime_status(payload: dict):
    cfg = _config()
    if not is_enabled():
        return False

    body = {
        "device_id": cfg["device_id"],
        **payload,
        "updated_at": _now_iso(),
    }
    return _post_json("pi_runtime_status", body, cfg)


def upsert_camera_snapshot(image_bytes: bytes, content_type: str = "image/jpeg"):
    cfg = _config()
    if not is_enabled():
        return False

    body = {
        "device_id": cfg["device_id"],
        "content_type": content_type,
        "image_base64": base64.b64encode(image_bytes).decode("ascii"),
        "source_updated_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    return _post_json("pi_camera_snapshots", body, cfg)


def _post_json(table: str, body: dict, cfg: dict):
    url = f"{cfg['supabase_url']}/rest/v1/{table}"
    headers = {
        "apikey": cfg["service_role_key"],
        "Authorization": f"Bearer {cfg['service_role_key']}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    response = requests.post(url, headers=headers, json=body, timeout=8)
    response.raise_for_status()
    return True


def _now_iso():
    return datetime.now(timezone.utc).isoformat()
