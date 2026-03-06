/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Shim that re-exports from the globally AMD-loaded Monaco instance.
 * Prevents monaco-vim from bundling a second copy of Monaco's editor API
 * which would create dual-instance state conflicts (broken themes,
 * tokenization, language registration).
 *
 * esbuild alias maps 'monaco-editor/esm/vs/editor/editor.api' to this file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const m = (window as any).monaco;

export const KeyCode = m.KeyCode;
export const Range = m.Range;
export const Position = m.Position;
export const Selection = m.Selection;
export const SelectionDirection = m.SelectionDirection;
export const editor = m.editor;
