import "server-only";
import type { Quote } from "@/lib/types";
import type { RawQuoteFields } from "../raw-types";
import { linkedRecordIds, numberValue, quoteType } from "./shared";

type RawRecord = {
  id: string;
  fields: RawQuoteFields;
};

function urlValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (
    value &&
    typeof value === "object" &&
    "url" in value &&
    typeof value.url === "string"
  ) {
    return value.url.trim() || null;
  }

  return null;
}

function textValue(value: unknown) {
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

  return "";
}

function measurementRequiredValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "כן" : "לא";
  }

  return nullableTextValue(value);
}

function nullableTextValue(value: unknown) {
  const normalized = textValue(value).trim();
  return normalized ? normalized : null;
}

function nullableNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapQuote(record: RawRecord): Quote {
  return {
    id: record.id,
    quoteNumber:
      textValue(record.fields.fldFfYboIrcFejtHN) ||
      textValue(record.fields.fldf9PSV2gFZxXsxY),
    customerName: textValue(record.fields.fld07wwSMqvzYk0s4),
    phone: nullableTextValue(record.fields.fldPYvrQHENHZC8pJ),
    address: nullableTextValue(record.fields.fldhF5IRofdRLTkhN),
    quoteType: quoteType(textValue(record.fields.fldN4EILKJZND3FOf)),
    status: textValue(record.fields.fldzlKcHkLftZVxFM),
    createdAt: nullableTextValue(record.fields.fldF5hky2jB0vs5GY),
    totalPrice: numberValue(record.fields.fldHnLVvPoqT0VHvA),
    ezDocUrl: urlValue(record.fields.fldh8tz1xgQNCNGgH),
    leadSource: nullableTextValue(record.fields.fldOY3RLPblIPoz60),
    createOrderUrl:
      urlValue(record.fields.fldgzZ3UQE6FOil0T) ??
      urlValue(record.fields.fldv6P5NJkh207aJR),
    productIds: linkedRecordIds(record.fields.fldPt89KYMnfPHc1X),
    customProductDescription: nullableTextValue(record.fields.fldAD8QmPrnCbZhu2),
    customSpecDescription: nullableTextValue(record.fields.fldzFSTLmY8eMk2zF),
    quantity: nullableNumberValue(record.fields.fldcS4I85kjhbKZbJ),
    quoteNotes: nullableTextValue(record.fields.fldGnHde4OSCi00ue),
    width: nullableTextValue(record.fields.fldtxUhlZi7FeSJX3),
    depth: nullableTextValue(record.fields.fld8TK2mavUQZ39Q2),
    height: nullableTextValue(record.fields.fldtuIXm9M6hJThCV),
    glassType: nullableTextValue(record.fields.fldGmiTEukzdMMRLk),
    hardwareColor: nullableTextValue(record.fields.fldQWyr3BZl4bxTBb),
    dismantlingOption: nullableTextValue(record.fields.fldRwScbjjUrYde6X),
    measurementRequired: measurementRequiredValue(record.fields.fldc6kFepSAl5rLw4),
    createdOrderIds: linkedRecordIds(record.fields.fldKNXfM18R4OtfGk),
  };
}
