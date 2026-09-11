import 'styled-components';

/**
 * THE customization entry point for anyone reusing this project.
 * Change colors, fonts, radii and breakpoints here — every component
 * consumes the theme, so the whole site updates at once.
 */
export const theme = {
  colors: {
    /** Page background (pearl white, paper textured in GlobalStyle). */
    background: '#fdfcf6',
    /** Cards and surfaces. */
    surface: '#ffffff',
    /** Main text. */
    text: '#4b4034',
    /** Secondary text. */
    muted: '#8b7f70',
    /** Buttons, radio choices, focus rings (moss green). */
    primary: '#58734a',
    /** Leaf green — accent headings, labels and highlights. */
    accent: '#5f8a4f',
    /** Sage green — secondary text and controls. */
    sage: '#879a7b',
    /** Gold — divider flourishes. */
    gold: '#c9a86a',
    /** Hairline borders. */
    border: '#e8e0d3',
  },
  fonts: {
    /** Headings — same family as body for a clean, minimal look. */
    display: "'Jost', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    body: "'Jost', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    handwriting: "'Shadows Into Light', 'Comic Sans MS', cursive",
  },
  radii: {
    sm: '8px',
    md: '14px',
    lg: '22px',
    pill: '999px',
  },
  shadows: {
    soft: '0 10px 30px rgba(74, 63, 53, 0.08)',
  },
  breakpoints: {
    tablet: '768px',
    desktop: '1024px',
  },
} as const;

export type AppTheme = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
