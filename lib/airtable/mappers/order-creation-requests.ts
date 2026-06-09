import "server-only";
import type { OrderCreationRequest } from "@/lib/types";
import type { RawOrderCreationRequestFields } from "../raw-types";
import { airtableSchema } from "../schema";
import { linkedRecordIds } from "./shared";

type RawRecord = {
  id: string;
  fields: RawOrderCreationRequestFields;
};

function textValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    value &&
    typeof value === "object" &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return value.name.trim();
  }

  return "";
}

function nullableTextValue(value: unknown) {
  const normalized = textValue(value);
  return normalized || null;
}

export function mapOrderCreationRequest(
  record: RawRecord,
): OrderCreationRequest {
  const fields = airtableSchema.fields.orderCreationRequests;

  return {
    id: record.id,
    quoteIds: linkedRecordIds(record.fields[fields.quote]),
    paymentType: nullableTextValue(record.fields[fields.paymentType]),
    paymentMethod: nullableTextValue(record.fields[fields.paymentMethod]),
    source: nullableTextValue(record.fields[fields.source]),
    standardExitLocation: nullableTextValue(
      record.fields[fields.standardExitLocation],
    ),
    requestStatus: nullableTextValue(record.fields[fields.requestStatus]),
    createdOrderIds: linkedRecordIds(record.fields[fields.createdOrder]),
    error: nullableTextValue(record.fields[fields.error]),
    notes: nullableTextValue(record.fields[fields.notes]),
  };
}
