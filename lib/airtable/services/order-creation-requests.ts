import "server-only";
import type { DocumentLine } from "@/lib/types";
import { selectRecords } from "../client";
import { airtableSchema } from "../schema";
import { createRecord } from "../write-client";
import { getDocumentLinesByQuoteId } from "./document-lines";
import { getQuoteById } from "./quotes";

export type CreateOrderCreationRequestInput = {
  quoteId: string;
  paymentType: "תשלום מלא" | "מקדמה 60%";
  paymentMethod: "העברה בנקאית" | "אשראי" | "מזומן" | "ביט" | "פייבוקס";
  source: "מדרג" | "מקצוענים" | "גוגל" | "המלצה" | "מהאתר" | "אחר";
  standardExitLocation?: "חנות" | "מחסן" | null;
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

type RawOrderCreationRequestFields = {
  fldaI9zE77a32nibS?: unknown;
  fldNa87jPiA2O6BiK?: unknown;
  fld81k3CttGthgzVF?: unknown;
  fldUmyn72xtd0EK9h?: unknown;
  fldeLwIaKgJmPnA3D?: unknown;
  fldGHTJ7cWCzeeUvW?: unknown;
  fld7oyKAyI7vSNLky?: unknown;
  fldfDSzoN9MSj9s2t?: unknown;
  fldpLvviItbbVImvF?: unknown;
  fldkQkq7SzWm8dI8l?: unknown;
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

function linkedRecordIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

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

function hasStandardDocumentLine(documentLines: DocumentLine[]) {
  return documentLines.some((line) => line.lineType === "סטנדרטי");
}

async function getOpenOrderCreationRequestsForQuote(quoteId: string) {
  const requestFields = airtableSchema.fields.orderCreationRequests;
  const records = await selectRecords<RawOrderCreationRequestFields>(
    airtableSchema.tables.orderCreationRequests,
    {
      fields: [
        requestFields.quote,
        requestFields.requestStatus,
        requestFields.createdOrder,
      ],
      returnFieldsByFieldId: true,
    },
  );

  return records.filter((record) => {
    const fields = record.fields;
    const quoteIds = linkedRecordIds(fields[requestFields.quote]);
    const createdOrderIds = linkedRecordIds(fields[requestFields.createdOrder]);
    const requestStatus = textValue(fields[requestFields.requestStatus]);

    return (
      quoteIds.includes(quoteId) &&
      !requestStatus &&
      createdOrderIds.length === 0
    );
  });
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
      errors: ["להצעת המחיר כבר קיימת הזמנה שנוצרה."],
    };
  }

  const documentLines = await getDocumentLinesByQuoteId(quoteId);

  if (documentLines.length === 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: ["להצעת המחיר אין שורות מסמך."],
    };
  }

  if (hasStandardDocumentLine(documentLines) && !standardExitLocation) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: ["יש לבחור מיקום יציאה לפריטים סטנדרטיים."],
    };
  }

  const openRequests = await getOpenOrderCreationRequestsForQuote(quoteId);

  if (openRequests.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור בקשת הזמנה.",
      errors: ["כבר קיימת בקשת יצירת הזמנה פתוחה להצעה הזו."],
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
          standardExitLocation as CreateOrderCreationRequestInput["standardExitLocation"],
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
