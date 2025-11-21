#!/c/Python/python
import argparse
import os
import time
import glob
import tempfile

BUGDIR = "aeon/backlog"
os.makedirs(BUGDIR, exist_ok=True)


def generate_bug_id():
    """Generate a bug ID based on date+time."""
    return time.strftime("%Y%m%d_%H%M")


def create_bug(description, priority):
    bug_id = generate_bug_id()
    filename = os.path.join(BUGDIR, f"bug_{bug_id}.md")

    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"ID: {bug_id}\n")
        f.write(f"Status: Open\n")
        f.write(f"Priority: {priority}\n")
        f.write("\n")
        f.write("## Description\n")
        f.write(description.strip() + "\n")

    print(f"New bug filed: {filename}")
    return filename


def close_bug(bug_id):
    pattern = os.path.join(BUGDIR, f"bug_{bug_id}*.md")
    matches = glob.glob(pattern)

    if not matches:
        print(f"Error: bug ID {bug_id} not found.")
        return

    filepath = matches[0]

    # Read the file
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Check if already closed
    for line in lines:
        if line.startswith("Status: Closed"):
            print(f"Bug {bug_id} is already closed.")
            return

    # Rewrite status
    with open(filepath, "w", encoding="utf-8") as f:
        for line in lines:
            if line.startswith("Status:"):
                f.write("Status: Closed\n")
            else:
                f.write(line)

    print(f"Bug {bug_id} marked as closed.")


def list_bugs():
    print("==== Nova Bug Backlog (Open Only) ====\n")

    bug_files = glob.glob(os.path.join(BUGDIR, "bug_*.md"))
    if not bug_files:
        print("(no bugs found)")
        return

    results = []

    for fpath in bug_files:
        with open(fpath, "r", encoding="utf-8") as f:
            lines = f.readlines()

        # Extract metadata
        status = next((l.split()[1] for l in lines if l.startswith("Status:")), "Open")
        if status == "Closed":
            continue

        priority = next((l.split()[1].lower() for l in lines if l.startswith("Priority:")), "medium")
        desc_index = next((i for i, l in enumerate(lines) if l.strip() == "## Description"), None)

        if desc_index is not None and desc_index + 1 < len(lines):
            description = lines[desc_index + 1].strip()
        else:
            description = "(no description)"

        # Weight for sorting
        weight = {"high": 1, "medium": 2, "low": 3}.get(priority, 2)
        bug_id = next((l.split()[1] for l in lines if l.startswith("ID:")), "?")

        results.append((weight, os.path.basename(fpath), priority, status, description))

    if not results:
        print("(no open bugs found)")
        return

    # Sort by weight
    results.sort(key=lambda x: x[0])

    for _, fname, prio, status, desc in results:
        print(f"[{fname}] {prio} — {status} — {desc}")


def main():
    parser = argparse.ArgumentParser(add_help=False)

    parser.add_argument("--high", action="store_true")
    parser.add_argument("--low", action="store_true")
    parser.add_argument("-l", action="store_true")
    parser.add_argument("--close")
    parser.add_argument("--help", "-h", action="store_true")
    parser.add_argument("description", nargs="*", default=[])

    args = parser.parse_args()

    # --- Help ---
    if args.help:
        print(
            "Usage: file_bug.py [option] [description]\n"
            "Options:\n"
            "  --high             File a new bug with HIGH priority\n"
            "  --low              File a new bug with LOW priority\n"
            "  -l                 List all open bugs\n"
            "  --close <bug_id>   Mark a bug as closed\n"
            "  --help, -h         Show this help message\n"
        )
        return

    # --- Close a bug ---
    if args.close:
        close_bug(args.close)
        return

    # --- List bugs ---
    if args.l:
        list_bugs()
        return

    # --- Create a new bug ---
    if args.high:
        priority = "High"
    elif args.low:
        priority = "Low"
    else:
        priority = "Medium"

    description = " ".join(args.description).strip()
    if not description:
        print("Error: please provide a bug description.")
        return

    create_bug(description, priority)


if __name__ == "__main__":
    main()

