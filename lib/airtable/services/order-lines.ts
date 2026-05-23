import "server-only";
import { selectRecords } from "../client";
import { mapOrderLine } from "../mappers/order-lines";
import type { RawOrderLineFields } from "../raw-types";
import { airtableTables } from "../tables";

function numericValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getOrderLines() {
  const records = await selectRecords<RawOrderLineFields>(airtableTables.orderLines, {
    returnFieldsByFieldId: true,
  });

  return records
    .map(mapOrderLine)
    .sort((a, b) => {
      const lineNumberDiff =
        (numericValue(b.linkedOrderNumber) ?? Number.NEGATIVE_INFINITY) -
        (numericValue(a.linkedOrderNumber) ?? Number.NEGATIVE_INFINITY);

      if (lineNumberDiff !== 0) {
        return lineNumberDiff;
      }

      return (
        (timestampValue(b.createdAt) ?? Number.NEGATIVE_INFINITY) -
        (timestampValue(a.createdAt) ?? Number.NEGATIVE_INFINITY)
      );
    });
}
