# Sprint 5 Plan

**target version** : 0.5.0

## Task 1

Update the ide to handle our lyric syntax extension

- syntax extension is located in ../lyric-lang-syntax/vscode/lyric-lang

- Create new module src/core/extension-loader.ts.

- read extension manifest from ~/.nova/extensions/lyric-lang/package.json.

- Load syntaxes/lyric.tmLanguage.json (or .plist) using monaco-textmate.

- Register grammar in monaco.editor and set model language to lyric.

- Log successful load in the console:

- [Nova] Lyric syntax loaded successfully.

- Write unit tests confirming:

    - Grammar load success.

    - Non-language sections are ignored.

    - Editor fallback behavior (still usable if grammar missing).


## Task 2

Allow generalized syntax support extraction from extensions

- Update loader to scan all folders under ~/.nova/extensions/*.

- For each folder:

-  Read package.json.

- If activationEvents only include onLanguage:*, allow load.

- Discard other parts of the extension other than syntax support

- Skip others, log as ignored.

- Dynamically register grammar and language metadata in Monaco.

- [Nova] Loaded N syntax extensions, M discarded.

- Extend unit tests to verify multiple extensions, bad manifest handling, and caching.

