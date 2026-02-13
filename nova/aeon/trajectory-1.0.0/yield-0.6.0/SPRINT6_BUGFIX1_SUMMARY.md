# Sprint 6 - Bug Fix #1: Monaco Syntax Highlighting with Vim Mode

**Agent**: Claude (Sonnet 4.5)  
**Date**: February 12, 2026  
**Status**: ✅ Resolved

---

## Issue Summary

Syntax highlighting was not working for any file types except Lyric (`*.ly`) when the `monaco-vim` plugin was enabled (`set vimode on` in Novi Shell). When vim mode was disabled and the editor restarted, syntax highlighting worked correctly for all file types.

### Affected File Types
- Python (`.py`)
- Shell Scripts (`.sh`, `.bash`)
- Markdown (`.md`)
- All other Monaco built-in languages

### Working File Type
- Lyric (`.ly`) - custom grammar loaded via IPC

---

## Root Cause Analysis

The issue was **not** caused by the `monaco-vim` plugin itself, but rather the plugin **exposed a race condition** in Monaco's language tokenizer loading mechanism:

### The Race Condition

1. **Monaco's Tokenizer Loading**: Built-in languages (Python, Shell, Markdown) use asynchronous AMD module loading for their Monarch grammar definitions
2. **Model Creation Timing**: When a file is opened, Monaco creates an editor model immediately
3. **Tokenization Prerequisite**: Monaco only tokenizes models if their language's tokenizer is already loaded
4. **The Gap**: If a model is created before its tokenizer finishes loading asynchronously, it will never be tokenized automatically

### Why Vim Mode Exposed This

The `monaco-vim` plugin initialization happens early in the editor lifecycle, which changed the timing of various Monaco operations just enough to consistently trigger the race condition. Without vim mode, the timing was different and tokenizers often loaded before models were created.

### Why Lyric Always Worked

Lyric's grammar was loaded synchronously via IPC and explicitly registered with `monaco.languages.setMonarchTokensProvider()` during startup, so its tokenizer was always available before any Lyric models were created.

---

## Solution Implemented

### File Modified
- `c:\Work\novi\src\renderer\components\MonacoEditor.tsx`

### Changes Made

#### 1. Explicit Language Registration & Tokenizer Loading
```typescript
const builtInLangModules: { 
  languageId: string; 
  moduleId: string; 
  extensions: string[];
  aliases: string[];
}[] = [
  { 
    languageId: 'python', 
    moduleId: 'vs/python-B-Y2SC3b',
    extensions: ['.py', '.rpy', '.pyw', '.cpy', '.gyp', '.gypi'],
    aliases: ['Python', 'py']
  },
  { 
    languageId: 'shell', 
    moduleId: 'vs/shell-ClXCKCEW',
    extensions: ['.sh', '.bash', '.zsh'],
    aliases: ['Shell Script', 'sh', 'bash', 'zsh']
  },
  { 
    languageId: 'markdown', 
    moduleId: 'vs/markdown-C_rD0bIw',
    extensions: ['.md', '.markdown', '.mdown', '.mkdn', '.mkd', '.mdwn', '.mdtxt', '.mdtext'],
    aliases: ['Markdown', 'markdown']
  },
];
```

#### 2. Proper Registration Sequence
The fix ensures proper initialization order:
1. Load the AMD grammar chunk
2. Check if language is already registered by Monaco
3. Register if needed
4. Set the Monarch tokenizer provider
5. Set language configuration (brackets, comments, etc.)
6. **Force retokenization of existing models**

#### 3. Force Retokenization
The critical fix that resolves the race condition:
```typescript
// Force retokenization of any existing models with this language
const allModels = monaco.editor.getModels();
allModels.forEach((model) => {
  if (model.getLanguageId() === languageId) {
    console.log(`[MonacoEditor] Retokenizing existing ${languageId} model:`, model.uri.toString());
    // Force Monaco to retokenize by temporarily switching language and switching back
    monaco.editor.setModelLanguage(model, 'plaintext');
    monaco.editor.setModelLanguage(model, languageId);
  }
});
```

This ensures that even if a model was created before the tokenizer loaded, it will be retokenized once the tokenizer becomes available.

