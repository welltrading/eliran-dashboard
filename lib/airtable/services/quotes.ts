import "server-only";
import { selectRecords } from "../client";
import { mapQuote } from "../mappers/quotes";
import type { RawQuoteFields } from "../raw-types";
import { airtableTables } from "../tables";
import { createRecord } from "../write-client";

type StandardCreateQuoteInput = {
  quoteType: "סטנדרטי";
  customerName: string;
  phone: string;
  address: string;
  productId: string;
  totalPrice: number;
  quantity: number;
  leadSource?: string | null;
  notes?: string | null;
};

type CustomCreateQuoteInput = {
  quoteType: "ייצור אישי";
  customerName: string;
  phone: string;
  address: string;
  customProductDescription: string;
  quantity: number;
  measurementRequired: string;
  dismantlingOption: string;
  fixedPricePerSqm?: number | null;
  widthCm: number;
  depthCm: number;
  heightM: number;
  totalPrice: number;
  glassType: string;
  hardwareColor: string;
  leadSource?: string | null;
  notes?: string | null;
};

export type CreateQuoteInput = StandardCreateQuoteInput | CustomCreateQuoteInput;

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
  fldAD8QmPrnCbZhu2?: string;
  fldc6kFepSAl5rLw4?: string;
  fldRwScbjjUrYde6X?: string;
  fldYf0gHphDBcdfA6?: number;
  fldtxUhlZi7FeSJX3?: number;
  fld8TK2mavUQZ39Q2?: number;
  fldtuIXm9M6hJThCV?: number;
  fldGmiTEukzdMMRLk?: string;
  fldQWyr3BZl4bxTBb?: string;
};

const leadSources = ["מדרג", "מקצוענים", "גוגל", "המלצה", "אחר"];
const measurementRequiredOptions = ["כן", "לא"];
const dismantlingOptions = ["נדרש פירוק", "לא נדרש פירוק"];
const glassTypes = ["גרניט", "שקופה", "פסים", "ברונזה", "מושחר", "גלינה"];
const hardwareColors = ["גרפיט", "לבן", "ניקל", "שחור", "זהב", "מוברש", "ברונזה"];
const airtableRecordIdPattern = /^rec[A-Za-z0-9]{14}$/;

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function validateStandardCreateQuoteInput(input: StandardCreateQuoteInput) {
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

function normalizeOptionalNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function validateSelectValue(
  value: string,
  allowedValues: string[],
  errorMessage: string,
  errors: string[],
) {
  const normalized = value.trim();

  if (!allowedValues.includes(normalized)) {
    errors.push(errorMessage);
  }

  return normalized;
}

function validateCustomCreateQuoteInput(input: CustomCreateQuoteInput) {
  const errors: string[] = [];
  const customerName = input.customerName.trim();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const customProductDescription = input.customProductDescription.trim();
  const quantity = Number(input.quantity);
  const fixedPricePerSqm = normalizeOptionalNumber(input.fixedPricePerSqm);
  const widthCm = Number(input.widthCm);
  const depthCm = Number(input.depthCm);
  const heightM = Number(input.heightM);
  const totalPrice = Number(input.totalPrice);
  const leadSource = normalizeOptionalText(input.leadSource);
  const measurementRequired = validateSelectValue(
    input.measurementRequired,
    measurementRequiredOptions,
    "נדרשת מדידה לא תקין.",
    errors,
  );
  const dismantlingOption = validateSelectValue(
    input.dismantlingOption,
    dismantlingOptions,
    "אפשרות פירוק לא תקינה.",
    errors,
  );
  const glassType = validateSelectValue(
    input.glassType,
    glassTypes,
    "סוג זכוכית לא תקין.",
    errors,
  );
  const hardwareColor = validateSelectValue(
    input.hardwareColor,
    hardwareColors,
    "צבע פרזול לא תקין.",
    errors,
  );

  if (!customerName) {
    errors.push("שם לקוח הוא שדה חובה.");
  }

  if (!phone) {
    errors.push("טלפון הוא שדה חובה.");
  }

  if (!address) {
    errors.push("כתובת היא שדה חובה.");
  }

  if (!customProductDescription) {
    errors.push("תיאור מוצר הוא שדה חובה.");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push("כמות חייבת להיות גדולה מ-0.");
  }

  if (!Number.isFinite(widthCm) || widthCm <= 0) {
    errors.push("מידות לקוח רוחב חייב להיות גדול מ-0.");
  }

  if (!Number.isFinite(depthCm) || depthCm <= 0) {
    errors.push("מידות לקוח עומק חייב להיות גדול מ-0.");
  }

  if (!Number.isFinite(heightM) || heightM <= 0) {
    errors.push("גובה מקלחון חייב להיות גדול מ-0.");
  }

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    errors.push("מחיר כולל חייב להיות גדול מ-0.");
  }

  if (
    fixedPricePerSqm !== null &&
    (!Number.isFinite(fixedPricePerSqm) || fixedPricePerSqm <= 0)
  ) {
    errors.push("מחיר קבוע למ\"ר חייב להיות גדול מ-0.");
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
      customProductDescription,
      quantity,
      measurementRequired,
      dismantlingOption,
      fixedPricePerSqm,
      widthCm,
      depthCm,
      heightM,
      totalPrice,
      glassType,
      hardwareColor,
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
  const validation =
    input.quoteType === "ייצור אישי"
      ? validateCustomCreateQuoteInput(input)
      : validateStandardCreateQuoteInput(input);

  if (validation.errors.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור הצעת מחיר.",
      errors: validation.errors,
    };
  }

  let fields: CreatedQuoteFields;

  if (input.quoteType === "ייצור אישי") {
    const { normalized } = validateCustomCreateQuoteInput(input);

    fields = {
      fld07wwSMqvzYk0s4: normalized.customerName,
      fldPYvrQHENHZC8pJ: normalized.phone,
      fldhF5IRofdRLTkhN: normalized.address,
      fldN4EILKJZND3FOf: "ייצור אישי",
      fldAD8QmPrnCbZhu2: normalized.customProductDescription,
      fldcS4I85kjhbKZbJ: normalized.quantity,
      fldc6kFepSAl5rLw4: normalized.measurementRequired,
      fldRwScbjjUrYde6X: normalized.dismantlingOption,
      fldtxUhlZi7FeSJX3: normalized.widthCm,
      fld8TK2mavUQZ39Q2: normalized.depthCm,
      fldtuIXm9M6hJThCV: normalized.heightM,
      fldHnLVvPoqT0VHvA: normalized.totalPrice,
      fldGmiTEukzdMMRLk: normalized.glassType,
      fldQWyr3BZl4bxTBb: normalized.hardwareColor,
    };

    if (normalized.fixedPricePerSqm) {
      fields.fldYf0gHphDBcdfA6 = normalized.fixedPricePerSqm;
    }
  } else {
    const { normalized } = validateStandardCreateQuoteInput(input);

    fields = {
      fld07wwSMqvzYk0s4: normalized.customerName,
      fldPYvrQHENHZC8pJ: normalized.phone,
      fldhF5IRofdRLTkhN: normalized.address,
      fldN4EILKJZND3FOf: "סטנדרטי",
      fldPt89KYMnfPHc1X: [normalized.productId],
      fldHnLVvPoqT0VHvA: normalized.totalPrice,
      fldcS4I85kjhbKZbJ: normalized.quantity,
    };
  }

  if (validation.normalized.leadSource) {
    fields.fldOY3RLPblIPoz60 = validation.normalized.leadSource;
  }

  if (validation.normalized.notes) {
    fields.fldGnHde4OSCi00ue = validation.normalized.notes;
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
