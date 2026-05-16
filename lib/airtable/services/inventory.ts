import "server-only";
import { selectRecords } from "../client";
import { mapInventoryItem } from "../mappers/inventory";
import type { RawInventoryFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getInventoryByLocation() {
  const records = await selectRecords<RawInventoryFields>(airtableTables.inventory, {
    returnFieldsByFieldId: true,
  });
  return records.map(mapInventoryItem);
}
