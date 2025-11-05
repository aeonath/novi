#!/usr/bin/env bash
# Usage:
#   ./file_bug.sh "description of bug"
#   ./file_bug.sh -h "description of bug"
#   ./file_bug.sh -l "description of bug"
#   ./file_bug.sh -v

BUGDIR="aeon/backlog"
mkdir -p "$BUGDIR"

# --- View mode ---
if [[ "$1" == "-v" ]]; then
  echo "==== Nova Bug Backlog ===="
  echo

  shopt -s nullglob
  files=("$BUGDIR"/bug_*.md)
  if [ ${#files[@]} -eq 0 ]; then
    echo "(no bugs found)"
    exit 0
  fi

  tmpfile=$(mktemp)
  for f in "${files[@]}"; do
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
  -h) PRIORITY="high"; shift ;;
  -l) PRIORITY="low"; shift ;;
esac

DESC="$*"
if [ -z "$DESC" ]; then
  echo "Usage: $0 [-h|-l|-v] \"description of bug\""
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

