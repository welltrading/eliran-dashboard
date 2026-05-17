import "server-only";
import type { InventoryItem, StockStatus } from "@/lib/types";
import type { RawInventoryFields } from "../raw-types";
import { linkedRecordIds, numberValue } from "./shared";

type RawRecord = {
  id: string;
  fields: RawInventoryFields;
};

function isAirtableRecordId(value: string) {
  return /^rec[A-Za-z0-9]{14}$/.test(value);
}

function textValue(value: unknown): string {
  if (typeof value === "string") {
    return isAirtableRecordId(value) ? "" : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (
    value &&
    typeof value === "object" &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return value.name;
  }

  if (
    value &&
    typeof value === "object" &&
    "label" in value &&
    typeof value.label === "string"
  ) {
    return value.label;
  }

  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(", ");
  }

  return "";
}

function nullableTextValue(value: unknown): string | null {
  const normalized = textValue(value).trim();
  return normalized ? normalized : null;
}

function cleanProductDisplayName(value: string) {
  return value
    .replace(/\s*\|\s*(מחסן|חנות)\s*\|\s*מלאי:\s*-?\d+\s*$/u, "")
    .replace(/\s*\|\s*\|\s*\|\s*\|\s*$/u, "")
    .trim();
}

function cleanSku(value: string | null) {
  return value?.replace(/\s*\|\s*\|\s*\|\s*\|\s*$/u, "").trim() || null;
}

export function getInventoryStatus(quantity: number): StockStatus {
  if (quantity < 0) {
    return "negative";
  }

  if (quantity === 0) {
    return "out";
  }

  if (quantity <= 3) {
    return "low";
  }

  return "ok";
}

export function mapInventoryItem(record: RawRecord): InventoryItem {
  const availableQuantity = numberValue(record.fields.fldr4VIQAnulf5eIv);
  const linkedProductIds = linkedRecordIds(record.fields.fldHUiTkn1TFdW9n4);
  const productName = cleanProductDisplayName(
    nullableTextValue(record.fields.fldexSWLxpnh3pP5k) ||
    nullableTextValue(record.fields.fldj2pdrmiHYKNwAI) ||
    nullableTextValue(record.fields.fldYboj1U8ZHJK6aq) ||
    "",
  );

  return {
    id: record.id,
    productName,
    productSku: cleanSku(nullableTextValue(record.fields.fldgrSdEuxPne8fUH)),
    productRecordId:
      nullableTextValue(record.fields.fld6KM7lmkfbmeGOe) || linkedProductIds[0] || null,
    location: textValue(record.fields.fldmKrx7PBJjv0zUH),
    availableQuantity,
    status: getInventoryStatus(availableQuantity),
    displayForMoran: nullableTextValue(record.fields.fldWBgO3Bg3qi65dg),
    productLocationKey: nullableTextValue(record.fields.fldYboj1U8ZHJK6aq),
    updatedAt: null,
  };
}
