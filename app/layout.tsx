import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Heebo } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { appBranding } from "@/lib/branding";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const brandStyle = appBranding.cssVariables as CSSProperties;

export const metadata: Metadata = {
  title: appBranding.metadata.title,
  description: appBranding.metadata.description,
  icons: {
    icon: appBranding.images.favicon,
  },
  openGraph: {
    title: appBranding.metadata.title,
    description: appBranding.metadata.description,
    images: [appBranding.images.ogImage],
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={heebo.className} style={brandStyle}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
