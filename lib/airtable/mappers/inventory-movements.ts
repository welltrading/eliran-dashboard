import "server-only";
import type { InventoryMovement } from "@/lib/types";
import type { RawInventoryMovementFields } from "../raw-types";
import { linkedRecordIds, numberValue } from "./shared";

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

function cleanProductDisplayName(value: string | null) {
  return (
    value
      ?.replace(/\s*\|\s*(מחסן|חנות)\s*\|\s*מלאי:\s*-?\d+\s*$/u, "")
      .replace(/\s*\|\s*\|\s*\|\s*\|\s*$/u, "")
      .trim() || null
  );
}

export function mapInventoryMovement(record: RawRecord): InventoryMovement {
  const productRecordIds = linkedRecordIds(record.fields.fldG4ahYiyKWCGvoJ);
  const productName = cleanProductDisplayName(
    nullableTextValue(record.fields.fld2R7ECUE1z42DJw) ||
    nullableTextValue(record.fields.fldtSkCxX3blv1xqa) ||
    nullableTextValue(record.fields.fldOl1NyruRJP2vzN),
  );

  return {
    id: record.id,
    movementNumber: nullableTextValue(record.fields.fldKRpqK9M9M0oODe),
    date: nullableTextValue(record.fields.fldoQUdwvZUId6wmd),
    productName,
    productRecordIds,
    location: nullableTextValue(record.fields.fldXNpU6Ga5KX9vic),
    movementType: textValue(record.fields.fldseUfuzw9ktKuRy),
    direction: nullableTextValue(record.fields.fld4YI5VbouZBvKb3),
    quantity: numberValue(record.fields.fldRVE4yaMKwT5e1S),
    quantityMissing: typeof record.fields.fldRVE4yaMKwT5e1S !== "number",
    calculatedQuantity: numberValue(record.fields.fld733WyctwcweOC6),
    status: nullableTextValue(record.fields.fldFqsW6nY2Q5Guvd),
    stockLocationIds: linkedRecordIds(record.fields.fldtsmbAgTKPc7kUj),
    orderLineIds: linkedRecordIds(record.fields.fldModhBcaJqCP6na),
    orderLineLabels: [],
    relatedOrder: nullableTextValue(record.fields.fldY3lYOKJbW1csjM),
    notes: nullableTextValue(record.fields.fldQ8umCODTY80hBU),
  };
}
