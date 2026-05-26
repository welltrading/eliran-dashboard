import brandingJson from "./branding.json";

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
  raw: brandingJson,
} as const;
