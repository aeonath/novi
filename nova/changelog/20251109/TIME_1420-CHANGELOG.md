# Complete Lyric Grammar Support with +++ Symbol

**Date**: 2025-11-09 14:20  
**Sprint**: 5  
**Version**: 0.5.0

## Changes

### Lyric Syntax Highlighting

- Added support for `+++` special symbol in Lyric language
- Expanded Lyric keyword list to match complete TextMate grammar:
  - Declaration keywords: `def`, `class`, `var`, `god`, `bin`, `int`, `flt`, `str`, `rex`, `pyobject`, `None`, `return`
  - Control flow: `if`, `else`, `elif`, `given`, `for`, `done`, `try`, `catch`, `finally`, `raise`, `importpy`, `break`, `continue`, `end`
  - Logical operators: `and`, `or`, `not`, `in`, `as`
  - Boolean literals: `true`, `false`, `True`, `False`
  - Built-in functions: `self`, `print`, `input`, `float`, `len`, `range`, `type`, `isinstance`, `open`, `regex`, `append`, `keys`, `values`
- Added single-quote string support in Monarch tokenizer
- Special symbol `+++` is now highlighted as a keyword (used for special method declarations in Lyric)

### Test Fixes

- Fixed logger test to handle crash reporter ERROR logs that appear before INFO logs
- Test now finds the first INFO line instead of assuming it's the first line in the log file

## Technical Details

**Files Modified**:
- `src/main/main.ts` - Updated both IPC handlers (`load-lyric-extension` and `load-all-extensions`) with complete Lyric grammar
- `src/tests/core-0.1.0/logger.test.ts` - Fixed test to handle multiple log levels

**Grammar Structure**:
- The `+++` symbol regex must appear **before** the generic operator regex to be matched correctly
- Monarch tokenizer rule order matters: more specific patterns must come before generic ones
- Single-quote and double-quote strings are handled separately with their own states

## Testing

- All 427 unit tests passing
- Build successful
- Lyric syntax highlighting now includes:
  - `+++` special method syntax
  - Complete keyword set
  - Single and double-quoted strings
  - Comments, numbers, and operators

## Rationale

The `+++` symbol is a special Lyric language feature for declaring special methods (similar to Python's `__init__`). The TextMate grammar defines it as `keyword.other.special-method.lyric`. By matching the complete grammar from the TextMate definition, we ensure that Lyric files have proper syntax highlighting in Nova that matches the behavior in VS Code.

## Color Notes

The colors (blue for keywords, yellow in VS Code) are determined by the Monaco Editor theme, not by the tokenizer. The tokenizer assigns semantic tokens (like `keyword`), and the theme maps those to colors. Nova uses Monaco's default dark theme, which renders keywords in blue.

