import "server-only";
import type { OrderType } from "@/lib/types";
import { airtableTables } from "../tables";
import { createRecord, createRecords, deleteRecord, updateRecord } from "../write-client";
import { getQuoteById } from "./quotes";

type CreateOrderLineInput = {
  productId: string | null;
  description: string;
  width?: string | number | null;
  depth?: string | number | null;
  height?: string | number | null;
  glassType?: string | null;
  hardwareColor?: string | null;
  dismantlingOption?: string | null;
  measurementRequired?: string | null;
  quantity: number;
  totalPrice: number;
  location: string | null;
};

export type CreateOrderFromQuoteInput = {
  quoteId: string;
  customerName: string;
  phone: string;
  orderType: OrderType;
  orderStatus: string;
  shortNotes: string;
  lines: CreateOrderLineInput[];
};

type CreatedOrderFields = {
  fldZEobEKEQtMtoGV?: string;
  fld5bh56XRJGJhrsz?: string;
  flduurO6CcPQx6oya?: string;
  fldwvbnGd8e3PAU7d?: string;
  fldFRK1Kz26jE99xR?: string;
  fldBMMIAJoVpBDa8T?: string;
  fldMXnAf7Pzg5Vc9F?: string;
  fldZBzef2fD5yiVad?: string[];
  flddmlzT9ZHk5spa1?: number;
  fldq01o2TcYhhqwfm?: string;
  fldcsD7TEjjYB6kz3?: number;
  fldgdC7Zv9XWkaxqi?: number;
  fldLJITSyspOnKcZF?: number;
  fldAFUIPpQVOPcfNm?: number;
  fld5Wn57UvhksY0Ax?: string;
  fldPBnhKedXDftVBJ?: string;
  fldGNc09zWTOcLc6s?: string;
  fldcx7cPuZH57bMg1?: string;
  fldvuJBwo3Qb4ub7p?: string;
};

type CreatedOrderLineFields = {
  fldPxGffqlrfcYZIM?: string[];
  fldD2A7OjLTJP7qRj?: string;
  fldYnSRIPH7j9rpSn?: string[];
  fldDmFtYNN1uvoHqh?: string;
  fldr1hhLfgIDGxhHS?: string;
  fldhrAvwCw1grQHNI?: number;
  fldRcottFIlIX0r4F?: string;
  fldp4FofbLftwSYZ7?: number;
};

type UpdatedQuoteFields = {
  fldKNXfM18R4OtfGk?: string[];
};

const orderTypes: OrderType[] = ["סטנדרטי", "ייצור אישי"];
const uiOrderStatuses = ["חדשה", "בהכנה", "ממתינה לתשלום", "מוכנה להתקנה", "הושלמה", "בוטלה"];
const airtableOrderStatusByUiStatus: Record<string, string> = {
  חדשה: "חדש",
  בהכנה: "חדש",
  "ממתינה לתשלום": "ממתין לתשלום",
  "מוכנה להתקנה": "מוכן להתקנה",
  הושלמה: "סגור",
  בוטלה: "בוטל",
};
const leadSources = ["מדרג", "מקצוענים", "גוגל", "המלצה", "אחר"];
const glassTypes = [
  "גרניט",
  "זכוכית שקופה",
  "פסים",
  "שקופה",
  "ברונזה",
  "מושחר",
  "גלינה",
];
const hardwareColors = ["גרפיט", "לבן", "ניקל", "שחור", "זהב"];
const dismantlingOptions = ["נדרש פירוק", "לא נדרש פירוק"];
const measurementRequiredOptions = ["כן", "לא"];

function normalizedText(value: string) {
  return value.trim();
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value ? normalizedText(value) : "";
  return normalizedValue || null;
}

function normalizeOptionalNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

function normalizeSelectValue(
  value: string | null | undefined,
  allowedValues: string[],
) {
  const normalizedValue = normalizeOptionalText(value);
  return normalizedValue && allowedValues.includes(normalizedValue)
    ? normalizedValue
    : null;
}

function normalizeLine(line: CreateOrderLineInput): CreateOrderLineInput {
  return {
    description: normalizedText(line.description),
    productId: line.productId ? normalizedText(line.productId) : null,
    width: normalizeOptionalNumber(line.width),
    depth: normalizeOptionalNumber(line.depth),
    height: normalizeOptionalNumber(line.height),
    glassType: normalizeSelectValue(line.glassType, glassTypes),
    hardwareColor: normalizeSelectValue(line.hardwareColor, hardwareColors),
    dismantlingOption: normalizeSelectValue(
      line.dismantlingOption,
      dismantlingOptions,
    ),
    measurementRequired: normalizeSelectValue(
      line.measurementRequired,
      measurementRequiredOptions,
    ),
    quantity: Number(line.quantity),
    totalPrice: Number(line.totalPrice),
    location: line.location ? normalizedText(line.location) : null,
  };
}

