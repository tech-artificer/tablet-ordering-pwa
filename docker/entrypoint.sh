#!/bin/sh
set -eu

RUNTIME_CONFIG_FILE="/var/cache/nginx/runtime-config.js"

js_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

API_BASE_URL=$(js_string "${APP_RUNTIME_API_BASE_URL:-/api}")
REVERB_HOST=$(js_string "${APP_RUNTIME_REVERB_HOST:-}")
REVERB_APP_KEY=$(js_string "${APP_RUNTIME_REVERB_APP_KEY:-}")
REVERB_PORT=$(js_string "${APP_RUNTIME_REVERB_PORT:-443}")
REVERB_SCHEME=$(js_string "${APP_RUNTIME_REVERB_SCHEME:-https}")
REVERB_PATH=$(js_string "${APP_RUNTIME_REVERB_PATH:-/app}")

cat > "$RUNTIME_CONFIG_FILE" <<EOF
window.__APP_CONFIG__ = {
  apiBaseUrl: "${API_BASE_URL}",
  reverbHost: "${REVERB_HOST}",
  reverbAppKey: "${REVERB_APP_KEY}",
  reverbPort: "${REVERB_PORT}",
  reverbScheme: "${REVERB_SCHEME}",
  reverbPath: "${REVERB_PATH}"
};
EOF

exec "$@"
