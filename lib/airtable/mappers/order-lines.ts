import "server-only";
import type { OrderLine } from "@/lib/types";
import type { RawOrderLineFields } from "../raw-types";
import { numberValue } from "./shared";

type RawRecord = {
  id: string;
  fields: RawOrderLineFields;
};

function textValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
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

function linkedRecordIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function mapOrderLine(record: RawRecord): OrderLine {
  return {
    id: record.id,
    linkedOrderIds: linkedRecordIds(record.fields.fldPxGffqlrfcYZIM),
    linkedOrderNumber: nullableTextValue(record.fields.fldnk3IiyNeTTGqsa),
    productDescription: nullableTextValue(record.fields.fldmfjeDAJIls5oWG) || "",
    quantity: numberValue(record.fields.fldhrAvwCw1grQHNI),
    lineTotalPrice: numberValue(record.fields.fldp4FofbLftwSYZ7),
    priceBeforeVat: numberValue(record.fields.fldxUifeVCCQaXNhV),
    inventoryMovementType: nullableTextValue(record.fields.fldr1hhLfgIDGxhHS),
    createdAt: nullableTextValue(record.fields.fldhCTBK9KWOQgZrg),
  };
}
