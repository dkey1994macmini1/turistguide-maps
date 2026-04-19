#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_CONF="$PROJECT_DIR/deploy/nginx/turistguide.conf"
TARGET_CONF="/opt/homebrew/etc/nginx/servers/turistguide.conf"

if [[ ! -f "$SOURCE_CONF" ]]; then
  echo "Missing source nginx config: $SOURCE_CONF" >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET_CONF")"
rm -f "$TARGET_CONF"
ln -s "$SOURCE_CONF" "$TARGET_CONF"
echo "Linked $TARGET_CONF -> $SOURCE_CONF"
