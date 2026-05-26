import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { appBranding } from "@/lib/branding";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  display: "swap",
});

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
      <body className={assistant.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
