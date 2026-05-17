import "server-only";
import type { OrderStatus, QuoteType, TaskStatus } from "@/lib/types";

const orderStatuses: OrderStatus[] = [
  "חדשה",
  "בהכנה",
  "ממתינה לתשלום",
  "מוכנה להתקנה",
  "הושלמה",
  "בוטלה",
];

const taskStatuses: TaskStatus[] = [
  "פתוח",
  "בטיפול",
  "הושלם",
  "לביצוע",
  "בוצע",
  "בוטל",
];

const quoteTypes: QuoteType[] = ["סטנדרטי", "ייצור אישי"];

export function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function nullableText(value: unknown) {
  const normalized = text(value).trim();
  return normalized ? normalized : null;
}

export function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function linkedRecordIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function orderStatus(value: unknown): OrderStatus {
  return orderStatuses.includes(value as OrderStatus) ? (value as OrderStatus) : "חדשה";
}

export function taskStatus(value: unknown): TaskStatus {
  return taskStatuses.includes(value as TaskStatus) ? (value as TaskStatus) : "פתוח";
}

export function quoteType(value: unknown): QuoteType {
  return quoteTypes.includes(value as QuoteType) ? (value as QuoteType) : "סטנדרטי";
}
