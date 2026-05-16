import "server-only";
import { selectRecords } from "../client";
import { mapOrder } from "../mappers/orders";
import type { RawOrderFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getOrders() {
  const records = await selectRecords<RawOrderFields>(airtableTables.orders, {
    returnFieldsByFieldId: true,
  });
  return records.map(mapOrder);
}
