#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${E2E_EMAIL:-e2e@example.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-TestAdminPass123!}"
PHOTO_FILE="${PHOTO_FILE:-}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if [ -z "$PHOTO_FILE" ]; then
  PHOTO_FILE="$tmp/photo.jpg"
  printf '\xff\xd8\xff\xe0PocketTradeTest\xff\xd9' > "$PHOTO_FILE"
fi

echo "1. Health"
curl -fsS "$BASE_URL/health" >/dev/null

echo "2. Request email OTP"
otp_response="$(curl -fsS -X POST "$BASE_URL/auth/request-otp" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")"
code="$(printf '%s' "$otp_response" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).devCode||''))")"
if [ -z "$code" ]; then
  echo "devCode missing. Run against NODE_ENV=development or read the code from email/logs." >&2
  exit 1
fi

echo "3. Verify OTP"
verify_response="$(curl -fsS -X POST "$BASE_URL/auth/verify-otp" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"code\":\"$code\"}")"
user_token="$(printf '%s' "$verify_response" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).accessToken))")"
refresh_token="$(printf '%s' "$verify_response" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).refreshToken))")"

echo "4. Create listing with photos"
listing_response="$(curl -fsS -X POST "$BASE_URL/listings" \
  -H "Authorization: Bearer $user_token" \
  -F "photos=@$PHOTO_FILE" \
  -F "brand=Apple" \
  -F "model=iPhone 14" \
  -F "price=699" \
  -F "condition=good" \
  -F "storage=128GB" \
  -F "colour=Midnight" \
  -F "location=New York, NY" \
  -F "description=PocketTrade e2e listing with multiple feature coverage.")"
listing_id="$(printf '%s' "$listing_response" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).id))")"

echo "5. Admin approve"
admin_response="$(curl -fsS -X POST "$BASE_URL/admin/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")"
admin_token="$(printf '%s' "$admin_response" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).accessToken))")"
curl -fsS -X POST "$BASE_URL/admin/listings/$listing_id/approve" -H "Authorization: Bearer $admin_token" >/dev/null

echo "6. Favorite, conversation, report, logout"
curl -fsS -X POST "$BASE_URL/favorites" -H "Authorization: Bearer $user_token" -H 'Content-Type: application/json' -d "{\"listingId\":$listing_id}" >/dev/null
conversation_response="$(curl -fsS -X POST "$BASE_URL/conversations" -H "Authorization: Bearer $user_token" -H 'Content-Type: application/json' -d "{\"listingId\":$listing_id}")"
conversation_id="$(printf '%s' "$conversation_response" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).id))")"
curl -fsS -X POST "$BASE_URL/reports" -H "Authorization: Bearer $user_token" -H 'Content-Type: application/json' -d "{\"reportedListingId\":$listing_id,\"conversationId\":$conversation_id,\"reason\":\"scam\",\"details\":\"e2e report\"}" >/dev/null
curl -fsS -X POST "$BASE_URL/auth/logout" -H "Authorization: Bearer $user_token" -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$refresh_token\"}" >/dev/null

echo "E2E passed: listing=$listing_id conversation=$conversation_id"
