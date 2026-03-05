#!/bin/bash
# Cross-platform build script for Novi
# Usage:
#   ./buildit.sh          - build for current platform (deb on Linux, portable on Windows)
#   ./buildit.sh deb      - build Debian package (Linux)
#   ./buildit.sh win      - build Windows portable (requires Windows/WSL with PowerShell)
#   ./buildit.sh exe      - build Windows NSIS installer (requires Windows/WSL with PowerShell)

set -e

TARGET="${1:-auto}"

echo "Cleaning previous builds..."
npm run clean

echo "Building TypeScript..."
npm run build

# Copy icon into build/ for electron-builder
npm run copy:icon

if [ "$TARGET" = "auto" ]; then
    case "$(uname -s)" in
        Linux*)  TARGET="deb" ;;
        MINGW*|MSYS*|CYGWIN*) TARGET="win" ;;
        *)
            echo "Unknown platform: $(uname -s). Specify target: deb, win, or exe"
            exit 1
            ;;
    esac
fi

export CSC_IDENTITY_AUTO_DISCOVERY=false

case "$TARGET" in
    deb)
        echo "Building Debian package..."
        npx electron-builder --linux deb
        ;;
    win)
        echo "Building Windows portable..."
        export ELECTRON_BUILDER_NSIS_SKIP_SIGNING=true
        npx electron-builder --win portable
        ;;
    exe)
        echo "Building Windows NSIS installer..."
        export ELECTRON_BUILDER_NSIS_SKIP_SIGNING=true
        npx electron-builder --win nsis
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo "Usage: ./buildit.sh [deb|win|exe]"
        exit 1
        ;;
esac

echo "Packaging complete! Check dist/ for output."
