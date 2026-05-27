"use server";

import { revalidatePath } from "next/cache";
import {
  createInventoryMovement,
  type CreateInventoryMovementInput,
} from "@/lib/airtable/services/inventory-movements";

export async function createInventoryMovementAction(input: CreateInventoryMovementInput) {
  const result = await createInventoryMovement(input);

  if (result.ok) {
    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
  }

  return result;
}
