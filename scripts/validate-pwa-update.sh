#!/bin/sh
set -eu

BASE_URL="${1:-http://localhost:3000}"

fail() {
  printf '%s\n' "Validation failed: $1" >&2
  exit 1
}

fetch_headers() {
  curl -fsSI "$1"
}

fetch_body() {
  curl -fsS "$1"
}

root_headers="$(fetch_headers "$BASE_URL/")"
runtime_headers="$(fetch_headers "$BASE_URL/runtime-config.js")"
sw_headers="$(fetch_headers "$BASE_URL/sw.js")"
manifest_headers="$(fetch_headers "$BASE_URL/manifest.webmanifest")"
runtime_body="$(fetch_body "$BASE_URL/runtime-config.js")"

printf '%s\n' "$root_headers" | grep -qiE '^cache-control: .*no-store|^cache-control: .*must-revalidate' \
  || fail "root page should be no-store or must-revalidate"

printf '%s\n' "$runtime_headers" | grep -qi 'cache-control: .*no-store' \
  || fail "/runtime-config.js should be no-store"

printf '%s\n' "$sw_headers" | grep -qi 'cache-control: .*no-store' \
  || fail "/sw.js should be no-store"

printf '%s\n' "$manifest_headers" | grep -qiE 'cache-control: .*must-revalidate|cache-control: .*max-age=[0-9]+' \
  || fail "/manifest.webmanifest should be short-lived or revalidated"

printf '%s\n' "$runtime_body" | grep -q 'window.__APP_CONFIG__' \
  || fail "/runtime-config.js does not define window.__APP_CONFIG__"

nuxt_asset_path="$(curl -fsS "$BASE_URL/" | grep -oE '/_nuxt/[^" ]+' | head -n 1 || true)"
if [ -n "${nuxt_asset_path:-}" ]; then
  nuxt_headers="$(fetch_headers "$BASE_URL$nuxt_asset_path")"
  printf '%s\n' "$nuxt_headers" | grep -qi 'cache-control: .*immutable' \
    || fail "$nuxt_asset_path should be immutable"
fi

printf '%s\n' "PWA update validation passed for $BASE_URL"
