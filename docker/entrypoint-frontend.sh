#!/usr/bin/env sh
set -e

# Generate runtime env config for frontend
HTML_DIR="/usr/share/nginx/html"
ENV_JS="$HTML_DIR/env.js"

# Use VITE_API_URL if provided at runtime; otherwise empty (same-origin)
: "${VITE_API_URL:=}"

cat > "$ENV_JS" <<EOF
// Runtime-injected config
window.__APP_CONFIG__ = {
  API_URL: "${VITE_API_URL}"
};
EOF

echo "[entrypoint] Wrote $ENV_JS with API_URL='${VITE_API_URL}'"

exec nginx -g 'daemon off;'

