import "server-only";
import { selectRecords } from "../client";
import { mapOrderLine } from "../mappers/order-lines";
import type { RawOrderLineFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getOrderLines() {
  const records = await selectRecords<RawOrderLineFields>(airtableTables.orderLines, {
    returnFieldsByFieldId: true,
  });
  return records.map(mapOrderLine);
}
