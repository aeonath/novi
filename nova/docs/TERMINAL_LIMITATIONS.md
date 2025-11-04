# Nova Terminal - Known Limitations

## Full-Screen Applications Not Supported

### What Doesn't Work

The following applications will **NOT** work in Nova's integrated terminal:
- ✗ `vi` / `vim`
- ✗ `nano`
- ✗ `emacs`
- ✗ `htop` / `top`
- ✗ `less` / `more` (interactive mode)
- ✗ Any full-screen TUI (Text User Interface) application

### Why This Happens

**Technical Explanation:**

Nova's terminal uses **pipes** (`stdin`/`stdout`/`stderr`) instead of a **PTY** (pseudo-terminal device).

**Pipes vs PTY:**

| Feature | Pipes (Nova) | PTY (node-pty) |
|---------|--------------|----------------|
| Simple commands | ✓ Yes | ✓ Yes |
| Full-screen apps | ✗ No | ✓ Yes |
| Terminal queries | ✗ No | ✓ Yes |
| Job control | ✗ No | ✓ Yes |
| Compilation | ✓ None | ✗ Requires C++ |

**What Full-Screen Apps Need:**

1. **TTY Device File**: Apps check if `stdout` is a TTY device file
   - Pipes: `isatty(stdout)` returns `false`
   - PTY: `isatty(stdout)` returns `true`

2. **Terminal Control**: Apps need to:
   - Query terminal size (`ioctl(TIOCGWINSZ)`)
   - Set raw mode (disable line buffering, echo)
   - Handle terminal resize signals (`SIGWINCH`)
   - None of these work with pipes

3. **Result**: Apps detect non-TTY and refuse to run

### Why We Use Pipes

**The node-pty Problem:**

`node-pty` provides real PTY support but requires:
- Native C++ compilation
- Visual Studio with specific components
- On Windows: **Spectre-mitigated libraries**

**Our Installation Attempt:**
```
error MSB8040: Spectre-mitigated libraries are required for this project
```

**The Choice:**

| Option | Pros | Cons |
|--------|------|------|
| **Pipes (Current)** | ✓ No compilation<br>✓ Works everywhere<br>✓ Simple | ✗ No full-screen apps<br>✗ No job control |
| **node-pty** | ✓ Full-screen apps<br>✓ Job control<br>✓ Complete | ✗ Compilation required<br>✗ Build issues<br>✗ Complex setup |

**Decision**: Prioritize **reliability** over **features**

---

## What DOES Work

### ✓ Supported Commands

**File Operations:**
```bash
$ ls
$ cd src
$ pwd
$ cat file.txt
$ mkdir new_dir
$ rm old_file.txt
```

**Git:**
```bash
$ git status
$ git add .
$ git commit -m "message"
$ git push
```

**Node/NPM:**
```bash
$ npm install
$ npm run build
$ npm test
$ node script.js
```

**Python:**
```bash
$ python script.py
$ pip install package
```

**Build Tools:**
```bash
$ make
$ cargo build
$ gcc -o output input.c
```

**Long-Running Commands:**
```bash
$ npm start
$ webpack --watch
$ tsc --watch
```

---

## Workarounds

### For Editing Files

**Option 1: Use Nova's Editor**
- Nova IS an editor - use it!
- `Ctrl+O` to open files
- Edit in Monaco editor

**Option 2: Use Nano Alternative**
```bash
# Use echo for simple edits
$ echo "new content" > file.txt

# Use cat with heredoc
$ cat << EOF > file.txt
line 1
line 2
EOF
```

**Option 3: Use External Editor**
```bash
# Open file in system default editor
$ start file.txt  # Windows
$ xdg-open file.txt  # Linux
$ open file.txt  # Mac
```

### For Viewing Files

**Instead of `less`:**
```bash
# View entire file
$ cat file.txt

# View with line numbers
$ cat -n file.txt

# View first/last lines
$ head file.txt
$ tail file.txt
$ tail -f logfile.txt  # Follow mode WORKS!
```

**Instead of `vim`:**
- Just open the file in Nova (`Ctrl+O`)
- Full syntax highlighting
- Better than vim! 😊

### For Process Monitoring

**Instead of `htop`:**
```bash
# Windows
$ tasklist
$ tasklist /FI "IMAGENAME eq node.exe"

# PowerShell (better)
$ Get-Process

# One-time snapshot (works!)
$ wmic process get name,processid,workingsetsize
```

---

## Future Plans

### If We Add node-pty

