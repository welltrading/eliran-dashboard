import "server-only";
import { selectRecords } from "../client";
import { mapInventoryItem } from "../mappers/inventory";
import { mapInventoryMovement } from "../mappers/inventory-movements";
import type { RawInventoryFields, RawInventoryMovementFields } from "../raw-types";
import { airtableTables } from "../tables";
import { createRecord } from "../write-client";

export type CreateInventoryMovementInput = {
  productId: string;
  location: string;
  movementType: string;
  quantity: string | number;
  notes: string | null;
};

type CreatedInventoryMovementFields = {
  fldG4ahYiyKWCGvoJ: string[];
  fldXNpU6Ga5KX9vic: string;
  fldseUfuzw9ktKuRy: string;
  fldRVE4yaMKwT5e1S: number;
  fldoQUdwvZUId6wmd: string;
  fldQ8umCODTY80hBU?: string;
};

const allowedMovementTypes = ["כניסה", "יציאה", "התאמה", "העברה"];

function normalizedText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeQuantity(value: string | number) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeInput(input: CreateInventoryMovementInput) {
  return {
    productId: normalizedText(input.productId),
    location: normalizedText(input.location),
    movementType: normalizedText(input.movementType),
    quantity: normalizeQuantity(input.quantity),
    notes: normalizedText(input.notes) || null,
  };
}

function validateInput(input: ReturnType<typeof normalizeInput>) {
  const errors: string[] = [];

  if (!/^rec[A-Za-z0-9]{14}$/.test(input.productId)) {
    errors.push("יש לבחור מוצר תקין.");
  }

  if (!input.location) {
    errors.push("יש לבחור מיקום מלאי.");
  }

  if (!allowedMovementTypes.includes(input.movementType)) {
    errors.push("סוג תנועה לא תקין.");
  }

  if (
    typeof input.quantity !== "number" ||
    (input.movementType === "התאמה" ? input.quantity < 0 : input.quantity <= 0)
  ) {
    errors.push(
      input.movementType === "התאמה"
        ? "כמות בפועל חייבת להיות 0 או יותר."
        : "כמות חייבת להיות גדולה מ-0.",
    );
  }

  return errors;
}

async function getCurrentInventoryQuantity(productId: string, location: string) {
  const records = await selectRecords<RawInventoryFields>(airtableTables.inventory, {
    returnFieldsByFieldId: true,
  });
  const inventory = records.map(mapInventoryItem);
  const matchingItem = inventory.find(
    (item) => item.productRecordId === productId && item.location === location,
  );

  return matchingItem?.availableQuantity ?? 0;
}

function movementNotes(
  notes: string | null,
  adjustmentDetails: string | null,
) {
  return [adjustmentDetails, notes].filter(Boolean).join(" | ") || null;
}

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

export async function createInventoryMovement(input: CreateInventoryMovementInput) {
  const normalizedInput = normalizeInput(input);
  const errors = validateInput(normalizedInput);

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "יש לתקן את השדות לפני עדכון המלאי.",
      errors,
    };
  }

  const quantity = normalizedInput.quantity;

  if (quantity === null) {
    return {
      ok: false as const,
      message: "יש לתקן את השדות לפני עדכון המלאי.",
      errors: ["כמות חייבת להיות גדולה מ-0."],
    };
  }

  let movementType = normalizedInput.movementType;
  let movementQuantity = quantity;
  let adjustmentDetails: string | null = null;

  if (normalizedInput.movementType === "התאמה") {
    const currentQuantity = await getCurrentInventoryQuantity(
      normalizedInput.productId,
      normalizedInput.location,
    );
    const delta = quantity - currentQuantity;

    if (delta === 0) {
      return {
        ok: true as const,
        message: "אין שינוי במלאי. הכמות בפועל כבר תואמת למערכת.",
      };
    }

    movementType = delta > 0 ? "כניסה" : "יציאה";
    movementQuantity = Math.abs(delta);
    adjustmentDetails = `התאמת מלאי: כמות מערכת ${currentQuantity}, כמות בפועל ${quantity}`;
  }

  const fields: CreatedInventoryMovementFields = {
    fldG4ahYiyKWCGvoJ: [normalizedInput.productId],
    fldXNpU6Ga5KX9vic: normalizedInput.location,
    fldseUfuzw9ktKuRy: movementType,
    fldRVE4yaMKwT5e1S: movementQuantity,
    fldoQUdwvZUId6wmd: new Date().toISOString().slice(0, 10),
  };

  const notes = movementNotes(normalizedInput.notes, adjustmentDetails);

  if (notes) {
    fields.fldQ8umCODTY80hBU = notes;
  }

  try {
    const createdMovement = await createRecord<CreatedInventoryMovementFields>(
      airtableTables.inventoryMovements,
      fields,
    );

    return {
      ok: true as const,
      message:
        normalizedInput.movementType === "התאמה"
          ? `התאמת המלאי נרשמה כתנועת ${movementType} של ${movementQuantity}.`
          : "תנועת המלאי נרשמה בהצלחה.",
      movementId: createdMovement.id,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "עדכון המלאי נכשל.",
      errors: [error instanceof Error ? error.message : "שגיאה לא ידועה."],
    };
  }
}
