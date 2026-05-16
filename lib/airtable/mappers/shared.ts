import "server-only";
import type { OrderStatus, QuoteType, StockStatus, TaskStatus } from "@/lib/types";

const orderStatuses: OrderStatus[] = [
  "חדשה",
  "בהכנה",
  "ממתינה לתשלום",
  "מוכנה להתקנה",
  "הושלמה",
  "בוטלה",
];

const taskStatuses: TaskStatus[] = [
  "חדשה",
  "מתואמת",
  "בביצוע",
  "הושלמה",
  "בוטלה",
];

const stockStatuses: StockStatus[] = ["תקין", "נמוך", "אזל"];
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
  return taskStatuses.includes(value as TaskStatus) ? (value as TaskStatus) : "חדשה";
}

export function stockStatus(value: unknown): StockStatus {
  return stockStatuses.includes(value as StockStatus) ? (value as StockStatus) : "תקין";
}

export function quoteType(value: unknown): QuoteType {
  return quoteTypes.includes(value as QuoteType) ? (value as QuoteType) : "סטנדרטי";
}
