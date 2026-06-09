"use server";

import { revalidatePath } from "next/cache";
import {
  createInventoryMovement,
  type CreateInventoryMovementInput,
} from "@/lib/airtable/services/inventory-movements";
import {
  DOCUMENT_LINES_WRITE_GUARD_ERROR,
  DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
  isDocumentLinesWriteGuardEnabled,
} from "@/lib/safety-guard";

export async function createInventoryMovementAction(input: CreateInventoryMovementInput) {
  if (isDocumentLinesWriteGuardEnabled()) {
    return {
      ok: false as const,
      message: DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
      errors: [DOCUMENT_LINES_WRITE_GUARD_ERROR],
    };
  }

  const result = await createInventoryMovement(input);

  if (result.ok) {
    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
  }

  return result;
}
