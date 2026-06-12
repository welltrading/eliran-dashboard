import "server-only";
import type { DocumentLine, OrderCreationRequest } from "@/lib/types";
import { selectRecords } from "../client";
import { mapOrderCreationRequest } from "../mappers/order-creation-requests";
import type { RawOrderCreationRequestFields } from "../raw-types";
import { airtableSchema } from "../schema";
import { createRecord } from "../write-client";
import {
  getDocumentLinesByQuoteId,
  updateDocumentLineExitLocationsForQuote,
  type DocumentLineExitLocation,
} from "./document-lines";
import { getQuoteById } from "./quotes";

export type CreateOrderCreationRequestInput = {
  quoteId: string;
  paymentType: "תשלום מלא" | "מקדמה 60%";
  paymentMethod: "העברה בנקאית" | "אשראי" | "מזומן" | "ביט" | "פייבוקס";
  source: "מדרג" | "מקצוענים" | "גוגל" | "המלצה" | "מהאתר" | "אחר";
  standardExitLocation?: "חנות" | "מחסן" | null;
  standardLineExitLocations?: Record<string, DocumentLineExitLocation>;
  notes?: string | null;
};

export type CreateOrderCreationRequestResult =
  | {
      ok: true;
      message: string;
      requestId: string;
    }
  | {
      ok: false;
      message: string;
      errors: string[];
    };

type CreatedOrderCreationRequestFields = {
  fldaI9zE77a32nibS: string;
  fldNa87jPiA2O6BiK: string[];
  fld81k3CttGthgzVF: string;
  fldUmyn72xtd0EK9h: string;
  fld7oyKAyI7vSNLky?: string;
  fldfDSzoN9MSj9s2t: string;
  fldpLvviItbbVImvF?: string;
};

const airtableRecordIdPattern = /^rec[A-Za-z0-9]{14}$/;
const paymentTypes = ["תשלום מלא", "מקדמה 60%"];
const paymentMethods = ["העברה בנקאית", "אשראי", "מזומן", "ביט", "פייבוקס"];
const sources = ["מדרג", "מקצוענים", "גוגל", "המלצה", "מהאתר", "אחר"];
const standardExitLocations = ["חנות", "מחסן"];

function normalizedText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizedOptionalText(value: string | null | undefined) {
  const normalized = normalizedText(value);
  return normalized || null;
}

function hasStandardDocumentLine(documentLines: DocumentLine[]) {
  return documentLines.some((line) => line.lineType === "סטנדרטי");
}

function standardDocumentLines(documentLines: DocumentLine[]) {
  return documentLines.filter((line) => line.lineType === "סטנדרטי");
}

function fallbackStandardExitLocation(
  updates: Array<{ exitLocation: DocumentLineExitLocation }>,
) {
  const uniqueLocations = new Set(updates.map((update) => update.exitLocation));
  return uniqueLocations.size === 1 ? updates[0]?.exitLocation ?? null : null;
}

function requestIsOpen(request: OrderCreationRequest) {
  return (
    !request.requestStatus &&
    request.createdOrderIds.length === 0 &&
    !request.error
  );
}

const orderCreationRequestFieldIds = Object.values(
  airtableSchema.fields.orderCreationRequests,
);

export async function getOrderCreationRequests() {
  const records = await selectRecords<RawOrderCreationRequestFields>(
    airtableSchema.tables.orderCreationRequests,
    {
      cache: "no-store",
      fields: orderCreationRequestFieldIds,
      returnFieldsByFieldId: true,
    },
  );

  return records.map(mapOrderCreationRequest);
}

export async function getOrderCreationRequestsByQuoteIds(quoteIds: string[]) {
  const quoteIdSet = new Set(quoteIds.filter(Boolean));

  if (quoteIdSet.size === 0) {
    return [];
  }

  const requests = await getOrderCreationRequests();

  return requests.filter((request) =>
    request.quoteIds.some((quoteId) => quoteIdSet.has(quoteId)),
  );
}

async function getOpenOrderCreationRequestsForQuote(quoteId: string) {
  const requests = await getOrderCreationRequestsByQuoteIds([quoteId]);
  return requests.filter(requestIsOpen);
}

async function getCreatedOrderRequestsForQuote(quoteId: string) {
  const requests = await getOrderCreationRequestsByQuoteIds([quoteId]);
  return requests.filter((request) => request.createdOrderIds.length > 0);
}

function requestFields(input: {
  quoteId: string;
  quoteNumber: string;
  paymentType: CreateOrderCreationRequestInput["paymentType"];
  paymentMethod: CreateOrderCreationRequestInput["paymentMethod"];
  source: CreateOrderCreationRequestInput["source"];
  standardExitLocation: CreateOrderCreationRequestInput["standardExitLocation"];
  notes: string | null;
}) {
  const fields: CreatedOrderCreationRequestFields = {
    [airtableSchema.fields.orderCreationRequests.requestName]:
      `יצירת הזמנה מהצעת מחיר ${input.quoteNumber || input.quoteId}`,
    [airtableSchema.fields.orderCreationRequests.quote]: [input.quoteId],
    [airtableSchema.fields.orderCreationRequests.paymentType]:
      input.paymentType,
    [airtableSchema.fields.orderCreationRequests.paymentMethod]:
      input.paymentMethod,
    [airtableSchema.fields.orderCreationRequests.source]: input.source,
  };

  if (input.standardExitLocation) {
    fields[airtableSchema.fields.orderCreationRequests.standardExitLocation] =
      input.standardExitLocation;
  }

  if (input.notes) {
    fields[airtableSchema.fields.orderCreationRequests.notes] = input.notes;
  }

  return fields;
}

