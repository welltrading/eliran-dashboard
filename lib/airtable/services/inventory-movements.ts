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
  return records.map(mapInventoryMovement).sort((left, right) => {
    const leftTime = left.date ? new Date(left.date).getTime() : 0;
    const rightTime = right.date ? new Date(right.date).getTime() : 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return Number(right.movementNumber ?? 0) - Number(left.movementNumber ?? 0);
  });
}
