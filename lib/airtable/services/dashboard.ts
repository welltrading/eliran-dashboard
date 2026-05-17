import "server-only";
import type { DashboardStat } from "@/lib/types";
import { getInventoryByLocation } from "./inventory";
import { getInventoryMovements } from "./inventory-movements";
import { getOrders } from "./orders";
import { getTasks } from "./tasks";

function isToday(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export async function getDashboardSummary(): Promise<DashboardStat[]> {
  const [orders, tasks, inventory, movements] = await Promise.all([
    getOrders(),
    getTasks(),
    getInventoryByLocation(),
    getInventoryMovements(),
  ]);

  const openOrders = orders.filter(
    (order) => order.status !== "הושלמה" && order.status !== "בוטלה",
  );
  const todayTasks = tasks.filter((task) => isToday(task.scheduledDate));
  const lowStockItems = inventory.filter(
    (item) => item.status === "low" || item.status === "out" || item.status === "negative",
  );

  return [
    {
      label: "הזמנות פתוחות",
      value: String(openOrders.length),
      note: "מ-Airtable, קריאה בלבד",
      tone: "success",
    },
    {
      label: "התקנות להיום",
      value: String(todayTasks.length),
      note: "משימות עם תאריך מתוכנן להיום",
      tone: "success",
    },
    {
      label: "פריטים במלאי נמוך",
      value: String(lowStockItems.length),
      note: "כולל סטטוס נמוך או אזל",
      tone: lowStockItems.length > 0 ? "warning" : "success",
    },
    {
      label: "תנועות מלאי אחרונות",
      value: String(movements.length),
      note: "סה\"כ רשומות שנקראו",
      tone: "success",
    },
  ];
}
