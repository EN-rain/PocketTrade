#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
EMAIL="${SMOKE_EMAIL:-smoke@example.com}"

echo "Health"
curl -fsS "$BASE/health" >/dev/null

echo "Request OTP"
resp="$(curl -fsS -X POST "$BASE/auth/request-otp" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")"
code="$(printf '%s' "$resp" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).devCode||''))")"
test -n "$code"

echo "Verify OTP"
verify="$(curl -fsS -X POST "$BASE/auth/verify-otp" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"code\":\"$code\"}")"
token="$(printf '%s' "$verify" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).accessToken||''))")"
test -n "$token"

echo "List listings"
curl -fsS "$BASE/listings" >/dev/null

echo "Smoke passed"
