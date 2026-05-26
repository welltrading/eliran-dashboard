import "server-only";
import type { OrderStatus, OrderType } from "@/lib/types";
import { selectRecords } from "../client";
import { mapOrder } from "../mappers/orders";
import type { RawOrderFields } from "../raw-types";
import { airtableTables } from "../tables";
import { createRecord } from "../write-client";

export type CreateStandaloneOrderInput = {
  customerName: string;
  phone: string;
  address: string;
  orderType: OrderType;
  orderStatus: OrderStatus;
  productDescription: string | null;
  quantity: string | number | null;
  width: string | number | null;
  depth: string | number | null;
  height: string | number | null;
  totalPrice: string | number | null;
  paymentMode: string | null;
  measurementRequired: string | null;
  dismantlingOption: string | null;
  glassType: string | null;
  hardwareColor: string | null;
  paymentMethod: string | null;
  paymentApproved: boolean;
  notes: string | null;
};

type CreatedOrderFields = {
  fldZEobEKEQtMtoGV?: string;
  fld5bh56XRJGJhrsz?: string;
  fldzNnG3a9uojQPyO?: string;
  flduurO6CcPQx6oya?: string;
  fldwvbnGd8e3PAU7d?: string;
  fldFRK1Kz26jE99xR?: string;
  fldMXnAf7Pzg5Vc9F?: string;
  fldvuJBwo3Qb4ub7p?: string;
  flddmlzT9ZHk5spa1?: number;
  fldgdC7Zv9XWkaxqi?: number;
  fldLJITSyspOnKcZF?: number;
  fldAFUIPpQVOPcfNm?: number;
  fldcsD7TEjjYB6kz3?: number;
  fldPN0eZPJuSJSh8o?: string;
  fldoBnRqI3ZTZXorO?: number;
  fldOAbx5iIaFAihvt?: number;
  fldcx7cPuZH57bMg1?: string;
  fldGNc09zWTOcLc6s?: string;
  fld5Wn57UvhksY0Ax?: string;
  fldPBnhKedXDftVBJ?: string;
  fldUealfvxq803w4h?: string;
  fldBvprcQWNtsC6jt?: boolean;
};

const orderTypes: OrderType[] = ["סטנדרטי", "ייצור אישי"];
const orderStatuses: OrderStatus[] = [
  "חדשה",
  "בהכנה",
  "ממתינה לתשלום",
  "מוכנה להתקנה",
  "הושלמה",
  "בוטלה",
];
const airtableOrderStatusByUiStatus: Record<OrderStatus, string> = {
  חדשה: "חדש",
  בהכנה: "חדש",
  "ממתינה לתשלום": "ממתין לתשלום",
  "מוכנה להתקנה": "מוכן להתקנה",
  הושלמה: "סגור",
  בוטלה: "בוטל",
};
const measurementRequiredOptions = ["כן", "לא"];
const dismantlingOptions = ["נדרש פירוק", "לא נדרש פירוק"];
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
const paymentMethods = ["העברה בנקאית", "אשראי", "מזומן", "ביט", "פייבוקס"];
const paymentModes = ["מקדמה 60%", "תשלום מלא"];

function numericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedText(value: string | null | undefined) {
  return value?.trim() ?? "";
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
  const normalizedValue = normalizedText(value);
  return normalizedValue && allowedValues.includes(normalizedValue)
    ? normalizedValue
    : null;
}

