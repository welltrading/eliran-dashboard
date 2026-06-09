import "server-only";
import type { DocumentLine } from "@/lib/types";
import type { RawDocumentLineFields } from "../raw-types";
import { linkedRecordIds, numberValue } from "./shared";

type RawRecord = {
  id: string;
  fields: RawDocumentLineFields;
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

export function mapDocumentLine(record: RawRecord): DocumentLine {
  const description = textValue(record.fields.fldc33QppEyN8Yaxq).trim();
  const displayDescription =
    nullableTextValue(record.fields.fldyKIV6tKKkqT2jn) ?? description;

  return {
    id: record.id,
    description,
    displayDescription,
    lineType: nullableTextValue(record.fields.fldAoGQVj0sylIUAr),
    documentType: nullableTextValue(record.fields.fldDsTolgtpHFWkP1),
    quoteIds: linkedRecordIds(record.fields.fldtv0UmzABrZ0OgI),
    orderIds: linkedRecordIds(record.fields.fldLfzqMk98VZmts3),
    productIds: linkedRecordIds(record.fields.fld9OqOt6TCFsaHPW),
    quantity: numberValue(record.fields.fldaxQ0Ko91cTOTBb),
    unitPrice: numberValue(record.fields.fldDTYi0DZyEplom6),
    discountPercent: numberValue(record.fields.fldgNmPUYcoFHatPu),
    lineTotal: numberValue(record.fields.fld3qg1JkrUX5iTaM),
    exitLocation: nullableTextValue(record.fields.fldPbgcN4NvRtRMgp),
    status: nullableTextValue(record.fields.fld5o465AG04fQaxi),
    inventoryMovementIds: linkedRecordIds(record.fields.fldegUuhoVtTLCMRa),
    createdAt: nullableTextValue(record.fields.fldsdyswewYXl88g6),
  };
}
