#!/bin/sh
REPO="$(cd "$(dirname "$0")/.." && pwd)"
exec "$REPO/node_modules/.bin/electron" "$REPO" --novi-cli "$@"
