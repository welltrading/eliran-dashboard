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
  operation: "add" | "remove";
  quantity: string | number;
  notes: string | null;
};

type CreatedInventoryMovementFields = {
  fldG4ahYiyKWCGvoJ: string[];
  fldXNpU6Ga5KX9vic: string;
  fldseUfuzw9ktKuRy: string;
  fldRVE4yaMKwT5e1S: number;
  fldFqsW6nY2Q5Guvd: string;
  fldoQUdwvZUId6wmd: string;
  fldQ8umCODTY80hBU?: string;
};

const operationToMovementType = {
  add: "כניסה למלאי",
  remove: "יציאה מהמלאי",
} as const;

const activeMovementStatus = "פעילה";
const allowedLocations = ["חנות", "מחסן"];

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
    operation: input.operation,
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

  if (!allowedLocations.includes(input.location)) {
    errors.push("יש לבחור חנות או מחסן.");
  }

  if (input.operation !== "add" && input.operation !== "remove") {
    errors.push("סוג פעולה לא תקין.");
  }

  if (
    typeof input.quantity !== "number" ||
    input.quantity <= 0
  ) {
    errors.push("כמות חייבת להיות גדולה מ-0.");
  }

  if (input.operation === "remove" && !input.notes) {
    errors.push("יש לרשום סיבת הוצאה.");
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
) {
  return notes?.trim() || null;
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

  if (normalizedInput.operation === "remove") {
    const availableQuantity = await getCurrentInventoryQuantity(
      normalizedInput.productId,
      normalizedInput.location,
    );

    if (quantity > availableQuantity) {
      return {
        ok: false as const,
        message: "אין מספיק מלאי זמין במיקום שנבחר.",
      };
    }
  }

  const fields: CreatedInventoryMovementFields = {
    fldG4ahYiyKWCGvoJ: [normalizedInput.productId],
    fldXNpU6Ga5KX9vic: normalizedInput.location,
    fldseUfuzw9ktKuRy: operationToMovementType[normalizedInput.operation],
    fldRVE4yaMKwT5e1S: quantity,
    fldFqsW6nY2Q5Guvd: activeMovementStatus,
    fldoQUdwvZUId6wmd: new Date().toISOString().slice(0, 10),
  };

  const notes = movementNotes(normalizedInput.notes);

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
      message: "המלאי עודכן בהצלחה",
      movementId: createdMovement.id,
    };
  } catch {
    return {
      ok: false as const,
      message: "לא הצלחנו לעדכן מלאי. בדוק מוצר, מיקום וכמות ונסה שוב.",
    };
  }
}
