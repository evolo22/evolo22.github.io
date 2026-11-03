#!/bin/sh
# Installs the heartbeat as systemd *user* units (no root needed).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
ENV_DIR="$HOME/.config/lizard-deck"

mkdir -p "$UNIT_DIR" "$ENV_DIR"
cp "$HERE/lizard-heartbeat.service" "$HERE/lizard-heartbeat.timer" "$HERE/lizard-away.service" "$UNIT_DIR/"

if [ ! -f "$ENV_DIR/env" ]; then
  cat > "$ENV_DIR/env" <<'EOF'
STATUS_BASE=https://lizard-status.YOUR-SUBDOMAIN.workers.dev
PING_TOKEN=paste-the-same-secret-you-gave-wrangler
EOF
  chmod 600 "$ENV_DIR/env"
  echo "Created $ENV_DIR/env. Fill it in, then run this script again."
  exit 0
fi

systemctl --user daemon-reload
systemctl --user enable --now lizard-heartbeat.timer lizard-away.service
systemctl --user start lizard-heartbeat.service
echo "Heartbeat installed. Check with: systemctl --user list-timers | grep lizard"