function normalizeInput(input: CreateStandaloneOrderInput): CreateStandaloneOrderInput {
  return {
    customerName: normalizedText(input.customerName),
    phone: normalizedText(input.phone),
    address: normalizedText(input.address),
    orderType: input.orderType,
    orderStatus: input.orderStatus,
    productDescription: normalizedText(input.productDescription) || null,
    quantity: normalizeOptionalNumber(input.quantity),
    width: normalizeOptionalNumber(input.width),
    depth: normalizeOptionalNumber(input.depth),
    height: normalizeOptionalNumber(input.height),
    totalPrice: normalizeOptionalNumber(input.totalPrice),
    paymentMode: normalizeSelectValue(input.paymentMode, paymentModes),
    measurementRequired: normalizeSelectValue(
      input.measurementRequired,
      measurementRequiredOptions,
    ),
    dismantlingOption: normalizeSelectValue(
      input.dismantlingOption,
      dismantlingOptions,
    ),
    glassType: normalizeSelectValue(input.glassType, glassTypes),
    hardwareColor: normalizeSelectValue(input.hardwareColor, hardwareColors),
    paymentMethod: normalizeSelectValue(input.paymentMethod, paymentMethods),
    paymentApproved: input.paymentApproved === true,
    notes: normalizedText(input.notes) || null,
  };
}

function paymentAmounts(totalPrice: number, paymentMode: string) {
  if (paymentMode === "תשלום מלא") {
    return {
      advancePaymentAmount: totalPrice,
      remainingPaymentAmount: 0,
    };
  }

  return {
    advancePaymentAmount: totalPrice * 0.6,
    remainingPaymentAmount: totalPrice * 0.4,
  };
}

function validateInput(input: CreateStandaloneOrderInput) {
  const errors: string[] = [];

  if (!input.customerName) {
    errors.push("שם לקוח הוא שדה חובה.");
  }

  if (!input.phone) {
    errors.push("טלפון הוא שדה חובה.");
  }

  if (!input.address) {
    errors.push("כתובת היא שדה חובה.");
  }

  if (!orderTypes.includes(input.orderType)) {
    errors.push("סוג הזמנה לא תקין.");
  }

  if (!orderStatuses.includes(input.orderStatus)) {
    errors.push("סטטוס הזמנה לא תקין.");
  }

  if (typeof input.totalPrice === "number" && !input.paymentMode) {
    errors.push("יש לבחור תשלום מלא או מקדמה 60%.");
  }

  if (input.orderType === "ייצור אישי") {
    if (!input.productDescription) {
      errors.push("תיאור מוצר הוא שדה חובה בהזמנת ייצור אישי.");
    }

    if (typeof input.quantity !== "number" || input.quantity <= 0) {
      errors.push("כמות חייבת להיות גדולה מ-0.");
    }

    if (typeof input.width !== "number" || input.width <= 0) {
      errors.push("מידות לקוח רוחב חייב להיות גדול מ-0.");
    }

    if (typeof input.depth !== "number" || input.depth <= 0) {
      errors.push("מידות לקוח עומק חייב להיות גדול מ-0.");
    }

    if (typeof input.height !== "number" || input.height <= 0) {
      errors.push("גובה מקלחון חייב להיות גדול מ-0.");
    }

    if (typeof input.totalPrice !== "number" || input.totalPrice < 0) {
      errors.push("מחיר בשקלים חייב להיות 0 או יותר.");
    }

    if (!input.paymentMode) {
      errors.push("תשלום מלא / מקדמה 60% הוא שדה חובה.");
    }

    if (!input.measurementRequired) {
      errors.push("נדרשת מדידה הוא שדה חובה.");
    }

    if (!input.dismantlingOption) {
      errors.push("אפשרות פירוק היא שדה חובה.");
    }

    if (!input.glassType) {
      errors.push("סוג זכוכית הוא שדה חובה.");
    }

    if (!input.hardwareColor) {
      errors.push("צבע פרזול הוא שדה חובה.");
    }
  }

  return errors;
}

export async function getOrders() {
  const records = await selectRecords<RawOrderFields>(airtableTables.orders, {
    returnFieldsByFieldId: true,
  });

  return records
    .map(mapOrder)
    .sort((a, b) => {
      const orderNumberDiff =
        (numericValue(b.orderNumber) ?? Number.NEGATIVE_INFINITY) -
        (numericValue(a.orderNumber) ?? Number.NEGATIVE_INFINITY);

      if (orderNumberDiff !== 0) {
        return orderNumberDiff;
      }

      return (
        (timestampValue(b.createdAt) ?? Number.NEGATIVE_INFINITY) -
        (timestampValue(a.createdAt) ?? Number.NEGATIVE_INFINITY)
      );
    });
}

