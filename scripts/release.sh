#!/usr/bin/env bash
# turistguide-maps production release script
# Usage: ./scripts/release.sh [--skip-tests]
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

SKIP_TESTS=false
[[ "${1:-}" == "--skip-tests" ]] && SKIP_TESTS=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[release]${NC} $*"; }
warn() { echo -e "${YELLOW}[release]${NC} $*"; }
fail() { echo -e "${RED}[release]${NC} $*" >&2; exit 1; }

# ── 1. Pre-flight ──────────────────────────────────────────
log "Pre-flight checks..."

if ! node -v >/dev/null 2>&1; then
  fail "Node.js not found"
fi

if [[ ! -f "package.json" ]]; then
  fail "Not in project root (missing package.json)"
fi

if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  warn "Uncommitted changes detected. Continue? (y/N)"
  read -r answer
  [[ "$answer" =~ ^[Yy]$ ]] || fail "Aborted — commit your changes first"
fi

# ── 2. Tests ───────────────────────────────────────────────
if [[ "$SKIP_TESTS" == true ]]; then
  warn "Skipping tests (--skip-tests)"
else
  log "Running tests..."
  npm run test:run || fail "Tests failed — fix before releasing"
  log "Tests passed ✓"
fi

# ── 3. Build ───────────────────────────────────────────────
log "Building production bundle..."
npm run build || fail "Build failed"
log "Build complete ✓"

# ── 4. Stop old server ─────────────────────────────────────
OLD_PID=$(lsof -ti :3000 2>/dev/null || true)
if [[ -n "$OLD_PID" ]]; then
  log "Stopping existing server (PID: $(echo "$OLD_PID" | tr '\n' ' '))"
  echo "$OLD_PID" | xargs kill -TERM 2>/dev/null || true

  # Wait up to 10s for graceful shutdown
  for i in $(seq 1 10); do
    if ! lsof -ti :3000 >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  # Force kill if still running
  REMAINING=$(lsof -ti :3000 2>/dev/null || true)
  if [[ -n "$REMAINING" ]]; then
    warn "Force-killing stuck process"
    echo "$REMAINING" | xargs kill -KILL 2>/dev/null || true
    sleep 1
  fi
  log "Old server stopped ✓"
else
  log "No existing server on port 3000"
fi

# ── 5. Start new server ────────────────────────────────────
log "Starting production server..."
set -a; source .env; set +a
nohup npm run start > /tmp/turistguide-prod.log 2>&1 &
SERVER_PID=$!

# Wait up to 15s for server to be ready
log "Waiting for server to accept connections..."
for i in $(seq 1 15); do
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    log "Server ready on :3000 (PID: $SERVER_PID) ✓"
    break
  fi
  if [[ $i -eq 15 ]]; then
    fail "Server failed to start within 15s. Check /tmp/turistguide-prod.log"
  fi
  sleep 1
done

# ── 6. Smoke test ──────────────────────────────────────────
log "Running smoke test..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://turistguide.karwackid.cloud 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "200" ]]; then
  log "Smoke test passed — https://turistguide.karwackid.cloud returns 200 ✓"
else
  warn "Smoke test returned HTTP $HTTP_CODE (tunnel may take a moment to reconnect)"
fi

# ── 7. Summary ─────────────────────────────────────────────
echo ""
log "═══════════════════════════════════════"
log "  Release complete!"
log "  URL:  https://turistguide.karwackid.cloud"
log "  PID:  $SERVER_PID"
log "  Log:  /tmp/turistguide-prod.log"
log "═══════════════════════════════════════"