import "server-only";
import type { DocumentLine, OrderCreationRequest, Quote } from "@/lib/types";
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

function uniqueTextValues(values: Array<string | null>) {
  return Array.from(
    new Set(values.flatMap((value) => (value?.trim() ? [value.trim()] : []))),
  );
}

function totalFromDocumentLines(documentLines: DocumentLine[]) {
  return documentLines.reduce((total, line) => total + line.lineTotal, 0);
}

function quoteTypeFromDocumentLines(documentLines: DocumentLine[]) {
  const lineTypes = uniqueTextValues(
    documentLines.map((line) => line.lineType ?? line.documentType),
  );

  if (lineTypes.length === 0) {
    return null;
  }

  if (lineTypes.length > 1) {
    return "מעורב";
  }

  const [lineType] = lineTypes;

  if (lineType === "מוצר מהמלאי") {
    return "סטנדרטי";
  }

  return lineType;
}

function hasOpenOrderCreationRequest(
  orderCreationRequests: OrderCreationRequest[],
) {
  return orderCreationRequests.some(
    (request) =>
      !request.requestStatus &&
      request.createdOrderIds.length === 0 &&
      !request.error,
  );
}

function firstCreatedOrderId(
  quoteCreatedOrderIds: string[],
  orderCreationRequests: OrderCreationRequest[],
) {
  return (
    quoteCreatedOrderIds[0] ??
    orderCreationRequests.flatMap((request) => request.createdOrderIds)[0] ??
    null
  );
}

function requestError(orderCreationRequests: OrderCreationRequest[]) {
  return (
    orderCreationRequests.find((request) => request.error)?.error ?? null
  );
}

function requestStatusForDisplay(input: {
  createdOrderId: string | null;
  orderCreationRequests: OrderCreationRequest[];
  error: string | null;
}) {
  if (input.createdOrderId) {
    return "הזמנה נוצרה";
  }

  if (input.error) {
    return "שגיאה ביצירת הזמנה";
  }

  if (hasOpenOrderCreationRequest(input.orderCreationRequests)) {
    return "ממתין ליצירת הזמנה";
  }

  const explicitStatus = input.orderCreationRequests.find(
    (request) => request.requestStatus,
  )?.requestStatus;

  if (explicitStatus) {
    return explicitStatus;
  }

  return "אין בקשת הזמנה";
}

export function mapQuote(
  record: RawRecord,
  documentLines: DocumentLine[] = [],
  orderCreationRequests: OrderCreationRequest[] = [],
): Quote {
  const lineTypesFromDocumentLines = uniqueTextValues(
    documentLines.map((line) => line.lineType),
  );
  const quoteCreatedOrderIds = linkedRecordIds(record.fields.fldKNXfM18R4OtfGk);
  const createdOrderId = firstCreatedOrderId(
    quoteCreatedOrderIds,
    orderCreationRequests,
  );
  const orderCreationRequestError = requestError(orderCreationRequests);

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
    // LEGACY_DISPLAY_FALLBACK_ONLY: retained for temporary display when a quote has no document lines yet.
    totalPrice: numberValue(record.fields.fldHnLVvPoqT0VHvA),
    documentLines,
    totalFromDocumentLines: totalFromDocumentLines(documentLines),
    lineTypesFromDocumentLines,
    quoteTypeFromDocumentLines: quoteTypeFromDocumentLines(documentLines),
    ezDocUrl: urlValue(record.fields.fldh8tz1xgQNCNGgH),
    ezDocNumber: nullableTextValue(record.fields.fldf9PSV2gFZxXsxY),
    leadSource: nullableTextValue(record.fields.fldOY3RLPblIPoz60),
    createOrderUrl:
      urlValue(record.fields.fldgzZ3UQE6FOil0T) ??
      urlValue(record.fields.fldv6P5NJkh207aJR),
    // LEGACY_DISPLAY_FALLBACK_ONLY: old single-product fields remain available for screens not yet refactored.
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
    createdOrderIds: Array.from(
      new Set([
        ...quoteCreatedOrderIds,
        ...orderCreationRequests.flatMap((request) => request.createdOrderIds),
      ]),
    ),
    orderCreationRequests,
    hasOpenOrderCreationRequest:
      hasOpenOrderCreationRequest(orderCreationRequests),
    createdOrderId,
    orderCreationRequestStatusForDisplay: requestStatusForDisplay({
      createdOrderId,
      orderCreationRequests,
      error: orderCreationRequestError,
    }),
    orderCreationRequestError,
  };
}
