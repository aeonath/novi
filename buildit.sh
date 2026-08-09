#!/bin/bash
# Cross-platform build script for Novi
# Usage: ./buildit.sh <target>
#   ./buildit.sh deb      - build Debian package (Linux)
#   ./buildit.sh win      - build Windows portable EXE
#   ./buildit.sh installer - build Windows NSIS installer

set -e

print_usage() {
    echo "Usage: ./buildit.sh <target>"
    echo ""
    echo "Targets:"
    echo "  deb       - Build Debian package (Linux)"
    echo "  win       - Build Windows portable EXE"
    echo "  installer - Build Windows NSIS installer"
}

if [ -z "$1" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    print_usage
    exit 0
fi

TARGET="$1"

echo "Cleaning previous builds..."
npm run clean

echo "Building TypeScript..."
npm run build

# Copy icon into build/ for electron-builder
npm run copy:icon

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
    installer)
        echo "Building Windows NSIS installer..."
        export ELECTRON_BUILDER_NSIS_SKIP_SIGNING=true
        npx electron-builder --win nsis
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo ""
        print_usage
        exit 1
        ;;
esac

echo "Packaging complete! Check dist/ for output."
