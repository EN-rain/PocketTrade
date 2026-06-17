#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
EMAIL="${SMOKE_EMAIL:-smoke@example.com}"

curl -fsS "$BASE/health" >/dev/null
resp="$(curl -fsS -X POST "$BASE/auth/request-otp" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")"
code="$(printf '%s' "$resp" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).devCode||''))")"
test -n "$code"
verify="$(curl -fsS -X POST "$BASE/auth/verify-otp" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"code\":\"$code\"}")"
token="$(printf '%s' "$verify" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).accessToken||''))")"
test -n "$token"
curl -fsS "$BASE/listings" >/dev/null
echo "Smoke passed"
