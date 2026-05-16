import type { DashboardStat } from "./types";

export const dashboardStats: DashboardStat[] = [
  {
    label: "הזמנות פתוחות",
    value: "18",
    note: "כולל הזמנות בהכנה וממתינות לתשלום",
    tone: "success",
  },
  {
    label: "התקנות להיום",
    value: "6",
    note: "4 מתואמות, 2 בביצוע",
    tone: "success",
  },
  {
    label: "פריטים במלאי נמוך",
    value: "9",
    note: "דורש בדיקת רכש ומיקום",
    tone: "warning",
  },
  {
    label: "תנועות מלאי אחרונות",
    value: "27",
    note: "ב-7 הימים האחרונים",
    tone: "success",
  },
];
