import "server-only";
import { selectRecords } from "../client";
import { mapOrder } from "../mappers/orders";
import type { RawOrderFields } from "../raw-types";
import { airtableTables } from "../tables";

function numericValue(value: string) {
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

export async function getOrders() {
  const records = await selectRecords<RawOrderFields>(airtableTables.orders, {
    returnFieldsByFieldId: true,
  });

  return records
    .map(mapOrder)
    .sort((a, b) => {
      const orderNumberDiff =
        (numericValue(b.orderNumber) ?? Number.NEGATIVE_INFINITY) -
        (numericValue(a.orderNumber) ?? Number.NEGATIVE_INFINITY);

      if (orderNumberDiff !== 0) {
        return orderNumberDiff;
      }

      return (
        (timestampValue(b.createdAt) ?? Number.NEGATIVE_INFINITY) -
        (timestampValue(a.createdAt) ?? Number.NEGATIVE_INFINITY)
      );
    });
}
