#!/usr/bin/env bash
# Usage:
#   ./file_bug.sh "description of bug"
#   ./file_bug.sh --high "description of bug"
#   ./file_bug.sh --low "description of bug"
#   ./file_bug.sh -l
#   ./file_bug.sh --close <bug_id>
#   ./file_bug.sh --help or -h

BUGDIR="aeon/backlog"
mkdir -p "$BUGDIR"

show_help() {
  cat <<EOF
Usage: $0 [option] [description]
Options:
  --high             File a new bug with HIGH priority
  --low              File a new bug with LOW priority
  -l                 List all open bugs (sorted by priority)
  --close <bug_id>   Mark a bug as closed
  --help, -h         Show this help message

Examples:
  $0 "App crashes on save"
  $0 --high "Window not movable after launch"
  $0 --close 20251105_1732
EOF
}

# --- Help mode ---
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  show_help
  exit 0
fi

# --- Close mode ---
if [[ "$1" == "--close" ]]; then
  BUGID="$2"
  if [ -z "$BUGID" ]; then
    echo "Error: please specify a bug ID (e.g., 20251105_1732)"
    exit 1
  fi

  FILE=$(find "$BUGDIR" -type f -name "bug_${BUGID}*.md" | head -n1)
  if [ -z "$FILE" ]; then
    echo "Error: bug ID $BUGID not found."
    exit 1
  fi

  if grep -q "^Status: Closed" "$FILE"; then
    echo "Bug $BUGID is already closed."
    exit 0
  fi

  sed -i 's/^Status: .*/Status: Closed/' "$FILE"
  echo "Bug $BUGID marked as closed."
  exit 0
fi

# --- List mode ---
if [[ "$1" == "-l" ]]; then
  echo "==== Nova Bug Backlog (Open Only) ===="
  echo

  shopt -s nullglob
  files=("$BUGDIR"/bug_*.md)
  if [ ${#files[@]} -eq 0 ]; then
    echo "(no bugs found)"
    exit 0
  fi

  tmpfile=$(mktemp)
  for f in "${files[@]}"; do
    status=$(grep "^Status:" "$f" | awk '{print $2}')
    if [[ "$status" == "Closed" ]]; then
      continue
    fi
    priority=$(grep -m1 "^Priority:" "$f" | awk '{print tolower($2)}')
    [ -z "$priority" ] && priority="medium"
    case "$priority" in
      high) weight=1 ;;
      medium) weight=2 ;;
      low) weight=3 ;;
      *) weight=2 ;;
    esac
    echo "$weight|$f|$priority" >> "$tmpfile"
  done

  if [ ! -s "$tmpfile" ]; then
    echo "(no open bugs found)"
    rm -f "$tmpfile"
    exit 0
  fi

  sort -t'|' -k1,1n "$tmpfile" | while IFS='|' read -r weight f priority; do
    desc=$(grep -A1 "## Description" "$f" | tail -n1)
    id=$(grep "^ID:" "$f" | awk '{print $2}')
    status=$(grep "^Status:" "$f" | awk '{print $2}')
    printf "[%s] %s — %s — %s\n" "$(basename "$f")" "$priority" "$status" "$desc"
  done
  rm -f "$tmpfile"
  exit 0
fi

# --- New bug mode ---
PRIORITY="medium"
case "$1" in
  --high) PRIORITY="high"; shift ;;
  --low) PRIORITY="low"; shift ;;
esac

DESC="$*"
if [ -z "$DESC" ]; then
  show_help
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M")
FILENAME_BASE="$BUGDIR/bug_$TIMESTAMP.md"
FILENAME="$FILENAME_BASE"

COUNT=1
while [ -e "$FILENAME" ]; do
  FILENAME="${FILENAME_BASE%.*}.$COUNT.md"
  ((COUNT++))
done

{
  echo "# Bug Report"
  echo "ID: $TIMESTAMP"
  echo "Date Submitted: $(date)"
  echo "Submitted By: Michael (Aeonath)"
  echo "Status: Open"
  echo "Priority: $PRIORITY"
  echo
  echo "## Description"
  echo "$DESC"
  echo
  echo "## Notes"
  echo "(add reproduction steps or logs here)"
} > "$FILENAME"

echo "Created $FILENAME (priority: $PRIORITY)"
