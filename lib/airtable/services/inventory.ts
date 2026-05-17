import "server-only";
import type { InventoryItem, InventoryMovement, InventoryValidation } from "@/lib/types";
import { selectRecords } from "../client";
import { mapInventoryItem } from "../mappers/inventory";
import type { RawInventoryFields } from "../raw-types";
import { airtableTables } from "../tables";
import { getInventoryMovements } from "./inventory-movements";

export async function getInventoryByLocation() {
  const records = await selectRecords<RawInventoryFields>(airtableTables.inventory, {
    returnFieldsByFieldId: true,
  });
  return records.map(mapInventoryItem);
}

export function buildInventoryValidation(
  inventory: InventoryItem[],
  movements: InventoryMovement[],
): InventoryValidation {
  return {
    inventoryNegativeCount: inventory.filter((item) => item.status === "negative").length,
    inventoryOutCount: inventory.filter((item) => item.status === "out").length,
    inventoryLowCount: inventory.filter((item) => item.status === "low").length,
    movementsMissingProduct: movements.filter((movement) => movement.productRecordIds.length === 0)
      .length,
    movementsMissingLocation: movements.filter((movement) => !movement.location).length,
    movementsMissingQuantity: movements.filter((movement) => movement.quantityMissing).length,
    movementsMissingStockLocation: movements.filter(
      (movement) => movement.stockLocationIds.length === 0,
    ).length,
  };
}

export async function getInventoryValidation(): Promise<InventoryValidation> {
  const [inventory, movements] = await Promise.all([
    getInventoryByLocation(),
    getInventoryMovements(),
  ]);

  return buildInventoryValidation(inventory, movements);
}