function isPersistableLine(line: CreateOrderLineInput, orderType: OrderType) {
  const hasRequiredIdentity =
    orderType === "סטנדרטי"
      ? Boolean(line.productId)
      : normalizedText(line.description).length > 0;

  return (
    hasRequiredIdentity &&
    Number.isFinite(Number(line.quantity)) &&
    Number(line.quantity) > 0 &&
    Number.isFinite(Number(line.totalPrice)) &&
    Number(line.totalPrice) >= 0
  );
}

function normalizeInput(input: CreateOrderFromQuoteInput): CreateOrderFromQuoteInput {
  return {
    ...input,
    customerName: normalizedText(input.customerName),
    phone: normalizedText(input.phone),
    shortNotes: normalizedText(input.shortNotes),
    lines: input.lines
      .map(normalizeLine)
      .filter((line) => isPersistableLine(line, input.orderType)),
  };
}

function validateInput(input: CreateOrderFromQuoteInput) {
  const errors: string[] = [];

  if (!input.quoteId.trim()) {
    errors.push("חסרה הצעת מחיר.");
  }

  if (!normalizedText(input.customerName)) {
    errors.push("שם לקוח הוא שדה חובה.");
  }

  if (!normalizedText(input.phone)) {
    errors.push("טלפון הוא שדה חובה.");
  }

  if (!orderTypes.includes(input.orderType)) {
    errors.push("סוג הזמנה לא תקין.");
  }

  if (!uiOrderStatuses.includes(input.orderStatus)) {
    errors.push("סטטוס הזמנה לא תקין.");
  }

  if (input.lines.length === 0) {
    errors.push("נדרשת לפחות שורת הזמנה אחת.");
  }

  input.lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (input.orderType === "סטנדרטי" && !line.productId) {
      errors.push(`שורה ${lineNumber}: מוצר מהמלאי הוא שדה חובה בהזמנה סטנדרטית.`);
    }

    if (input.orderType === "ייצור אישי" && !normalizedText(line.description)) {
      errors.push(`שורה ${lineNumber}: תיאור הוא שדה חובה.`);
    }

    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      errors.push(`שורה ${lineNumber}: כמות חייבת להיות גדולה מ-0.`);
    }

    if (!Number.isFinite(line.totalPrice) || line.totalPrice < 0) {
      errors.push(`שורה ${lineNumber}: מחיר כולל חייב להיות 0 או יותר.`);
    }

    if (input.orderType === "סטנדרטי" && !line.location) {
      errors.push(`שורה ${lineNumber}: מיקום יציאה הוא שדה חובה בהזמנה סטנדרטית.`);
    }
  });

  return errors;
}

