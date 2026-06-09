import "server-only";
import { airtableSchema } from "../schema";
import { createRecord, createRecords, deleteRecord } from "../write-client";

export type CreateQuoteDocumentLineInput = {
  lineType: "סטנדרטי" | "ייצור אישי" | "מדידה";
  productId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
};

export type CreateQuoteWithDocumentLinesInput = {
  customerName: string;
  phone: string;
  address?: string | null;
  leadSource?: string | null;
  notes?: string | null;
  lines: CreateQuoteDocumentLineInput[];
};

export type CreateQuoteWithDocumentLinesResult =
  | {
      ok: true;
      message: string;
      quoteId: string;
      documentLineCount: number;
    }
  | {
      ok: false;
      message: string;
      errors: string[];
      quoteId?: string;
    };

type CreatedQuoteFields = {
  fld07wwSMqvzYk0s4?: string;
  fldPYvrQHENHZC8pJ?: string;
  fldhF5IRofdRLTkhN?: string;
  fldOY3RLPblIPoz60?: string;
  fldGnHde4OSCi00ue?: string;
};

type CreatedDocumentLineFields = {
  fldc33QppEyN8Yaxq: string;
  fldAoGQVj0sylIUAr: string;
  fldtv0UmzABrZ0OgI: string[];
  fld9OqOt6TCFsaHPW?: string[];
  fldaxQ0Ko91cTOTBb: number;
  fldDTYi0DZyEplom6: number;
  fldgNmPUYcoFHatPu?: number;
  fldsTPKtaw1AYHN2A?: string;
  fld5o465AG04fQaxi?: string;
};

const airtableRecordIdPattern = /^rec[A-Za-z0-9]{14}$/;
const allowedLineTypes = ["סטנדרטי", "ייצור אישי", "מדידה"];
const allowedLeadSources = ["מדרג", "מקצוענים", "גוגל", "המלצה", "אחר"];
const documentLineSourceFromApp = "נוצרה באפליקציה";
const activeDocumentLineStatus = "פעילה";

function normalizedText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizedOptionalText(value: string | null | undefined) {
  const normalized = normalizedText(value);
  return normalized || null;
}

function normalizedNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeLine(line: CreateQuoteDocumentLineInput) {
  return {
    lineType: normalizedText(line.lineType) as CreateQuoteDocumentLineInput["lineType"],
    productId: normalizedOptionalText(line.productId),
    description: normalizedOptionalText(line.description),
    quantity: normalizedNumber(line.quantity),
    unitPrice: normalizedNumber(line.unitPrice),
    discountPercent:
      line.discountPercent === null || line.discountPercent === undefined
        ? null
        : normalizedNumber(line.discountPercent),
  };
}

function validateInput(input: CreateQuoteWithDocumentLinesInput) {
  const errors: string[] = [];
  const customerName = normalizedText(input.customerName);
  const phone = normalizedText(input.phone);
  const address = normalizedOptionalText(input.address);
  const leadSource = normalizedOptionalText(input.leadSource);
  const notes = normalizedOptionalText(input.notes);
  const lines = input.lines.map(normalizeLine);

  if (!customerName) {
    errors.push("שם לקוח הוא שדה חובה.");
  }

  if (!phone) {
    errors.push("טלפון הוא שדה חובה.");
  }

  if (leadSource && !allowedLeadSources.includes(leadSource)) {
    errors.push("מקור הגעה לא תקין.");
  }

  if (lines.length === 0) {
    errors.push("יש להוסיף לפחות שורת מסמך אחת.");
  }

  lines.forEach((line, index) => {
    const lineLabel = `שורה ${index + 1}`;

    if (!allowedLineTypes.includes(line.lineType)) {
      errors.push(`${lineLabel}: סוג שורה לא תקין.`);
    }

    if (line.lineType === "סטנדרטי" && !airtableRecordIdPattern.test(line.productId ?? "")) {
      errors.push(`${lineLabel}: שורת סטנדרטי חייבת מוצר.`);
    }

    if (line.lineType !== "סטנדרטי" && !line.description) {
      errors.push(`${lineLabel}: שורת ${line.lineType} חייבת תיאור.`);
    }

    if (typeof line.quantity !== "number" || line.quantity <= 0) {
      errors.push(`${lineLabel}: כמות חייבת להיות גדולה מ-0.`);
    }

    if (typeof line.unitPrice !== "number" || line.unitPrice < 0) {
      errors.push(`${lineLabel}: מחיר יחידה חייב להיות 0 או יותר.`);
    }

    if (
      line.discountPercent !== null &&
      (typeof line.discountPercent !== "number" ||
        line.discountPercent < 0 ||
        line.discountPercent > 100)
    ) {
      errors.push(`${lineLabel}: הנחה חייבת להיות בין 0 ל-100.`);
    }
  });

  return {
    errors,
    normalized: {
      customerName,
      phone,
      address,
      leadSource,
      notes,
      lines,
    },
  };
}

