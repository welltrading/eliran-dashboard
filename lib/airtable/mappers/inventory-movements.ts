import "server-only";
import type { InventoryMovement } from "@/lib/types";
import type { RawInventoryMovementFields } from "../raw-types";
import { numberValue } from "./shared";

type RawRecord = {
  id: string;
  fields: RawInventoryMovementFields;
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

  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(", ");
  }

  return "";
}

function nullableTextValue(value: unknown): string | null {
  const normalized = textValue(value).trim();
  return normalized ? normalized : null;
}

export function mapInventoryMovement(record: RawRecord): InventoryMovement {
  const productName =
    nullableTextValue(record.fields.fld2R7ECUE1z42DJw) ||
    nullableTextValue(record.fields.fldtSkCxX3blv1xqa) ||
    nullableTextValue(record.fields.fldOl1NyruRJP2vzN) ||
    "";

  return {
    id: record.id,
    date: nullableTextValue(record.fields.fldoQUdwvZUId6wmd),
    productName,
    location: nullableTextValue(record.fields.fldXNpU6Ga5KX9vic),
    movementType: textValue(record.fields.fldseUfuzw9ktKuRy),
    quantity: numberValue(record.fields.fldRVE4yaMKwT5e1S),
    relatedOrder: nullableTextValue(record.fields.fldY3lYOKJbW1csjM),
    notes: nullableTextValue(record.fields.fldQ8umCODTY80hBU),
  };
}
