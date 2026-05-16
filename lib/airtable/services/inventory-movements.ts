import "server-only";
import { selectRecords } from "../client";
import { mapInventoryMovement } from "../mappers/inventory-movements";
import type { RawInventoryMovementFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getInventoryMovements() {
  const records = await selectRecords<RawInventoryMovementFields>(
    airtableTables.inventoryMovements,
    {
      returnFieldsByFieldId: true,
    },
  );
  return records.map(mapInventoryMovement);
}
