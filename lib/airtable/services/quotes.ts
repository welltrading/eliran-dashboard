import "server-only";
import { selectRecords } from "../client";
import { mapQuote } from "../mappers/quotes";
import type { RawQuoteFields } from "../raw-types";
import { airtableTables } from "../tables";
import { createRecord } from "../write-client";
import type { QuoteType } from "@/lib/types";

export type CreateQuoteInput = {
  customerName: string;
  phone: string;
  quoteType: QuoteType;
  totalPrice: number;
  quantity?: number | null;
  leadSource?: string | null;
  notes?: string | null;
  customProductDescription?: string | null;
};

export type CreateQuoteResult =
  | {
      ok: true;
      message: string;
      quoteId: string;
    }
  | {
      ok: false;
      message: string;
      errors: string[];
    };

type CreatedQuoteFields = {
  fld07wwSMqvzYk0s4?: string;
  fldPYvrQHENHZC8pJ?: string;
  fldN4EILKJZND3FOf?: string;
  fldHnLVvPoqT0VHvA?: number;
  fldcS4I85kjhbKZbJ?: number;
  fldOY3RLPblIPoz60?: string;
  fldGnHde4OSCi00ue?: string;
  fldAD8QmPrnCbZhu2?: string;
};

const quoteTypes: QuoteType[] = ["סטנדרטי", "ייצור אישי"];
const leadSources = ["מדרג", "מקצוענים", "גוגל", "המלצה", "אחר"];

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function validateCreateQuoteInput(input: CreateQuoteInput) {
  const errors: string[] = [];
  const customerName = input.customerName.trim();
  const phone = input.phone.trim();
  const customProductDescription = normalizeOptionalText(
    input.customProductDescription,
  );
  const leadSource = normalizeOptionalText(input.leadSource);
  const quantity =
    input.quantity === null || input.quantity === undefined
      ? null
      : Number(input.quantity);
  const totalPrice = Number(input.totalPrice);

  if (!customerName) {
    errors.push("שם לקוח הוא שדה חובה.");
  }

  if (!phone) {
    errors.push("טלפון הוא שדה חובה.");
  }

  if (!quoteTypes.includes(input.quoteType)) {
    errors.push("סוג הצעה לא תקין.");
  }

  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    errors.push("מחיר כולל חייב להיות מספר 0 או יותר.");
  }

  if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
    errors.push("כמות חייבת להיות גדולה מ-0.");
  }

  if (leadSource && !leadSources.includes(leadSource)) {
    errors.push("מקור הגעה לא תקין.");
  }

  if (input.quoteType === "ייצור אישי" && !customProductDescription) {
    errors.push("תיאור מוצר ייצור אישי הוא שדה חובה.");
  }

  return {
    errors,
    normalized: {
      customerName,
      phone,
      quoteType: input.quoteType,
      totalPrice,
      quantity,
      leadSource,
      notes: normalizeOptionalText(input.notes),
      customProductDescription,
    },
  };
}

export async function getQuotes() {
  const records = await selectRecords<RawQuoteFields>(airtableTables.quotes, {
    cache: "no-store",
    returnFieldsByFieldId: true,
  });
  return records
    .map(mapQuote)
    .sort((a, b) => Number(b.quoteNumber) - Number(a.quoteNumber));
}

export async function getQuoteById(id: string) {
  const quotes = await getQuotes();
  return quotes.find((quote) => quote.id === id) ?? null;
}

export async function createQuote(input: CreateQuoteInput): Promise<CreateQuoteResult> {
  const { errors, normalized } = validateCreateQuoteInput(input);

  if (errors.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור הצעת מחיר.",
      errors,
    };
  }

  const fields: CreatedQuoteFields = {
    fld07wwSMqvzYk0s4: normalized.customerName,
    fldPYvrQHENHZC8pJ: normalized.phone,
    fldN4EILKJZND3FOf: normalized.quoteType,
    fldHnLVvPoqT0VHvA: normalized.totalPrice,
  };

  if (normalized.quantity !== null) {
    fields.fldcS4I85kjhbKZbJ = normalized.quantity;
  }

  if (normalized.leadSource) {
    fields.fldOY3RLPblIPoz60 = normalized.leadSource;
  }

  if (normalized.notes) {
    fields.fldGnHde4OSCi00ue = normalized.notes;
  }

  if (normalized.quoteType === "ייצור אישי" && normalized.customProductDescription) {
    fields.fldAD8QmPrnCbZhu2 = normalized.customProductDescription;
  }

  try {
    const record = await createRecord<CreatedQuoteFields>(
      airtableTables.quotes,
      fields,
    );

    return {
      ok: true,
      message: "הצעת המחיר נוצרה בהצלחה.",
      quoteId: record.id,
    };
  } catch (error) {
    return {
      ok: false,
      message: "יצירת הצעת המחיר נכשלה.",
      errors: [error instanceof Error ? error.message : "שגיאה לא ידועה."],
    };
  }
}