**Requirements:**
1. Install Visual Studio Build Tools
2. Install "MSVC Spectre-mitigated libs" component
3. Successfully compile node-pty
4. Test on all platforms

**Benefits:**
- Full-screen apps work
- Job control (Ctrl+Z, bg, fg)
- True PTY support
- Industry standard

**Costs:**
- Complex build setup
- Platform-specific issues
- Larger bundle size
- More dependencies

**Decision Point:**

We'll add node-pty **IF**:
1. Users request it (feedback)
2. Build issues are resolved
3. Clear use case emerges

For now: **Current solution works for 95% of use cases**

---

## Comparison with Other IDEs

### VS Code Terminal

- Uses **node-pty**
- Full PTY support
- vi/nano work
- **But**: Requires compilation

### Visual Studio Terminal

- Uses Windows ConPTY API (native)
- Full PTY support
- **But**: Windows-only

### IntelliJ Terminal

- Uses **pty.js** (node-pty predecessor)
- Full PTY support
- **But**: Requires compilation

### Nova (Current)

- Uses **pipes**
- No PTY support
- **But**: Works everywhere, no compilation

---

## Error Messages

### "output is not a terminal"

**When You'll See This:**
```bash
$ vi file.txt
Vim: Warning: Output is not to a terminal
$ nano file.txt
Error opening terminal
```

**What It Means:**
- App detected that output is not a TTY
- App refuses to run without full terminal

**Solution:**
- Use Nova's editor instead
- Or use echo/cat for quick edits

### "no job control in this shell"

**When You'll See This:**
```bash
bash: no job control in this shell
```

**What It Means:**
- Bash's `-i` flag enables job control
- But pipes don't support job control
- Just a warning, not fatal

**Solution:**
- Ignore the warning
- Don't try to use Ctrl+Z, bg, fg
- Run multiple terminals instead

---

## Technical Deep Dive

### Why Pipes Fail for vi

**What vi Does:**

1. **Check TTY:**
   ```c
   if (!isatty(STDOUT_FILENO)) {
     fprintf(stderr, "Output is not to a terminal\n");
     exit(1);
   }
   ```
   - With pipes: `isatty()` returns 0 (false)
   - With PTY: `isatty()` returns 1 (true)

2. **Query Terminal Size:**
   ```c
   struct winsize ws;
   ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws);
   ```
   - With pipes: `ioctl()` fails (not supported)
   - With PTY: Returns terminal dimensions

3. **Set Raw Mode:**
   ```c
   struct termios raw;
   tcgetattr(STDIN_FILENO, &raw);
   cfmakeraw(&raw);
   tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
   ```
   - With pipes: Fails (pipes have no terminal attributes)
   - With PTY: Works (PTY has termios state)

**Result**: vi sees non-TTY and exits

### The PTY Solution

**What node-pty Provides:**

```typescript
// node-pty creates a real PTY
const pty = require('node-pty');
const shell = pty.spawn('bash', [], {
  name: 'xterm-256color',
  cols: 80,
  rows: 24,
  cwd: process.cwd(),
  env: process.env
});

// Returns PTY master device file descriptor
// Apps see this as a real terminal
```

**How It Works:**

1. **Creates PTY pair**: Master (Node) + Slave (Bash)
2. **Slave is a TTY**: `isatty()` returns true
3. **Supports ioctl**: Terminal queries work
4. **Supports termios**: Raw mode works

**But**: Requires native code (C++) for PTY creation

---

## Recommendation

**For Most Users:**
- Current terminal is **sufficient**
- Use Nova's editor for files
- Use terminal for commands
- **Don't miss vi!**

**If You Need vi:**
- Install Spectre libraries
- We can add node-pty
- Or use external terminal

---

## Installation (If Needed)

### To Enable node-pty

**1. Install Visual Studio Build Tools:**
- Download: https://visualstudio.microsoft.com/downloads/
- Select: "Desktop development with C++"
- Required components:
  - MSVC v143 build tools
  - Windows 10 SDK
  - **MSVC Spectre-mitigated libs (latest)**

**2. Install node-pty:**
```bash
npm install node-pty
```

**3. Update terminal-service.ts** to use node-pty

**If successful**: vi will work!

---

## Status

**Current (v0.2.0):**
- ✓ Terminal works
- ✓ Commands execute
- ✓ History preserved
- ✗ No full-screen apps

**Future (if needed):**
- Add node-pty integration
- Full PTY support
- All apps work

**Decision**: Wait for user feedback

