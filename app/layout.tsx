import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "אלירן מקלחונים",
  description: "דשבורד תפעול להזמנות, מלאי והתקנות",
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
