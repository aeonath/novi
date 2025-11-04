/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Nova Theme System
 * Provides a structured theme framework with color schemes, typography, and spacing
 */

export interface ThemeColors {
  // Background colors
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
  };
  // Foreground/text colors
  foreground: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
  };
  // Accent colors
  accent: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  // Border colors
  border: {
    default: string;
    subtle: string;
    focus: string;
  };
  // Syntax highlighting (for future editor)
  syntax: {
    keyword: string;
    string: string;
    number: string;
    comment: string;
    function: string;
    variable: string;
  };
}

export interface ThemeTypography {
  fontFamily: {
    base: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fontWeight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  shadows: ThemeShadows;
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

/**
 * Dark Theme (Default)
 */
export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  colors: {
    background: {
      primary: '#1e1e1e',
      secondary: '#252526',
      tertiary: '#2d2d30',
      elevated: '#333333',
    },
    foreground: {
      primary: '#ffffff',
      secondary: '#cccccc',
      tertiary: '#999999',
      disabled: '#666666',
    },
    accent: {
      primary: '#007acc',
      secondary: '#00d4ff',
      success: '#4ec9b0',
      warning: '#f5a623',
      error: '#f14c4c',
      info: '#3794ff',
    },
    border: {
      default: '#3e3e42',
      subtle: '#2d2d30',
      focus: '#007acc',
    },
    syntax: {
      keyword: '#569cd6',
      string: '#ce9178',
      number: '#b5cea8',
      comment: '#6a9955',
      function: '#dcdcaa',
      variable: '#9cdcfe',
    },
  },
  typography: {
    fontFamily: {
      base: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      mono: "'Consolas', 'Courier New', monospace",
    },
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      xxl: '24px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  },
  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '8px',
    full: '9999px',
  },
};

/**
 * Light Theme
 */
export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#e8e8e8',
      elevated: '#f0f0f0',
    },
    foreground: {
      primary: '#1e1e1e',
      secondary: '#333333',
      tertiary: '#666666',
      disabled: '#999999',
    },
    accent: {
      primary: '#0066cc',
      secondary: '#0088ff',
      success: '#2d9574',
      warning: '#d68a00',
      error: '#d83b01',
      info: '#0078d4',
    },
    border: {
      default: '#cccccc',
      subtle: '#e0e0e0',
      focus: '#0066cc',
    },
    syntax: {
      keyword: '#0000ff',
      string: '#a31515',
      number: '#098658',
      comment: '#008000',
      function: '#795e26',
      variable: '#001080',
    },
  },
  typography: {
    fontFamily: {
      base: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      mono: "'Consolas', 'Courier New', monospace",
    },
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      xxl: '24px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.15)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.25)',
  },
  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '8px',
    full: '9999px',
  },
};

/**
 * Available themes registry
 */
export const themes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
};

/**
 * Theme Manager
 * Handles theme application to the DOM via CSS custom properties
 */
export class ThemeManager {
  private currentTheme: Theme;
  private styleElement: HTMLStyleElement | null = null;

  constructor(initialTheme: Theme = darkTheme) {
    this.currentTheme = initialTheme;
    this.createStyleElement();
  }

  private createStyleElement(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'nova-theme';
    document.head.appendChild(this.styleElement);
  }

  /**
   * Apply a theme to the DOM
   */
  public applyTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.updateCSSVariables();
    
