/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * TextMate → Monaco Monarch Converter
 *
 * Pure functions (no Node.js dependencies) that convert TextMate grammar JSON
 * into Monaco Monarch language definitions. Safe to use in both main and renderer.
 */

/**
 * Extract word lists from TextMate grammar repository patterns.
 * Looks for \\b(word1|word2|...)\\b patterns and collects the words.
 */
function extractWords(repository: any, ...keys: string[]): string[] {
  const words: string[] = [];
  for (const key of keys) {
    const section = repository?.[key];
    if (!section?.patterns) continue;
    for (const pattern of section.patterns) {
      const src = pattern.match || pattern.begin || '';
      const m = src.match(/\\b\(([^)]+)\)\\b/);
      if (m?.[1]) words.push(...m[1].split('|'));
    }
  }
  return words;
}

/**
 * Map a TextMate scope name to a Monaco Monarch token type
 */
function tmScopeToMonarchToken(scope: string): string {
  if (scope.startsWith('comment')) return 'comment';
  if (scope.startsWith('string')) return 'string';
  if (scope.startsWith('constant.numeric')) return 'number';
  if (scope.startsWith('constant.character.escape')) return 'string.escape';
  if (scope.startsWith('constant.language')) return 'constant';
  if (scope.startsWith('constant')) return 'constant';
  if (scope.startsWith('keyword.operator')) return 'operator';
  if (scope.startsWith('keyword')) return 'keyword';
  if (scope.startsWith('storage.modifier')) return 'keyword';
  if (scope.startsWith('storage.type')) return 'keyword';
  if (scope.startsWith('storage')) return 'keyword';
  if (scope.startsWith('support.function')) return 'keyword';
  if (scope.startsWith('punctuation')) return 'delimiter';
  if (scope.startsWith('variable')) return 'variable';
  if (scope.startsWith('entity.name.function')) return 'identifier';
  if (scope.startsWith('entity.name.type')) return 'type';
  return 'identifier';
}

/**
 * Convert a TextMate grammar JSON into a Monaco Monarch language definition.
 * Handles the common patterns: keywords, types, builtins, constants, modifiers,
 * operators, comments, strings, numbers, and punctuation.
 */
export function convertTmToMonarch(tmGrammar: any): any {
  const repo = tmGrammar.repository || {};

  // Collect keyword-like words from well-known repository sections
  const keywords = extractWords(repo, 'keywords', 'types', 'modifiers', 'constants', 'builtins', 'based_on');
  // Collect standalone operator patterns
  const operatorChars: string[] = [];
  if (repo.operators?.patterns) {
    for (const p of repo.operators.patterns) {
      if (p.match) operatorChars.push(p.match);
    }
  }

  // Build root tokenizer rules from the grammar's top-level pattern includes
  const rootRules: any[] = [];

  // Special match patterns (non-word patterns like +++ that must come first)
  for (const key of Object.keys(repo)) {
    const section = repo[key];
    if (!section?.patterns) continue;
    for (const p of section.patterns) {
      if (p.match && p.name && !p.match.includes('\\b(') && !p.match.match(/^\[.*\]$/) && key !== 'comments' && key !== 'strings' && key !== 'numbers' && key !== 'operators' && key !== 'punctuation') {
        // Non-word, non-standard pattern — add as literal regex rule
        try {
          new RegExp(p.match); // Validate
          rootRules.push([new RegExp(p.match), tmScopeToMonarchToken(p.name)]);
        } catch { /* skip invalid regex */ }
      }
    }
  }

  // Comments
  if (repo.comments?.patterns) {
    for (const p of repo.comments.patterns) {
      if (p.match) {
        try {
          rootRules.push([new RegExp(p.match), 'comment']);
        } catch { /* skip */ }
      }
    }
  }

  // Strings — handle begin/end pairs
  if (repo.strings?.patterns) {
    for (const p of repo.strings.patterns) {
      if (p.begin === '"') {
        rootRules.push([/"([^"\\]|\\.)*$/, 'string.invalid']);
        rootRules.push([/"/, 'string', '@doubleQuoteString']);
      } else if (p.begin === "'") {
        rootRules.push([/'([^'\\]|\\.)*$/, 'string.invalid']);
        rootRules.push([/'/, 'string', '@singleQuoteString']);
      }
    }
  }

  // Keywords — use @keywords reference for identifier matching
  if (keywords.length > 0) {
    rootRules.push([/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }]);
  } else {
    rootRules.push([/[a-zA-Z_]\w*/, 'identifier']);
  }

  // Numbers
  rootRules.push([/\d+\.\d+/, 'number.float']);
  rootRules.push([/\d+/, 'number']);

  // Operators
  if (operatorChars.length > 0) {
    // Combine operator patterns: longest first
    const sorted = operatorChars.slice().sort((a, b) => b.length - a.length);
    for (const op of sorted) {
      try {
        rootRules.push([new RegExp(op), 'operator']);
      } catch { /* skip invalid */ }
    }
  } else {
    rootRules.push([/[=><&|!+\-*/%^~]/, 'operator']);
  }

  // Punctuation
  if (repo.punctuation?.patterns) {
    for (const p of repo.punctuation.patterns) {
      if (p.match) {
        try {
          rootRules.push([new RegExp(p.match), 'delimiter']);
        } catch { /* skip */ }
      }
    }
  }

  const tokenizer: any = { root: rootRules };

  // String states
  if (repo.strings?.patterns?.some((p: any) => p.begin === '"')) {
    tokenizer.doubleQuoteString = [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ];
  }
  if (repo.strings?.patterns?.some((p: any) => p.begin === "'")) {
    tokenizer.singleQuoteString = [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ];
  }

  return {
    defaultToken: '',
    keywords: Array.from(new Set(keywords)),
    tokenizer,
  };
}