#### 4. Model Refresh on Vim Toggle
Additional safeguard when vim mode is toggled off:
```typescript
// Force a model refresh after vim disposal to trigger retokenization
const currentModel = editorRef.current.getModel();
if (currentModel) {
  console.log('[MonacoEditor] Refreshing model after vim dispose:', currentModel.getLanguageId());
  editorRef.current.setModel(null);
  editorRef.current.setModel(currentModel);
}
```

---

## Technical Details

### Monaco's Language Loading Architecture

Monaco Editor uses two different mechanisms for language support:

1. **Advanced Languages** (TypeScript, JavaScript, JSON, HTML, CSS)
   - Use Web Workers for tokenization
   - Loaded via `MonacoEnvironment.getWorkerUrl`
   - Already properly configured in earlier fixes

2. **Basic Languages** (Python, Shell, Markdown, etc.)
   - Use Monarch grammar (synchronous tokenization)
   - Grammar definitions loaded via AMD `require()` calls
   - This was the source of the race condition

### The AMD Loading Issue

Monaco's `editor.main.js` registers basic languages but uses `registerTokensProviderFactory` with an async factory that loads chunks on-demand:

```javascript
// Monaco's internal code (simplified)
monaco.languages.registerTokensProviderFactory('python', {
  create: async () => {
    const mod = await import('vs/python-B-Y2SC3b');
    return createTokenizationSupport(mod.language);
  }
});
```

The problem: If a Python file is opened before this factory completes, the model is created with no tokenizer, and Monaco doesn't retry.

### Our Solution

We preemptively load these grammar chunks at editor initialization and force retokenization for any models that might have been created too early:

```javascript
// Our explicit approach
amdRequire(['vs/python-B-Y2SC3b'], (mod) => {
  monaco.languages.setMonarchTokensProvider('python', mod.language);
  // Force existing models to retokenize
  monaco.editor.getModels().forEach(model => {
    if (model.getLanguageId() === 'python') {
      monaco.editor.setModelLanguage(model, 'plaintext');
      monaco.editor.setModelLanguage(model, 'python');
    }
  });
});
```

---

## Verification

### Console Logs (Success)
```
[MonacoEditor] Language 'python' already registered by Monaco
[MonacoEditor] Set tokenizer for: python
[MonacoEditor] Set configuration for: python
[MonacoEditor] Retokenizing existing python model: file:///c:/Work/novi/file_bug.py
```

### Test Cases
✅ Open Python file with vim mode enabled → Syntax highlighting works  
✅ Open Shell script with vim mode enabled → Syntax highlighting works  
✅ Open Markdown file with vim mode enabled → Syntax highlighting works  
✅ Toggle vim mode off → Syntax highlighting continues working  
✅ Toggle vim mode on → Syntax highlighting continues working  
✅ Lyric files continue to work as before  

---

## Impact

### Fixed
- Syntax highlighting now works reliably for all file types regardless of vim mode state
- No race conditions in tokenizer loading
- Editor behavior is consistent across restarts

### No Breaking Changes
- All existing functionality preserved
- Lyric extension continues to work
- Vim mode features unaffected
- File save operations unchanged

---

## Lessons Learned

1. **Race conditions in async loading** can be subtle and timing-dependent
2. **Monaco's tokenization is lazy** - it won't retry if a tokenizer becomes available later
3. **Explicit is better than implicit** - loading grammar chunks explicitly at startup is more reliable than relying on Monaco's internal lazy loading
4. **Force retokenization** by toggling language (`plaintext` → original language) is an effective workaround for Monaco's caching

---

## Related Files

- `c:\Work\novi\src\renderer\components\MonacoEditor.tsx` - Main fix location
- `c:\Work\novi\src\renderer\monaco-loader.js` - AMD loader configuration (already fixed in previous work)
- `c:\Work\novi\node_modules\monaco-vim\` - Vim plugin (no changes needed)
- `c:\Work\novi\nova\aeon\trajectory-1.0.0\yield-0.6.0\MONACO_VIM_DEBUG.md` - Investigation notes

---

## Credits

**Investigation & Fix**: Claude (Sonnet 4.5)  
**Testing & Validation**: User (Aeonath4)  
**Initial Diagnosis**: User correctly identified `monaco-vim` plugin as trigger point
