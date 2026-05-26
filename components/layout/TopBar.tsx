import { appBranding } from "@/lib/branding";
import { formatHebrewDate } from "@/lib/format";

export function TopBar() {
  return (
    <header className="top-bar">
      <p className="top-bar__title">{appBranding.dashboardTitle}</p>
      <span className="top-bar__meta">{formatHebrewDate()}</span>
    </header>
  );
}
