/** Canonical ScopsK wordmark hosted on DigitalOcean Spaces (public CDN). */
export const BRAND_LOGOS = {
  onDark:
    "https://hazziassets.blr1.cdn.digitaloceanspaces.com/scopsk/brand/logo-on-dark.png",
  onLight:
    "https://hazziassets.blr1.cdn.digitaloceanspaces.com/scopsk/brand/logo-on-light.png",
} as const;

export type BrandLogoVariant = keyof typeof BRAND_LOGOS;
