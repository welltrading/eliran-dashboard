import "server-only";
import { selectRecords } from "../client";
import { mapDocumentLine } from "../mappers/document-lines";
import type { RawDocumentLineFields } from "../raw-types";
import { airtableSchema } from "../schema";

const documentLineFieldIds = Object.values(airtableSchema.fields.documentLines);

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