    // Store theme preference
    if (window.api) {
      void window.api.setSetting('theme', theme.id);
    }
  }

  /**
   * Apply theme by ID
   */
  public applyThemeById(themeId: string): void {
    const theme = themes[themeId];
    if (theme) {
      this.applyTheme(theme);
    } else {
      console.warn(`Theme "${themeId}" not found, falling back to dark theme`);
      this.applyTheme(darkTheme);
    }
  }

  /**
   * Get the currently active theme
   */
  public getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Load theme from storage
   */
  public async loadThemeFromStorage(): Promise<void> {
    if (!window.api) {
      return;
    }

    try {
      const themeId = await window.api.getSetting<string>('theme', 'dark');
      if (themeId) {
        this.applyThemeById(themeId);
      }
    } catch (error) {
      console.error('Failed to load theme from storage:', error);
    }
  }

  /**
   * Update CSS custom properties based on current theme
   */
  private updateCSSVariables(): void {
    if (!this.styleElement) {
      return;
    }

    const { colors, typography, spacing, shadows, borderRadius } = this.currentTheme;

    const cssVariables = `
      :root {
        /* Background Colors */
        --bg-primary: ${colors.background.primary};
        --bg-secondary: ${colors.background.secondary};
        --bg-tertiary: ${colors.background.tertiary};
        --bg-elevated: ${colors.background.elevated};
        
        /* Foreground Colors */
        --fg-primary: ${colors.foreground.primary};
        --fg-secondary: ${colors.foreground.secondary};
        --fg-tertiary: ${colors.foreground.tertiary};
        --fg-disabled: ${colors.foreground.disabled};
        
        /* Accent Colors */
        --accent-primary: ${colors.accent.primary};
        --accent-secondary: ${colors.accent.secondary};
        --accent-success: ${colors.accent.success};
        --accent-warning: ${colors.accent.warning};
        --accent-error: ${colors.accent.error};
        --accent-info: ${colors.accent.info};
        
        /* Border Colors */
        --border-default: ${colors.border.default};
        --border-subtle: ${colors.border.subtle};
        --border-focus: ${colors.border.focus};
        
        /* Syntax Colors */
        --syntax-keyword: ${colors.syntax.keyword};
        --syntax-string: ${colors.syntax.string};
        --syntax-number: ${colors.syntax.number};
        --syntax-comment: ${colors.syntax.comment};
        --syntax-function: ${colors.syntax.function};
        --syntax-variable: ${colors.syntax.variable};
        
        /* Typography */
        --font-base: ${typography.fontFamily.base};
        --font-mono: ${typography.fontFamily.mono};
        --font-size-xs: ${typography.fontSize.xs};
        --font-size-sm: ${typography.fontSize.sm};
        --font-size-base: ${typography.fontSize.base};
        --font-size-lg: ${typography.fontSize.lg};
        --font-size-xl: ${typography.fontSize.xl};
        --font-size-xxl: ${typography.fontSize.xxl};
        --font-weight-normal: ${typography.fontWeight.normal};
        --font-weight-medium: ${typography.fontWeight.medium};
        --font-weight-semibold: ${typography.fontWeight.semibold};
        --font-weight-bold: ${typography.fontWeight.bold};
        --line-height-tight: ${typography.lineHeight.tight};
        --line-height-normal: ${typography.lineHeight.normal};
        --line-height-relaxed: ${typography.lineHeight.relaxed};
        
        /* Spacing */
        --space-xs: ${spacing.xs};
        --space-sm: ${spacing.sm};
        --space-md: ${spacing.md};
        --space-lg: ${spacing.lg};
        --space-xl: ${spacing.xl};
        --space-xxl: ${spacing.xxl};
        
        /* Shadows */
        --shadow-sm: ${shadows.sm};
        --shadow-md: ${shadows.md};
        --shadow-lg: ${shadows.lg};
        --shadow-xl: ${shadows.xl};
        
        /* Border Radius */
        --radius-sm: ${borderRadius.sm};
        --radius-md: ${borderRadius.md};
        --radius-lg: ${borderRadius.lg};
        --radius-full: ${borderRadius.full};
      }
      
      /* Apply base styles to body */
      body {
        background-color: var(--bg-primary);
        color: var(--fg-primary);
        font-family: var(--font-base);
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
      }
    `;

    this.styleElement.textContent = cssVariables;
  }
}

/**
 * Global theme manager instance
 */
export let themeManager: ThemeManager | null = null;

/**
 * Initialize the global theme manager
 */
export function initializeThemeManager(): ThemeManager {
  if (!themeManager) {
    themeManager = new ThemeManager();
  }
  return themeManager;
}

/**
 * Get the global theme manager instance
 */
export function getThemeManager(): ThemeManager | null {
  return themeManager;
}

