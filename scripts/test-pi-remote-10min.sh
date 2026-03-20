#!/usr/bin/env bash
set -euo pipefail

# 10-minute guided test for Pi -> Supabase -> Web dashboard pipeline.
# Usage:
#   bash scripts/test-pi-remote-10min.sh
# Optional env:
#   PI_STATS_URL (default: http://127.0.0.1:8080)
#   DEVICE_ID (default: ${PI_DEVICE_ID:-raspberry-pi})

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
PI_STATS_URL="${PI_STATS_URL:-http://127.0.0.1:8080}"
DEVICE_ID="${DEVICE_ID:-${PI_DEVICE_ID:-raspberry-pi}}"
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  # Load local env file if present (useful when launched manually from repo root).
  set -a
  # shellcheck disable=SC1091
  source "${ENV_FILE}"
  set +a
fi

PI_STATS_URL="${PI_STATS_URL:-http://127.0.0.1:8080}"
DEFAULT_DEVICE_ID="$(hostname 2>/dev/null || echo raspberry-pi)"
DEVICE_ID="${DEVICE_ID:-${PI_DEVICE_ID:-${NEXT_PUBLIC_PI_DEVICE_ID:-$DEFAULT_DEVICE_ID}}}"
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step() { echo -e "\n${BLUE}==> $1${NC}"; }
ok() { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✖ $1${NC}"; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"; }

need_cmd curl
need_cmd python3

step "[1/6] Checking local Pi stats API"
for endpoint in health stats sensors; do
  code=$(curl -s -o /tmp/pi_${endpoint}.json -w "%{http_code}" "${PI_STATS_URL}/api/${endpoint}" || true)
  if [[ "$code" == "200" ]]; then
    ok "${PI_STATS_URL}/api/${endpoint} -> 200"
  else
    warn "${PI_STATS_URL}/api/${endpoint} -> ${code}"
  fi
done

step "[2/6] Checking required environment"
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
[[ -n "${PI_DEVICE_ID:-}" ]] && ok "PI_DEVICE_ID is set (${PI_DEVICE_ID})" || warn "PI_DEVICE_ID not set (default will be raspberry-pi)"
[[ -n "${SUPABASE_URL:-}" ]] && ok "SUPABASE_URL is set" || fail "SUPABASE_URL is missing"
[[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] && ok "SUPABASE_SERVICE_ROLE_KEY is set" || fail "SUPABASE_SERVICE_ROLE_KEY is missing"
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
if [[ -n "${PI_DEVICE_ID:-}" ]]; then
  ok "PI_DEVICE_ID is set (${PI_DEVICE_ID})"
elif [[ -n "${NEXT_PUBLIC_PI_DEVICE_ID:-}" ]]; then
  warn "PI_DEVICE_ID not set, using NEXT_PUBLIC_PI_DEVICE_ID fallback (${NEXT_PUBLIC_PI_DEVICE_ID})"
else
  warn "PI_DEVICE_ID not set, using hostname fallback (${DEVICE_ID})"
fi
if [[ -n "${SUPABASE_URL:-}" ]]; then
  ok "SUPABASE_URL is set"
else
  if [[ -f "${ENV_FILE}" ]] && grep -q '^SUPABASE_URL=' "${ENV_FILE}"; then
    fail "SUPABASE_URL exists in ${ENV_FILE} but is not readable in shell (possible CRLF or invalid .env syntax). Run: sed -i 's/\\r$//' .env"
  fi
  fail "SUPABASE_URL is missing. Set it in ${ENV_FILE} or export it in this shell."
fi
[[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] && ok "SUPABASE_SERVICE_ROLE_KEY is set" || fail "SUPABASE_SERVICE_ROLE_KEY is missing. Set it in .env (repo root) or export it in this shell."
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs

API_BASE="${SUPABASE_URL%/}/rest/v1"

step "[3/6] Reading latest runtime row from Supabase"
runtime_json=$(curl -s "${API_BASE}/pi_runtime_status?select=device_id,source_updated_at,updated_at&device_id=eq.${DEVICE_ID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

<<<<<<< ours
<<<<<<< ours
=======
set +e
>>>>>>> theirs
=======
set +e
>>>>>>> theirs
echo "$runtime_json" | python3 - <<'PY'
import json,sys
raw=sys.stdin.read().strip() or '[]'
rows=json.loads(raw)
if not rows:
    print('NO_ROWS')
    raise SystemExit(2)
r=rows[0]
print(f"device_id={r.get('device_id')} source_updated_at={r.get('source_updated_at')} updated_at={r.get('updated_at')}")
PY
<<<<<<< ours
<<<<<<< ours
case $? in
  0) ok "Runtime row found for device_id=${DEVICE_ID}" ;;
<<<<<<< ours
<<<<<<< ours
  *) warn "No runtime row found for device_id=${DEVICE_ID}" ;;
=======
=======
>>>>>>> theirs
=======
=======
>>>>>>> theirs
runtime_status=$?
set -e
case $runtime_status in
  0) ok "Runtime row found for device_id=${DEVICE_ID}" ;;
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
  *)
    warn "No runtime row found for device_id=${DEVICE_ID}"
    echo "Known device_id values in pi_runtime_status (if any):"
    curl -s "${API_BASE}/pi_runtime_status?select=device_id&limit=20" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" || true
    ;;
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
esac

