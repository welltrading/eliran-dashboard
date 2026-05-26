import brandingJson from "./branding.json";

const colors = brandingJson.colors;

export const appBranding = {
  appName: "אלירן מקלחונים",
  businessName: brandingJson.images.logoAlt,
  audience: "מורן ואלירן",
  purpose: "ניהול הזמנות, מלאי והתקנות",
  dashboardTitle: "דשבורד תפעול",
  brandInitial: "א",
  metadata: {
    title: "אלירן מקלחונים",
    description: "דשבורד תפעול להזמנות, מלאי והתקנות",
  },
  images: brandingJson.images,
  colors,
  cssVariables: {
    "--brand-primary": colors.primary,
    "--brand-primary-hover": colors.primaryHover,
    "--brand-accent": colors.accent,
    "--brand-background": colors.background,
    "--brand-surface": colors.surface,
    "--brand-surface-muted": colors.surfaceMuted,
    "--brand-text-primary": colors.textPrimary,
    "--brand-text-muted": colors.textMuted,
    "--brand-border": colors.border,
    "--brand-link": colors.link,
  },
  raw: brandingJson,
} as const;
