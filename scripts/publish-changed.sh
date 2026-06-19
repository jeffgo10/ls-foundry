#!/usr/bin/env bash
# Publish @jeffgo10/* packages that changed between two git refs.
# Used by CI on push to master and locally via pnpm run deploy:changed.
set -euo pipefail

BEFORE="${1:?before ref required (e.g. origin/master~1 or a commit SHA)}"
AFTER="${2:-HEAD}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mapfile -t PACKAGE_DIRS < <(
  git diff --name-only "$BEFORE" "$AFTER" -- packages/ \
    | cut -d/ -f1-2 \
    | sort -u
)

NAMES=()
for dir in "${PACKAGE_DIRS[@]}"; do
  [[ -f "$dir/package.json" ]] || continue
  if node -pe "Boolean(require('./$dir/package.json').private)" 2>/dev/null | grep -q true; then
    continue
  fi
  name="$(node -pe "require('./$dir/package.json').name")"
  NAMES+=("$name")
done

if [[ ${#NAMES[@]} -eq 0 ]]; then
  echo "No publishable package changes between $BEFORE and $AFTER."
  exit 0
fi

echo "Publishable packages changed:"
printf '  - %s\n' "${NAMES[@]}"

echo "Building packages..."
pnpm run build:packages

PUBLISH_ARGS=(publish --access public --no-git-checks)
for name in "${NAMES[@]}"; do
  PUBLISH_ARGS+=(--filter "$name")
done

echo "Publishing to GitHub Packages..."
pnpm "${PUBLISH_ARGS[@]}"
