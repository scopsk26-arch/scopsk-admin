/**
 * ResPy Admin design tokens
 * Source of truth: res-py-mobile-app/src/theme/{colors,typography,layout,shadows}.ts
 * CSS variables in styles.css mirror these values for Tailwind.
 */
export const respyTokens = {
  light: {
    brand: "#FF7A00",
    brandForeground: "#ffffff",
    sage: "#87a878",
    clay: "#e8a87c",
    cream: "#f5f0e8",
    forest: "#2F5D3A",
    background: "#f9f5ef",
    foreground: "#3d3229",
    card: "#ffffff",
    secondary: "#ebe4d8",
    muted: "#ebe4d8",
    mutedForeground: "#7a6f63",
    accent: "#e8dfd0",
    border: "#ddd4c5",
    input: "#ddd4c5",
    ring: "#FF7A00",
    destructive: "#c44a3a",
    warning: "#d4a84b",
    success: "#87a878",
  },
  dark: {
    brand: "#FF8C2A",
    brandForeground: "#ffffff",
    sage: "#87a878",
    clay: "#e8a87c",
    cream: "#f5f0e8",
    forest: "#6b8f5e",
    background: "#1a1614",
    foreground: "#f9f5ef",
    card: "#2a2420",
    secondary: "#3a322c",
    muted: "#3a322c",
    mutedForeground: "#a89e92",
    accent: "#453c34",
    border: "rgba(255,255,255,0.10)",
    input: "rgba(255,255,255,0.12)",
    ring: "#FF8C2A",
    destructive: "#e06b5c",
    warning: "#d4a84b",
    success: "#87a878",
  },
  radius: {
    sm: "0.5rem",
    md: "0.625rem",
    lg: "0.75rem",
    xl: "1rem",
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  typography: {
    display: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    body: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  shadow: {
    soft: "0 1px 2px 0 rgb(61 50 41 / 0.06)",
    elevated: "0 8px 20px -10px rgb(61 50 41 / 0.12)",
    brand: "0 8px 20px -8px rgb(255 122 0 / 0.35)",
  },
} as const;

export type RespyTokens = typeof respyTokens;

/** @deprecated Use respyTokens */
export const nexoraTokens = respyTokens;
/** @deprecated Use RespyTokens */
export type NexoraTokens = RespyTokens;
