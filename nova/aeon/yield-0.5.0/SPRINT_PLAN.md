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