export async function createStandaloneOrder(input: CreateStandaloneOrderInput) {
  const normalizedInput = normalizeInput(input);
  const errors = validateInput(normalizedInput);

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "יש לתקן את השדות לפני יצירת ההזמנה.",
      errors,
    };
  }

  const fields: CreatedOrderFields = {
    fldZEobEKEQtMtoGV: normalizedInput.customerName,
    fld5bh56XRJGJhrsz: normalizedInput.phone,
    fldzNnG3a9uojQPyO: normalizedInput.address,
    flduurO6CcPQx6oya: normalizedInput.orderType,
    fldwvbnGd8e3PAU7d:
      airtableOrderStatusByUiStatus[normalizedInput.orderStatus],
    fldMXnAf7Pzg5Vc9F: "Dashboard",
  };

  if (normalizedInput.notes) {
    fields.fldFRK1Kz26jE99xR = normalizedInput.notes;
  }

  if (normalizedInput.paymentMethod) {
    fields.fldUealfvxq803w4h = normalizedInput.paymentMethod;
  }

  if (normalizedInput.paymentApproved) {
    fields.fldBvprcQWNtsC6jt = true;
  }

  if (
    typeof normalizedInput.totalPrice === "number" &&
    normalizedInput.paymentMode
  ) {
    const calculatedPayment = paymentAmounts(
      normalizedInput.totalPrice,
      normalizedInput.paymentMode,
    );

    fields.fldcsD7TEjjYB6kz3 = normalizedInput.totalPrice;
    fields.fldPN0eZPJuSJSh8o = normalizedInput.paymentMode;
    fields.fldoBnRqI3ZTZXorO = calculatedPayment.advancePaymentAmount;
    fields.fldOAbx5iIaFAihvt = calculatedPayment.remainingPaymentAmount;
  }

  if (normalizedInput.orderType === "ייצור אישי") {
    if (normalizedInput.productDescription) {
      fields.fldvuJBwo3Qb4ub7p = normalizedInput.productDescription;
    }

    if (typeof normalizedInput.quantity === "number") {
      fields.flddmlzT9ZHk5spa1 = normalizedInput.quantity;
    }

    if (typeof normalizedInput.width === "number") {
      fields.fldgdC7Zv9XWkaxqi = normalizedInput.width;
    }

    if (typeof normalizedInput.depth === "number") {
      fields.fldLJITSyspOnKcZF = normalizedInput.depth;
    }

    if (typeof normalizedInput.height === "number") {
      fields.fldAFUIPpQVOPcfNm = normalizedInput.height;
    }

    if (normalizedInput.measurementRequired) {
      fields.fldcx7cPuZH57bMg1 = normalizedInput.measurementRequired;
    }

    if (normalizedInput.dismantlingOption) {
      fields.fldGNc09zWTOcLc6s = normalizedInput.dismantlingOption;
    }

    if (normalizedInput.glassType) {
      fields.fld5Wn57UvhksY0Ax = normalizedInput.glassType;
    }

    if (normalizedInput.hardwareColor) {
      fields.fldPBnhKedXDftVBJ = normalizedInput.hardwareColor;
    }
  }

  try {
    const createdOrder = await createRecord<CreatedOrderFields>(
      airtableTables.orders,
      fields,
    );

    return {
      ok: true as const,
      message: "ההזמנה נוצרה בהצלחה. ניתן להוסיף שורות הזמנה בנפרד.",
      orderId: createdOrder.id,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "יצירת ההזמנה נכשלה.",
      errors: [error instanceof Error ? error.message : "שגיאה לא ידועה."],
    };
  }
}