export async function createOrderFromQuote(input: CreateOrderFromQuoteInput) {
  const normalizedInput = normalizeInput(input);
  const errors = validateInput(normalizedInput);

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "יש לתקן את השדות לפני יצירת ההזמנה.",
      errors,
    };
  }

  const quote = await getQuoteById(normalizedInput.quoteId);

  if (!quote) {
    return {
      ok: false as const,
      message: "הצעת המחיר לא נמצאה.",
      errors: ["הצעת המחיר לא נמצאה."],
    };
  }

  if (quote.createdOrderIds.length > 0) {
    return {
      ok: false as const,
      message: "כבר נוצרה הזמנה מהצעת המחיר הזו.",
      errors: ["להצעת המחיר הזו כבר מקושרת הזמנה שנוצרה."],
    };
  }

  const orderFields: CreatedOrderFields = {
    fldZEobEKEQtMtoGV: normalizedInput.customerName,
    fld5bh56XRJGJhrsz: normalizedInput.phone,
    flduurO6CcPQx6oya: normalizedInput.orderType,
    fldwvbnGd8e3PAU7d: airtableOrderStatusByUiStatus[normalizedInput.orderStatus],
    fldMXnAf7Pzg5Vc9F: "Dashboard",
  };

  const shortNotes = normalizedInput.shortNotes;

  if (shortNotes) {
    orderFields.fldFRK1Kz26jE99xR = shortNotes;
  }

  if (quote.leadSource && leadSources.includes(quote.leadSource)) {
    orderFields.fldBMMIAJoVpBDa8T = quote.leadSource;
  }

  if (normalizedInput.orderType === "סטנדרטי") {
    const firstProductLine = normalizedInput.lines.find((line) => line.productId);

    if (firstProductLine?.productId) {
      orderFields.fldZBzef2fD5yiVad = [firstProductLine.productId];
      orderFields.flddmlzT9ZHk5spa1 = firstProductLine.quantity;
      orderFields.fldcsD7TEjjYB6kz3 = firstProductLine.totalPrice;

      if (firstProductLine.location) {
        orderFields.fldq01o2TcYhhqwfm = firstProductLine.location;
      }
    }
  }

  if (normalizedInput.orderType === "ייצור אישי") {
    const firstCustomLine = normalizedInput.lines.find((line) =>
      normalizedText(line.description),
    );

    if (firstCustomLine) {
      orderFields.flddmlzT9ZHk5spa1 = firstCustomLine.quantity;
      orderFields.fldcsD7TEjjYB6kz3 = firstCustomLine.totalPrice;
      orderFields.fldvuJBwo3Qb4ub7p = firstCustomLine.description;

      if (typeof firstCustomLine.width === "number") {
        orderFields.fldgdC7Zv9XWkaxqi = firstCustomLine.width;
      }

      if (typeof firstCustomLine.depth === "number") {
        orderFields.fldLJITSyspOnKcZF = firstCustomLine.depth;
      }

      if (typeof firstCustomLine.height === "number") {
        orderFields.fldAFUIPpQVOPcfNm = firstCustomLine.height;
      }

      if (firstCustomLine.glassType) {
        orderFields.fld5Wn57UvhksY0Ax = firstCustomLine.glassType;
      }

      if (firstCustomLine.hardwareColor) {
        orderFields.fldPBnhKedXDftVBJ = firstCustomLine.hardwareColor;
      }

      if (firstCustomLine.dismantlingOption) {
        orderFields.fldGNc09zWTOcLc6s = firstCustomLine.dismantlingOption;
      }

      if (firstCustomLine.measurementRequired) {
        orderFields.fldcx7cPuZH57bMg1 = firstCustomLine.measurementRequired;
      }
    }
  }

  const createdOrder = await createRecord<CreatedOrderFields>(
    airtableTables.orders,
    orderFields,
  );

  try {
    const lineType = normalizedInput.orderType === "ייצור אישי" ? "ייצור אישי" : "מוצר מהמלאי";
    const orderLineRecords = normalizedInput.lines.map((line) => {
      const fields: CreatedOrderLineFields = {
        fldPxGffqlrfcYZIM: [createdOrder.id],
        fldDmFtYNN1uvoHqh: lineType,
        fldhrAvwCw1grQHNI: line.quantity,
        fldp4FofbLftwSYZ7: line.totalPrice,
      };

      if (line.description) {
        fields.fldD2A7OjLTJP7qRj = line.description;
      }

      if (normalizedInput.orderType === "סטנדרטי" && line.productId) {
        fields.fldYnSRIPH7j9rpSn = [line.productId];
        fields.fldr1hhLfgIDGxhHS = "יציאה מהמלאי";
      }

      if (line.location) {
        fields.fldRcottFIlIX0r4F = line.location;
      }

      return { fields };
    });

    const createdLines = await createRecords<CreatedOrderLineFields>(
      airtableTables.orderLines,
      orderLineRecords,
    );

    try {
      await updateRecord<UpdatedQuoteFields>(airtableTables.quotes, quote.id, {
        fldKNXfM18R4OtfGk: [createdOrder.id],
      });
    } catch (error) {
      return {
        ok: false as const,
        message:
          "נוצרה הזמנה ושורות הזמנה, אך סימון הצעת המחיר כהזמנה שנוצרה נכשל.",
        errors: [
          error instanceof Error
            ? error.message
            : "עדכון הצעת המחיר עם ההזמנה שנוצרה נכשל.",
        ],
      };
    }

    return {
      ok: true as const,
      message: "ההזמנה ושורות ההזמנה נוצרו בהצלחה.",
      orderId: createdOrder.id,
      orderLineCount: createdLines.length,
    };
  } catch (error) {
    try {
      await deleteRecord(airtableTables.orders, createdOrder.id);
    } catch {
      return {
        ok: false as const,
        message:
          "נוצרה הזמנה אך יצירת השורות נכשלה. יש לבדוק את Airtable לפני ניסיון נוסף.",
        errors: [error instanceof Error ? error.message : "יצירת שורות ההזמנה נכשלה."],
      };
    }

    return {
      ok: false as const,
      message: "יצירת שורות ההזמנה נכשלה וההזמנה בוטלה.",
      errors: [error instanceof Error ? error.message : "יצירת שורות ההזמנה נכשלה."],
    };
  }
}
