"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  FileText,
  Gauge,
  Hammer,
  ListOrdered,
  PackageOpen,
  Users,
  Warehouse,
} from "lucide-react";

const navItems = [
  { href: "/", label: "דשבורד", icon: Gauge },
  { href: "/orders", label: "הזמנות", icon: ClipboardList },
  { href: "/quotes", label: "הצעות מחיר", icon: FileText },
  { href: "/order-lines", label: "שורות הזמנה", icon: ListOrdered },
  { href: "/inventory", label: "מלאי לפי מיקום", icon: Warehouse },
  { href: "/inventory/movements", label: "תנועות מלאי", icon: Boxes },
  { href: "/tasks", label: "משימות", icon: Hammer },
  { href: "/installers", label: "מתקינים", icon: PackageOpen },
  { href: "/customers", label: "לקוחות", icon: Users },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href;
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__mark">א</div>
        <div>
          <p className="sidebar__title">אלירן מקלחונים</p>
          <p className="sidebar__subtitle">ניהול הזמנות, מלאי והתקנות</p>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="ניווט ראשי">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar__link${active ? " sidebar__link--active" : ""}`}
            >
              <Icon className="sidebar__icon" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
