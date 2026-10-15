#!/bin/sh
set -eu

BASE_URL="${DATAWITNESS_BASE_URL:-http://127.0.0.1:8000}"
server_pid=""
attempt=0

cleanup() {
  if [ -n "$server_pid" ]; then
    kill "$server_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ! curl --fail --silent "$BASE_URL/api/health" >/dev/null 2>&1; then
  uv run --project backend --directory backend uvicorn app.main:app --host 127.0.0.1 --port 8000 >"${TMPDIR:-/tmp}/datawitness-smoke.log" 2>&1 &
  server_pid=$!
  ready=0
  attempt=0
  while [ "$attempt" -lt 50 ]; do
    if curl --fail --silent "$BASE_URL/api/health" >/dev/null 2>&1; then ready=1; break; fi
    attempt=$((attempt + 1))
    sleep 0.2
  done
  [ "$ready" -eq 1 ] || { printf '%s\n' "Backend did not become ready" >&2; exit 1; }
fi

demo_response=$(curl --fail --silent --show-error -X POST "$BASE_URL/api/demo/investigations")
investigation_id=$(printf '%s' "$demo_response" | python3 -c 'import json,sys; print(json.load(sys.stdin)["investigation_id"])')

status="queued"
attempt=0
while [ "$attempt" -lt 100 ]; do
  summary=$(curl --fail --silent "$BASE_URL/api/investigations/$investigation_id")
  status=$(printf '%s' "$summary" | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')
  case "$status" in
    completed|partial|failed|cancelled) break ;;
  esac
  attempt=$((attempt + 1))
  sleep 0.2
done

[ "$status" = "completed" ] || { printf '%s\n' "Demo ended with status: $status" >&2; exit 1; }
reproduction=$(printf '%s' "$summary" | python3 -c 'import json,sys; print(json.load(sys.stdin)["reproduction_status"])')
[ "$reproduction" = "verified_reproducer" ] || { printf '%s\n' "Demo did not produce verified evidence" >&2; exit 1; }

report=$(curl --fail --silent "$BASE_URL/api/investigations/$investigation_id/report?format=html")
[ -n "$report" ] || { printf '%s\n' "Demo report was empty" >&2; exit 1; }
printf 'Smoke test passed: %s (%s)\n' "$investigation_id" "$reproduction"
