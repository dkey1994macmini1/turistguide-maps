#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GLOBAL_CONFIG="$HOME/.cloudflared/config.yml"
SNIPPET="$PROJECT_DIR/deploy/cloudflared/turistguide.ingress.yml"
HOSTNAME="turistguide.karwackid.cloud"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

if [[ ! -f "$GLOBAL_CONFIG" ]]; then
  echo "Missing global cloudflared config: $GLOBAL_CONFIG" >&2
  exit 1
fi

if [[ ! -f "$SNIPPET" ]]; then
  echo "Missing project snippet: $SNIPPET" >&2
  exit 1
fi

python3 - "$GLOBAL_CONFIG" "$SNIPPET" "$HOSTNAME" "$TMP_FILE" <<'PY'
from pathlib import Path
import sys

global_config = Path(sys.argv[1])
snippet = Path(sys.argv[2]).read_text().rstrip() + "\n"
hostname = sys.argv[3]
out = Path(sys.argv[4])
content = global_config.read_text()
lines = content.splitlines()
result = []
i = 0
while i < len(lines):
    line = lines[i]
    if line.strip() == f"- hostname: {hostname}":
        i += 1
        while i < len(lines) and not lines[i].startswith("  - "):
            i += 1
        continue
    result.append(line)
    i += 1
new_content = "\n".join(result).rstrip() + "\n"
catchall = "  - service: http_status:404\n"
if catchall not in new_content:
    raise SystemExit("catch-all ingress rule not found in global cloudflared config")
new_content = new_content.replace(catchall, snippet + catchall, 1)
out.write_text(new_content)
PY

cp "$TMP_FILE" "$GLOBAL_CONFIG"
echo "Updated $GLOBAL_CONFIG from project-owned snippet"
