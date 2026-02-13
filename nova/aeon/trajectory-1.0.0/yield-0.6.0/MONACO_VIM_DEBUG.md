# Monaco-Vim Syntax Highlighting Investigation

## Problem Statement
Syntax highlighting works for Lyric (custom language) but NOT for built-in Monaco languages (Python, Shell, Markdown, TypeScript) when monaco-vim plugin is enabled. When vim mode is disabled, all highlighting works.

## Investigation Findings

### 1. Monaco-Vim Plugin Does NOT Directly Break Tokenization

After thorough analysis of `node_modules/monaco-vim/src/cm_adapter.ts` and `index.ts`:

**What vim DOES:**
- Wraps Monaco editor in a CodeMirror-like adapter
- Intercepts keyboard events (`onKeyDown`)
- Intercepts cursor/content change events (`onDidChangeCursorPosition`, `onDidChangeModelContent`)
- Manages its own decorations for search highlighting
- Updates cursor appearance (width, style, blinking) via `updateOptions()`

**What vim DOES NOT do:**
- Does NOT call `monaco.editor.createModel()` or `editor.setModel()`
- Does NOT modify the model's language via `setModelLanguage()`
- Does NOT call `setMonarchTokensProvider()` or any tokenization APIs
- Does NOT set any editor options that would disable tokenization
- Does NOT override theme colors or token rendering

### 2. Root Cause: Race Condition in Language Loading

The actual problem is a **timing race condition** in `MonacoEditor.tsx`:

```typescript
// Lines 94-112: Built-in language loading (ASYNC)
amdRequire([moduleId], (mod) => {
  if (mod?.language) monaco.languages.setMonarchTokensProvider(languageId, mod.language);
});
```

**The Race:**
1. Editor created at mount
2. AMD require starts loading Python/Shell/Markdown chunks (async)
3. User opens a Python file
4. `EditorService.createModel(content, 'python', uri)` is called
5. Model created **before** Python tokenizer is loaded
6. AMD callback completes, calls `setMonarchTokensProvider('python', ...)`
7. **But the model is already created without tokenization!**

**Why Lyric works:**
- Lyric tokenizers are loaded via IPC `loadAllExtensions()` in a separate useEffect (lines 543-583)
- Lyric files are typically opened AFTER syntax extensions are fully loaded
- Tokenizer exists when model is created

**Why built-in languages fail:**
- AMD loading happens concurrently with file opening
- Models created before tokenizers loaded

### 3. Why Vim Appears to Cause This

Vim doesn't directly cause the issue, but it **exposes** the race condition:

**Theory:**
- When vim attaches, it may alter event loop timing or focus in a way that affects Monaco's background tokenization scheduler
- Monaco's tokenizer runs asynchronously in a requestIdleCallback or setTimeout
- Vim's event handlers and state management may prevent the scheduler from retokenizing models that were created before tokenizers loaded
- When vim is disposed, the model refresh (or lack of vim's interference) allows tokenization to proceed

**Evidence:**
- Disabling vim fixes highlighting → tokenizers ARE loaded, vim is preventing them from applying
- No direct vim code manipulates tokenization → timing/scheduler issue
- Lyric works → tokenizer loaded before model creation (proper order)

## Applied Fix

### Primary Fix: Force Retokenization After Load

Added code to retokenize any existing models when tokenizers load (MonacoEditor.tsx lines 103-127):

```typescript
// CRITICAL FIX: Force retokenization of any existing models with this language
const allModels = monaco.editor.getModels();
allModels.forEach((model) => {
  if (model.getLanguageId() === languageId) {
    console.log(`[MonacoEditor] Retokenizing existing ${languageId} model`);
    // Force Monaco to retokenize by temporarily switching language
    monaco.editor.setModelLanguage(model, 'plaintext');
    monaco.editor.setModelLanguage(model, languageId);
  }
});
```

**How it works:**
- When AMD callback completes and tokenizer is registered
- Find all existing models with that language
- Force retokenization by toggling language (plaintext → original)
- Monaco will reparse the entire model with the now-available tokenizer

### Secondary Fix: Model Refresh on Vim Toggle

Added model refresh when vim is disabled (MonacoEditor.tsx lines 338-348):

```typescript
// Force a model refresh to see if that fixes highlighting
editorRef.current.setModel(null);
editorRef.current.setModel(currentModel);
console.log('[MonacoEditor] Refreshed model after vim dispose');
```

This may trigger retokenization if the primary fix doesn't fully resolve the issue.

## Testing Instructions

### 1. Test the Primary Fix

**Steps:**
1. Start Novi with vim mode enabled (default)
2. Open a Python file immediately after startup
3. Check browser console for logs:
   ```
   [MonacoEditor] Retokenizing existing python model: file:///path/to/file.py
   ```
4. Verify Python syntax highlighting appears

**Expected Result:**
- Python/Shell/Markdown should now highlight correctly even with vim enabled
- No need to toggle vim mode

### 2. Debug Logging Analysis

With vim enabled, open the console and look for:

```
[MonacoEditor] Setting tokenizer for python at [timestamp]
[MonacoEditor] Found N existing python models
[MonacoEditor] Retokenizing existing python model: [uri]
```

**If you see "Found 0 existing models":**
- Good! Tokenizers loaded before file opened (race won)
- Highlighting should work

**If you see "Found 1+ existing models":**
- Race condition occurred, but fix should retokenize them
- Check if highlighting appears after retokenization

### 3. Vim-Specific Testing

Toggle vim mode with `:set vimode off` and check console:

```
[MonacoEditor] Disposing vim mode...
[MonacoEditor] After vim dispose - Model language: python
[MonacoEditor] After vim dispose - Has tokenizer: true
[MonacoEditor] Refreshed model after vim dispose
```

**Check:**
- Does `Has tokenizer` show `true`? (confirms tokenizer loaded)
- Does highlighting appear only after model refresh? (confirms vim blocks scheduler)

## Additional Investigations

If the fix doesn't fully resolve the issue, investigate:

### 1. Monaco Tokenization Scheduler
Check if vim's event handlers block `requestIdleCallback` or setTimeout:
```typescript
// Add to cm_adapter.ts handleKeyDown or handleChange
console.log('[Vim] Event handled, scheduler blocked?', performance.now());
```

### 2. Token Decorations
Check if Monaco's token decorations are being rendered:
```typescript
// In MonacoEditor.tsx after model created
const tokens = model.getLineTokens(1);
console.log('[Debug] Line 1 tokens:', tokens);
```

### 3. Theme Token Colors
Verify theme defines token colors for built-in languages:
```typescript
// Check Monaco's token color registry
const tokenColors = monaco.editor.getModel().getLanguageId();
console.log('[Debug] Token colors for', tokenColors);
```

## Summary

**Primary Cause:** Race condition where models created before tokenizers loaded

**Why Vim Matters:** Vim's presence affects Monaco's tokenization scheduler in a way that prevents late-loaded tokenizers from applying to existing models

**Fix Applied:** Force retokenization of existing models when tokenizers are loaded asynchronously

**Expected Outcome:** Syntax highlighting should now work for all languages regardless of vim mode state

## Next Steps

1. Test with vim enabled (should work now)
2. Check console logs to verify retokenization is happening
3. If still broken, share console logs for further analysis
4. Consider pre-loading all critical language tokenizers synchronously before editor creation (more robust solution)