function quoteFields(input: ReturnType<typeof validateInput>["normalized"]) {
  const fields: CreatedQuoteFields = {
    [airtableSchema.fields.quotes.customerName]: input.customerName,
    [airtableSchema.fields.quotes.phone]: input.phone,
  };

  if (input.address) {
    fields[airtableSchema.fields.quotes.address] = input.address;
  }

  if (input.leadSource) {
    fields[airtableSchema.fields.quotes.leadSource] = input.leadSource;
  }

  if (input.notes) {
    fields[airtableSchema.fields.quotes.notes] = input.notes;
  }

  return fields;
}

function documentLineFields(
  quoteId: string,
  line: ReturnType<typeof normalizeLine>,
) {
  const description =
    line.description ??
    (line.lineType === "סטנדרטי" ? "מוצר סטנדרטי" : line.lineType);
  const fields: CreatedDocumentLineFields = {
    [airtableSchema.fields.documentLines.description]: description,
    [airtableSchema.fields.documentLines.lineType]: line.lineType,
    [airtableSchema.fields.documentLines.quote]: [quoteId],
    [airtableSchema.fields.documentLines.quantity]: line.quantity ?? 0,
    [airtableSchema.fields.documentLines.unitPrice]: line.unitPrice ?? 0,
    [airtableSchema.fields.documentLines.source]: documentLineSourceFromApp,
    [airtableSchema.fields.documentLines.lineStatus]: activeDocumentLineStatus,
  };

  if (line.lineType === "סטנדרטי" && line.productId) {
    fields[airtableSchema.fields.documentLines.product] = [line.productId];
  }

  if (line.discountPercent !== null && line.discountPercent > 0) {
    fields[airtableSchema.fields.documentLines.discountPercent] =
      line.discountPercent / 100;
  }

  return fields;
}

export async function createQuoteWithDocumentLines(
  input: CreateQuoteWithDocumentLinesInput,
): Promise<CreateQuoteWithDocumentLinesResult> {
  const validation = validateInput(input);

  if (validation.errors.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור הצעת מחיר.",
      errors: validation.errors,
    };
  }

  let quoteId: string | null = null;

  try {
    const quote = await createRecord<CreatedQuoteFields>(
      airtableSchema.tables.quotes,
      quoteFields(validation.normalized),
    );
    quoteId = quote.id;

    const documentLineRecords = validation.normalized.lines.map((line) => ({
      fields: documentLineFields(quote.id, line),
    }));
    const documentLines = await createRecords<CreatedDocumentLineFields>(
      airtableSchema.tables.documentLines,
      documentLineRecords,
    );

    return {
      ok: true,
      message: "הצעת המחיר ושורות המסמך נוצרו בהצלחה.",
      quoteId: quote.id,
      documentLineCount: documentLines.length,
    };
  } catch (error) {
    if (quoteId) {
      try {
        await deleteRecord(airtableSchema.tables.quotes, quoteId);
      } catch {
        return {
          ok: false,
          message:
            "יצירת שורות המסמך נכשלה, וגם מחיקת הצעת המחיר החדשה נכשלה.",
          errors: [
            error instanceof Error ? error.message : "שגיאה לא ידועה.",
          ],
          quoteId,
        };
      }
    }

    return {
      ok: false,
      message: "יצירת הצעת המחיר נכשלה.",
      errors: [error instanceof Error ? error.message : "שגיאה לא ידועה."],
    };
  }
}
