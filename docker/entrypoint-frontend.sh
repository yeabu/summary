#!/usr/bin/env sh
set -e

HTML_DIR="/usr/share/nginx/html"
ENV_JS="$HTML_DIR/env.js"

# Allow runtime override for API base; default to same-origin
: "${VITE_API_URL:=}"

cat > "$ENV_JS" <<EOF_ENV
// Runtime-injected config
window.__APP_CONFIG__ = {
  API_URL: "${VITE_API_URL}"
};
EOF_ENV

echo "[frontend-entrypoint] Wrote $ENV_JS with API_URL='${VITE_API_URL}'"

exec nginx -g 'daemon off;'
