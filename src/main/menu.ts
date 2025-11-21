/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * menu.ts - Menu command type definitions
 * Native menu removed - using custom CSS menu bar in renderer
 */

export type MenuCommand = 
  | 'new-file'
  | 'open-file'
  | 'save'
  | 'save-as'
  | 'close-file'
  | 'close-terminal'
  | 'exit'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'select-all'
  | 'find'
  | 'replace'
  | 'toggle-fullscreen'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset'
  | 'new-terminal'
  | 'nova-prompt'
  | 'nova-agile'
  | 'command-palette'
  | 'debug'
  | 'reset-workspace'
  | 'toggle-devtools'
  | 'about'
  | 'documentation'
  | 'report-issue'
  | 'check-updates';