step "[4/6] Reading latest camera snapshot row from Supabase"
snap_json=$(curl -s "${API_BASE}/pi_camera_snapshots?select=device_id,source_updated_at,updated_at,image_base64&device_id=eq.${DEVICE_ID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

<<<<<<< ours
<<<<<<< ours
=======
set +e
>>>>>>> theirs
=======
set +e
>>>>>>> theirs
echo "$snap_json" | python3 - <<'PY'
import json,sys
raw=sys.stdin.read().strip() or '[]'
rows=json.loads(raw)
if not rows:
    print('NO_ROWS')
    raise SystemExit(2)
r=rows[0]
b64=r.get('image_base64') or ''
print(f"device_id={r.get('device_id')} source_updated_at={r.get('source_updated_at')} b64_len={len(b64)}")
if len(b64)==0:
    raise SystemExit(3)
PY
<<<<<<< ours
<<<<<<< ours
case $? in
=======
snapshot_status=$?
set -e
case $snapshot_status in
>>>>>>> theirs
=======
snapshot_status=$?
set -e
case $snapshot_status in
>>>>>>> theirs
  0) ok "Snapshot row found with non-empty image_base64" ;;
  3) warn "Snapshot row exists but image_base64 is empty" ;;
  *) warn "No snapshot row found for device_id=${DEVICE_ID}" ;;
esac

step "[5/6] Freshness check (stats <=60s, snapshot <=30s)"
<<<<<<< ours
<<<<<<< ours
=======
set +e
>>>>>>> theirs
=======
set +e
>>>>>>> theirs
python3 - <<'PY'
import os, json, datetime
from urllib.request import Request, urlopen

base=os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1'
key=os.environ['SUPABASE_SERVICE_ROLE_KEY']
device=os.environ.get('DEVICE_ID') or os.environ.get('PI_DEVICE_ID','raspberry-pi')

def get_row(table, cols):
    url=f"{base}/{table}?select={cols}&device_id=eq.{device}"
    req=Request(url, headers={'apikey':key,'Authorization':f'Bearer {key}'})
    with urlopen(req, timeout=8) as r:
        arr=json.loads(r.read().decode())
    return arr[0] if arr else None

def age_seconds(ts):
    if not ts:
        return None
    ts=ts.replace('Z','+00:00')
    dt=datetime.datetime.fromisoformat(ts)
    now=datetime.datetime.now(datetime.timezone.utc)
    return (now-dt).total_seconds()

runtime=get_row('pi_runtime_status','source_updated_at')
snap=get_row('pi_camera_snapshots','source_updated_at')

r_age=age_seconds(runtime.get('source_updated_at') if runtime else None)
s_age=age_seconds(snap.get('source_updated_at') if snap else None)
print(f"runtime_age_sec={r_age} snapshot_age_sec={s_age}")

if r_age is None or r_age > 60:
    raise SystemExit(2)
if s_age is None or s_age > 30:
    raise SystemExit(3)
PY
<<<<<<< ours
<<<<<<< ours
case $? in
=======
freshness_status=$?
set -e
case $freshness_status in
>>>>>>> theirs
=======
freshness_status=$?
set -e
case $freshness_status in
>>>>>>> theirs
  0) ok "Freshness OK" ;;
  2) warn "Runtime stale/missing (>60s): dashboard will show offline" ;;
  3) warn "Snapshot stale/missing (>30s): image may be hidden" ;;
  *) warn "Freshness check could not be completed" ;;
esac

step "[6/6] Next.js deploy checklist"
echo "Set these vars in your web deployment:"
echo "  NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key, NOT service role>"
echo "  NEXT_PUBLIC_PI_DEVICE_ID=${DEVICE_ID}"
echo "  NEXT_PUBLIC_PI_STATS_URL=   (empty to skip localhost from internet deploy)"
ok "10-minute test completed"
