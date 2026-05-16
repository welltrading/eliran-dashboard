import "server-only";
import type { InventoryItem, StockStatus } from "@/lib/types";
import type { RawInventoryFields } from "../raw-types";
import { numberValue } from "./shared";

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

function stockStatusForQuantity(quantity: number): StockStatus {
  if (quantity <= 0) {
    return "אזל";
  }

  if (quantity <= 2) {
    return "נמוך";
  }

  return "תקין";
}

export function mapInventoryItem(record: RawRecord): InventoryItem {
  const availableQuantity = numberValue(record.fields.fldr4VIQAnulf5eIv);
  const productName =
    nullableTextValue(record.fields.fldYboj1U8ZHJK6aq) ||
    nullableTextValue(record.fields.fldIg7KsaGnNm9Tvz) ||
    nullableTextValue(record.fields.fldHUiTkn1TFdW9n4) ||
    "";

  return {
    id: record.id,
    productName,
    location: textValue(record.fields.fldmKrx7PBJjv0zUH),
    availableQuantity,
    status: stockStatusForQuantity(availableQuantity),
    productLocationKey: nullableTextValue(record.fields.fldFr3TUKbKCkvoW5),
    updatedAt: nullableTextValue(record.fields.fldMOqeUQ4Lx1J5ct),
  };
}
