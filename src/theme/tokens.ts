/**
 * ScopsK Admin design tokens.
 * Mirrors scopsk-app/src/theme/colors.ts and typography.
 * CSS variables in styles.css are what the UI renders.
 */
export const respyTokens = {
  light: {
    brand: "#ff5722",
    brandForeground: "#ffffff",
    sage: "#696861",
    clay: "#ff9675",
    cream: "#fff2ed",
    forest: "#0a0a0a",
    background: "#fff6f3",
    foreground: "#0a0a0a",
    card: "#ffffff",
    secondary: "#f7f7f5",
    muted: "#f7f7f5",
    mutedForeground: "#696861",
    accent: "#fff3ee",
    border: "#e9e8e3",
    input: "#d2d0c8",
    ring: "#ff5722",
    destructive: "#dc2626",
    warning: "#b45309",
    success: "#16a34a",
  },
  dark: {
    brand: "#ff7043",
    brandForeground: "#ffffff",
    sage: "#aaa8a0",
    clay: "#ff9675",
    cream: "#fff2ed",
    forest: "#f7f7f5",
    background: "#0a0a0a",
    foreground: "#f7f7f5",
    card: "#232322",
    secondary: "#232322",
    muted: "#232322",
    mutedForeground: "#aaa8a0",
    accent: "#383835",
    border: "rgba(255,255,255,0.10)",
    input: "rgba(255,255,255,0.12)",
    ring: "#ff5722",
    destructive: "#dc2626",
    warning: "#fef3c7",
    success: "#22c55e",
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  typography: {
    display: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  shadow: {
    soft: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
    elevated: "0 6px 16px -8px rgb(10 10 10 / 0.12)",
    brand: "0 8px 20px -8px rgb(255 87 34 / 0.32)",
  },
} as const;

export type RespyTokens = typeof respyTokens;

/** @deprecated Use respyTokens */
export const nexoraTokens = respyTokens;
/** @deprecated Use RespyTokens */
export type NexoraTokens = RespyTokens;