export async function createOrderCreationRequestFromQuote(
  input: CreateOrderCreationRequestInput,
): Promise<CreateOrderCreationRequestResult> {
  const quoteId = normalizedText(input.quoteId);
  const paymentType = normalizedText(input.paymentType);
  const paymentMethod = normalizedText(input.paymentMethod);
  const source = normalizedText(input.source);
  const standardExitLocation = normalizedOptionalText(input.standardExitLocation);
  const standardLineExitLocations = input.standardLineExitLocations ?? {};
  const notes = normalizedOptionalText(input.notes);
  const errors: string[] = [];

  if (!airtableRecordIdPattern.test(quoteId)) {
    errors.push("חסר מזהה הצעת מחיר תקין.");
  }

  if (!paymentTypes.includes(paymentType)) {
    errors.push("יש לבחור תשלום מלא או מקדמה 60%.");
  }

  if (!paymentMethods.includes(paymentMethod)) {
    errors.push("יש לבחור אמצעי תשלום תקין.");
  }

  if (!sources.includes(source)) {
    errors.push("יש לבחור מקור הגעה תקין.");
  }

  if (
    standardExitLocation &&
    !standardExitLocations.includes(standardExitLocation)
  ) {
    errors.push("מיקום יציאה לפריטים סטנדרטיים אינו תקין.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors,
    };
  }

  const quote = await getQuoteById(quoteId);

  if (!quote) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: ["הצעת המחיר לא נמצאה."],
    };
  }

  if (quote.createdOrderIds.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: ["כבר קיימת בקשת הזמנה או הזמנה להצעה זו"],
    };
  }

  const documentLines = await getDocumentLinesByQuoteId(quoteId);
  const standardLines = standardDocumentLines(documentLines);
  const standardLineIds = new Set(standardLines.map((line) => line.id));

  if (documentLines.length === 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: ["להצעת המחיר אין שורות מסמך."],
    };
  }

  const invalidLineExitLocationIds = Object.keys(standardLineExitLocations).filter(
    (documentLineId) => !standardLineIds.has(documentLineId),
  );

  if (invalidLineExitLocationIds.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: ["מיקום יציאה מותר רק לשורות סטנדרטיות של הצעת המחיר."],
    };
  }

  const lineExitLocationUpdates = standardLines.map((line) => ({
    documentLineId: line.id,
    exitLocation: standardLineExitLocations[line.id],
  }));
  const missingExitLocation = lineExitLocationUpdates.some(
    (update) => !standardExitLocations.includes(update.exitLocation),
  );

  if (hasStandardDocumentLine(documentLines) && missingExitLocation) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: [
        "יש לבחור מיקום יציאה לכל מוצר סטנדרטי לפני יצירת הזמנה",
      ],
    };
  }

  const openRequests = await getOpenOrderCreationRequestsForQuote(quoteId);
  const createdOrderRequests = await getCreatedOrderRequestsForQuote(quoteId);

  if (openRequests.length > 0 || createdOrderRequests.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: ["כבר קיימת בקשת הזמנה או הזמנה להצעה זו"],
    };
  }

  const exitLocationUpdates = lineExitLocationUpdates.map((update) => ({
    documentLineId: update.documentLineId,
    exitLocation: update.exitLocation as DocumentLineExitLocation,
  }));
  const exitLocationUpdateResult =
    await updateDocumentLineExitLocationsForQuote({
      quoteId,
      updates: exitLocationUpdates,
    });

  if (!exitLocationUpdateResult.ok) {
    return {
      ok: false,
      message: exitLocationUpdateResult.message,
      errors: exitLocationUpdateResult.errors,
    };
  }

  try {
    const request = await createRecord<CreatedOrderCreationRequestFields>(
      airtableSchema.tables.orderCreationRequests,
      requestFields({
        quoteId,
        quoteNumber: quote.quoteNumber,
        paymentType: paymentType as CreateOrderCreationRequestInput["paymentType"],
        paymentMethod:
          paymentMethod as CreateOrderCreationRequestInput["paymentMethod"],
        source: source as CreateOrderCreationRequestInput["source"],
        standardExitLocation:
          fallbackStandardExitLocation(exitLocationUpdates) as CreateOrderCreationRequestInput["standardExitLocation"],
        notes,
      }),
    );

    return {
      ok: true,
      message:
        "בקשת יצירת הזמנה נשלחה. ההזמנה תיווצר על ידי האוטומציה.",
      requestId: request.id,
    };
  } catch (error) {
    return {
      ok: false,
      message: "יצירת בקשת ההזמנה נכשלה.",
      errors: [error instanceof Error ? error.message : "שגיאה לא ידועה."],
    };
  }
}
