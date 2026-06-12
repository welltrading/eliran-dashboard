import "server-only";
import { selectRecords } from "../client";
import { mapDocumentLine } from "../mappers/document-lines";
import type { RawDocumentLineFields } from "../raw-types";
import { airtableSchema } from "../schema";
import { updateRecord } from "../write-client";

export type DocumentLineExitLocation = "חנות" | "מחסן";

export type UpdateDocumentLineExitLocationsInput = {
  quoteId: string;
  updates: Array<{
    documentLineId: string;
    exitLocation: DocumentLineExitLocation;
  }>;
};

type UpdatedDocumentLineExitLocationFields = {
  fldPbgcN4NvRtRMgp?: DocumentLineExitLocation;
};

const documentLineFieldIds = Object.values(airtableSchema.fields.documentLines);
const airtableRecordIdPattern = /^rec[A-Za-z0-9]{14}$/;
const standardExitLocations: DocumentLineExitLocation[] = ["חנות", "מחסן"];

function timestampValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getDocumentLines() {
  const records = await selectRecords<RawDocumentLineFields>(
    airtableSchema.tables.documentLines,
    {
      fields: documentLineFieldIds,
      returnFieldsByFieldId: true,
    },
  );

  return records
    .map(mapDocumentLine)
    .sort(
      (left, right) =>
        (timestampValue(right.createdAt) ?? Number.NEGATIVE_INFINITY) -
        (timestampValue(left.createdAt) ?? Number.NEGATIVE_INFINITY),
    );
}

export async function getDocumentLinesByQuoteId(quoteId: string) {
  const normalizedQuoteId = quoteId.trim();
  const documentLines = await getDocumentLines();

  return documentLines.filter((line) =>
    line.quoteIds.includes(normalizedQuoteId),
  );
}

export async function getDocumentLinesByOrderId(orderId: string) {
  const normalizedOrderId = orderId.trim();
  const documentLines = await getDocumentLines();

  return documentLines.filter((line) =>
    line.orderIds.includes(normalizedOrderId),
  );
}

export async function updateDocumentLineExitLocationsForQuote(
  input: UpdateDocumentLineExitLocationsInput,
) {
  const quoteId = input.quoteId.trim();
  const errors: string[] = [];
  const seenDocumentLineIds = new Set<string>();

  if (!airtableRecordIdPattern.test(quoteId)) {
    errors.push("חסר מזהה הצעת מחיר תקין.");
  }

  input.updates.forEach((update, index) => {
    const lineLabel = `שורה ${index + 1}`;

    if (!airtableRecordIdPattern.test(update.documentLineId)) {
      errors.push(`${lineLabel}: מזהה שורת מסמך לא תקין.`);
    }

    if (seenDocumentLineIds.has(update.documentLineId)) {
      errors.push(`${lineLabel}: שורת מסמך נשלחה יותר מפעם אחת.`);
    }
    seenDocumentLineIds.add(update.documentLineId);

    if (!standardExitLocations.includes(update.exitLocation)) {
      errors.push(`${lineLabel}: מיקום יציאה חייב להיות חנות או מחסן.`);
    }
  });

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "לא ניתן לעדכן מיקום יציאה לשורות המסמך.",
      errors,
    };
  }

  const documentLines = await getDocumentLinesByQuoteId(quoteId);
  const documentLinesById = new Map(
    documentLines.map((line) => [line.id, line]),
  );

  input.updates.forEach((update) => {
    const documentLine = documentLinesById.get(update.documentLineId);

    if (!documentLine) {
      errors.push("שורת מסמך לא נמצאה בהצעת המחיר.");
      return;
    }

    if (documentLine.lineType !== "סטנדרטי") {
      errors.push("מיקום יציאה מותר רק לשורת מסמך סטנדרטית.");
    }
  });

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "לא ניתן לעדכן מיקום יציאה לשורות המסמך.",
      errors,
    };
  }

  try {
    for (const update of input.updates) {
      await updateRecord<UpdatedDocumentLineExitLocationFields>(
        airtableSchema.tables.documentLines,
        update.documentLineId,
        {
          [airtableSchema.fields.documentLines.exitLocation]:
            update.exitLocation,
        },
      );
    }

    return {
      ok: true as const,
      message: "מיקומי היציאה עודכנו בהצלחה.",
      updatedCount: input.updates.length,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "עדכון מיקום היציאה בשורות המסמך נכשל.",
      errors: [error instanceof Error ? error.message : "שגיאה לא ידועה."],
    };
  }
}
