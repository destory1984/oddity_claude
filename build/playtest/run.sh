#!/usr/bin/env bash
# Sends an order to the Codex playtester (AGENTS.md) and waits for it, 30 minutes at most.
# The order is a text file (Korean is fine); the report lands in assets/playtest/report.md
# and Codex's own last words at the end of assets/playtest/codex.log.
# Run: bash build/playtest/run.sh assets/playtest/order.txt
# Codex runs without its sandbox: inside it the camera's Chromium could not be started
# (spawn EPERM, 2026-10-23), and the user chose full access ("Codex에게 전권"). What it may
# touch is said in AGENTS.md only, so the tree is compared before and after.
# It uses the OpenAI quota of the logged-in account.
set -euo pipefail
cd "$(dirname "$0")/../.."
order="${1:?give the order file}"
[ -f "$order" ] || { echo "no order file $order" >&2; exit 1; }
codex=$(command -v codex || true)
[ -n "$codex" ] || codex="$(npm prefix -g)/codex"
mkdir -p assets/playtest
rm -f assets/playtest/report.md
before=$(git status --porcelain; git rev-parse HEAD)
timeout 1800 "$codex" exec --skip-git-repo-check --sandbox danger-full-access - \
  < "$order" > assets/playtest/codex.log 2>&1 || echo "codex ended with $?" >&2
after=$(git status --porcelain; git rev-parse HEAD)
if [ "$before" != "$after" ]; then
  echo "THE TREE CHANGED while Codex ran:" >&2
  git status --short >&2
fi
[ -f assets/playtest/report.md ] && echo "report: assets/playtest/report.md" || echo "no report written" >&2
