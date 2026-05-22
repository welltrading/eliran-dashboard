import "server-only";
import { selectRecords } from "../client";
import { mapQuote } from "../mappers/quotes";
import type { RawQuoteFields } from "../raw-types";
import { airtableTables } from "../tables";
import { createRecord } from "../write-client";

export type CreateQuoteInput = {
  customerName: string;
  phone: string;
  address: string;
  productId: string;
  totalPrice: number;
  quantity: number;
  leadSource?: string | null;
  notes?: string | null;
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
  fldhF5IRofdRLTkhN?: string;
  fldN4EILKJZND3FOf?: string;
  fldPt89KYMnfPHc1X?: string[];
  fldHnLVvPoqT0VHvA?: number;
  fldcS4I85kjhbKZbJ?: number;
  fldOY3RLPblIPoz60?: string;
  fldGnHde4OSCi00ue?: string;
};

const leadSources = ["מדרג", "מקצוענים", "גוגל", "המלצה", "אחר"];
const airtableRecordIdPattern = /^rec[A-Za-z0-9]{14}$/;

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function validateCreateQuoteInput(input: CreateQuoteInput) {
  const errors: string[] = [];
  const customerName = input.customerName.trim();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const productId = input.productId.trim();
  const leadSource = normalizeOptionalText(input.leadSource);
  const quantity = Number(input.quantity);
  const totalPrice = Number(input.totalPrice);

  if (!customerName) {
    errors.push("שם לקוח הוא שדה חובה.");
  }

  if (!phone) {
    errors.push("טלפון הוא שדה חובה.");
  }

  if (!address) {
    errors.push("כתובת היא שדה חובה.");
  }

  if (!airtableRecordIdPattern.test(productId)) {
    errors.push("מוצר הוא שדה חובה.");
  }

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    errors.push("מחיר כולל חייב להיות גדול מ-0.");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push("כמות חייבת להיות גדולה מ-0.");
  }

  if (leadSource && !leadSources.includes(leadSource)) {
    errors.push("מקור הגעה לא תקין.");
  }

  return {
    errors,
    normalized: {
      customerName,
      phone,
      address,
      productId,
      totalPrice,
      quantity,
      leadSource,
      notes: normalizeOptionalText(input.notes),
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
    fldhF5IRofdRLTkhN: normalized.address,
    fldN4EILKJZND3FOf: "סטנדרטי",
    fldPt89KYMnfPHc1X: [normalized.productId],
    fldHnLVvPoqT0VHvA: normalized.totalPrice,
    fldcS4I85kjhbKZbJ: normalized.quantity,
  };

  if (normalized.leadSource) {
    fields.fldOY3RLPblIPoz60 = normalized.leadSource;
  }

  if (normalized.notes) {
    fields.fldGnHde4OSCi00ue = normalized.notes;
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
