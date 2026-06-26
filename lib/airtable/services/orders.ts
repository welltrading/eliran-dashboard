import "server-only";
import type {
  CustomProductionStatus,
  DocumentLine,
  Order,
  OrderType,
} from "@/lib/types";
import { selectRecords } from "../client";
import { mapOrder } from "../mappers/orders";
import type { RawOrderFields, RawTaskFields } from "../raw-types";
import { airtableSchema } from "../schema";
import { airtableTables } from "../tables";
import { createRecord, deleteRecord, updateRecord } from "../write-client";
import { getDocumentLines } from "./document-lines";
import { getOrderCreationRequests } from "./order-creation-requests";

export type StandaloneOrderLineType =
  | "סטנדרטי"
  | "ייצור אישי"
  | "מדידה"
  | "עבודה / התקנה"
  | "פירוק"
  | "תוספת";

export type CreateStandaloneOrderLineInput = {
  lineType: StandaloneOrderLineType;
  productId?: string | null;
  description?: string | null;
  quantity: string | number | null;
  unitPrice: string | number | null;
  exitLocation?: "חנות" | "מחסן" | null;
};

export type CreateStandaloneOrderInput = {
  customerName: string;
  phone: string;
  address: string;
  paymentMode: string | null;
  paymentMethod: string | null;
  orderStatus: string | null;
  notes: string | null;
  lines: CreateStandaloneOrderLineInput[];
};

export type UpdateCustomProductionInput = {
  orderId: string;
  customProductionStatus: CustomProductionStatus | null;
  finalProductionMeasurements: string | null;
  sentToFactory: boolean;
  readyAtFactory: boolean;
};

export type OrderInvoiceTriggerStage = "first" | "final_40";

export type RequestOrderInvoiceTriggerInput = {
  orderId: string;
  invoiceStage: OrderInvoiceTriggerStage;
};

type CreatedOrderFields = {
  fld5tEZDfCloihZh6?: string;
  fldBeIA5vZa5M0TXK?: string;
  fldlnJJUi8s3jTrBW?: string;
  flduurO6CcPQx6oya?: string;
  fldwvbnGd8e3PAU7d?: string;
  fldFRK1Kz26jE99xR?: string;
  fldMXnAf7Pzg5Vc9F?: string;
  fldPN0eZPJuSJSh8o?: string;
  fldUealfvxq803w4h?: string;
};

type CreatedDocumentLineFields = {
  fldc33QppEyN8Yaxq?: string;
  fldAoGQVj0sylIUAr: string;
  fldLfzqMk98VZmts3: string[];
  fld9OqOt6TCFsaHPW?: string[];
  fldaxQ0Ko91cTOTBb: number;
  fldDTYi0DZyEplom6: number;
  fldPbgcN4NvRtRMgp?: string;
  fldsTPKtaw1AYHN2A: string;
  fld5o465AG04fQaxi: string;
};

type UpdatedCustomProductionFields = {
  fldeKIQJg3CYLFLoS?: CustomProductionStatus | null;
  fldt9k7oNeFWYX37V?: string | null;
  fld5p9BH4axVPzKwV?: boolean;
  fldtpYU0EOhDmLiD8?: boolean;
};

type UpdatedOrderInvoiceTriggerFields = {
  fldUHtJ82z3U2eG6W?: true;
  fld3R8AuoS5NGj8uK?: true;
};

type MinimalTaskRecord = {
  id: string;
  fields: Pick<
    RawTaskFields,
    "fldJQBgJQDdtQFvML" | "fldAP5bP6n8okIqec" | "fld00gbAzyZVvDWOt"
  >;
};

const airtableRecordIdPattern = /^rec[A-Za-z0-9]{14}$/;
const allowedOrderTypes: OrderType[] = ["סטנדרטי", "ייצור אישי", "מעורב"];
const orderStatuses = [
  "חדש",
  "ממתין למדידה",
  "אחרי מדידה",
  "ממתין לאישור",
  "ממתין לתשלום",
  "הוזמן מהמפעל-ביצור",
  "מוכן להתקנה",
  "הותקן",
  "סגור",
  "לתיאום התקנה",
  "הומרה להזמנה",
  "בוטל",
  "ממתין לשרטוטים",
  "שרטוטים מוכנים",
];
const paymentMethods = ["העברה בנקאית", "אשראי", "מזומן", "ביט", "פייבוקס"];
const paymentModes = ["מקדמה 60%", "תשלום מלא"];
const standaloneLineTypes: StandaloneOrderLineType[] = [
  "סטנדרטי",
  "ייצור אישי",
  "מדידה",
  "עבודה / התקנה",
  "פירוק",
  "תוספת",
];
const standardExitLocations = ["חנות", "מחסן"];
const documentLineSourceFromApp = "נוצרה באפליקציה";
const activeDocumentLineStatus = "פעילה";
const customProductionStatuses: CustomProductionStatus[] = [
  "ממתין למדידה",
  "מדידה תואמה",
  "מדידה בוצעה",
  "ממתין לשרטוטים",
  "שרטוטים מוכנים",
  "נשלח למפעל",
  "מוכן במפעל",
  "התקנה תואמה",
  "הותקן",
];

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

function textValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    value &&
    typeof value === "object" &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return value.name.trim();
  }

  return "";
}

function booleanValue(value: unknown) {
  return value === true;
}

function linkedRecordIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isOpenLinkedTask(task: MinimalTaskRecord) {
  return textValue(task.fields.fldAP5bP6n8okIqec) !== "בוצע" &&
    !booleanValue(task.fields.fld00gbAzyZVvDWOt);
}

function buildOpenTaskCountByOrderId(tasks: MinimalTaskRecord[]) {
  const counts = new Map<string, number>();

  tasks.forEach((task) => {
    if (!isOpenLinkedTask(task)) {
      return;
    }

    linkedRecordIds(task.fields.fldJQBgJQDdtQFvML).forEach((orderId) => {
      counts.set(orderId, (counts.get(orderId) ?? 0) + 1);
    });
  });

  return counts;
}

function groupDocumentLinesByOrderId(documentLines: DocumentLine[]) {
  const linesByOrderId = new Map<string, DocumentLine[]>();

  documentLines.forEach((line) => {
    line.orderIds.forEach((orderId) => {
      const existingLines = linesByOrderId.get(orderId) ?? [];
      existingLines.push(line);
      linesByOrderId.set(orderId, existingLines);
    });
  });

  return linesByOrderId;
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

function normalizeLine(line: CreateStandaloneOrderLineInput) {
  return {
    lineType: normalizedText(line.lineType) as StandaloneOrderLineType,
    productId: normalizedText(line.productId) || null,
    description: normalizedText(line.description) || null,
    quantity: normalizeOptionalNumber(line.quantity),
    unitPrice: normalizeOptionalNumber(line.unitPrice),
    exitLocation: normalizeSelectValue(line.exitLocation, standardExitLocations),
  };
}

function normalizeInput(input: CreateStandaloneOrderInput) {
  const paymentMode = normalizeSelectValue(input.paymentMode, paymentModes);

  return {
    customerName: normalizedText(input.customerName),
    phone: normalizedText(input.phone),
    address: normalizedText(input.address),
    orderStatus: normalizeSelectValue(input.orderStatus, orderStatuses) ?? "חדש",
    paymentMode,
    paymentMethod: normalizeSelectValue(input.paymentMethod, paymentMethods),
    notes: normalizedText(input.notes) || null,
    lines: input.lines.map(normalizeLine),
  };
}

function orderTypeFromLines(lines: Array<ReturnType<typeof normalizeLine>>): OrderType {
  const hasStandard = lines.some((line) => line.lineType === "סטנדרטי");
  const hasNonStandard = lines.some((line) => line.lineType !== "סטנדרטי");

  if (hasStandard && hasNonStandard) {
    return "מעורב";
  }

  return hasStandard ? "סטנדרטי" : "ייצור אישי";
}

function validateInput(input: ReturnType<typeof normalizeInput>) {
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

  if (!input.orderStatus) {
    errors.push("סטטוס הזמנה לא תקין.");
  }

  if (!input.paymentMode) {
    errors.push("יש לבחור תשלום מלא או מקדמה 60%.");
  }


  if (!input.paymentMethod) {
    errors.push("יש לבחור אמצעי תשלום.");
  }

  if (input.lines.length === 0) {
    errors.push("יש להוסיף לפחות שורת מסמך אחת.");
  }

  input.lines.forEach((line, index) => {
    const lineLabel = `שורה ${index + 1}`;

    if (!standaloneLineTypes.includes(line.lineType)) {
      errors.push(`${lineLabel}: סוג שורה לא תקין.`);
    }

    if (line.lineType === "סטנדרטי" && !airtableRecordIdPattern.test(line.productId ?? "")) {
      errors.push(`${lineLabel}: שורת סטנדרטי חייבת מוצר.`);
    }

    if (line.lineType !== "סטנדרטי" && !line.description) {
      errors.push(`${lineLabel}: שורה לא סטנדרטית חייבת תיאור.`);
    }

    if (typeof line.quantity !== "number" || line.quantity <= 0) {
      errors.push(`${lineLabel}: כמות חייבת להיות גדולה מ-0.`);
    }

    if (typeof line.unitPrice !== "number" || line.unitPrice < 0) {
      errors.push(`${lineLabel}: מחיר יחידה חייב להיות 0 או יותר.`);
    }

    if (line.lineType === "סטנדרטי" && !line.exitLocation) {
      errors.push(`${lineLabel}: מיקום יציאה הוא שדה חובה לשורה סטנדרטית.`);
    }

    if (line.lineType !== "סטנדרטי" && line.exitLocation) {
      errors.push(`${lineLabel}: מיקום יציאה מותר רק לשורה סטנדרטית.`);
    }
  });

  const orderType = input.lines.length > 0 ? orderTypeFromLines(input.lines) : null;

  if (orderType && !allowedOrderTypes.includes(orderType)) {
    errors.push("סוג הזמנה מחושב אינו תקין.");
  }

  return errors;
}

function hasFirstInvoiceDocument(order: Order) {
  return Boolean(
    order.easyCountDocumentId ||
      order.easyCountDocumentNumber ||
      order.easyCountDocumentUrl,
  );
}

function hasFinalInvoiceDocument(order: Order) {
  return Boolean(
    order.easyCountFinalDocumentId ||
      order.easyCountFinalDocumentNumber ||
      order.easyCountFinalDocumentUrl,
  );
}

function isFullPaymentOrder(order: Order) {
  return order.paymentMode === "תשלום מלא";
}

function isAdvancePaymentOrder(order: Order) {
  return order.paymentMode === "מקדמה 60%";
}

function hasLinkedDocumentLines(order: Order) {
  return order.documentLineRecordIds.length > 0 || order.documentLines.length > 0;
}

function validateOrderInvoiceTrigger(
  order: Order,
  invoiceStage: OrderInvoiceTriggerStage,
) {
  const errors: string[] = [];

  if (!hasLinkedDocumentLines(order)) {
    errors.push("להזמנה אין שורות מסמך מקושרות.");
  }

  if (!isFullPaymentOrder(order) && !isAdvancePaymentOrder(order)) {
    errors.push("יש לעדכן בהזמנה תשלום מלא או מקדמה 60%.");
  }

  if (!order.paymentMethod) {
    errors.push("יש לעדכן אמצעי תשלום לפני הפקת חשבונית.");
  }

  if (!Number.isFinite(order.totalByDocumentLinesField) || order.totalByDocumentLinesField <= 0) {
    errors.push("סה״כ לפי שורות מסמך חסר או לא תקין.");
  }

  if (invoiceStage === "first") {
    if (hasFirstInvoiceDocument(order)) {
      errors.push("כבר קיימת חשבונית להזמנה.");
    }

    if (order.invoiceReceiptRequested && !hasFirstInvoiceDocument(order)) {
      errors.push("בקשת החשבונית כבר נשלחה וממתינה לעדכון מאוטומציית Airtable.");
    }

    const firstInvoiceAmount = isFullPaymentOrder(order)
      ? order.totalByDocumentLinesField
      : order.advance60ByDocumentLinesField;

    if (!Number.isFinite(firstInvoiceAmount) || firstInvoiceAmount <= 0) {
      errors.push(
        isFullPaymentOrder(order)
          ? "סכום התשלום המלא לפי שורות מסמך חסר או לא תקין."
          : "סכום מקדמה 60% לפי שורות מסמך חסר או לא תקין.",
      );
    }
  }

  if (invoiceStage === "final_40") {
    if (!isAdvancePaymentOrder(order)) {
      errors.push("חשבונית יתרה זמינה רק להזמנה עם מקדמה 60%.");
    }

    if (!hasFirstInvoiceDocument(order)) {
      errors.push("יש להפיק חשבונית ראשונה לפני חשבונית יתרה.");
    }

    if (hasFinalInvoiceDocument(order)) {
      errors.push("כבר קיימת חשבונית יתרה להזמנה.");
    }

    if (order.finalInvoiceReceiptRequested && !hasFinalInvoiceDocument(order)) {
      errors.push("בקשת חשבונית היתרה כבר נשלחה וממתינה לעדכון מאוטומציית Airtable.");
    }

    if (
      !Number.isFinite(order.balance40ByDocumentLinesField) ||
      order.balance40ByDocumentLinesField <= 0
    ) {
      errors.push("יתרת תשלום 40% לפי שורות מסמך חסרה או לא תקינה.");
    }
  }

  return errors;
}

function documentLineFields(
  orderId: string,
  line: ReturnType<typeof normalizeLine>,
) {
  const fields: CreatedDocumentLineFields = {
    [airtableSchema.fields.documentLines.lineType]: line.lineType,
    [airtableSchema.fields.documentLines.order]: [orderId],
    [airtableSchema.fields.documentLines.quantity]: line.quantity ?? 0,
    [airtableSchema.fields.documentLines.unitPrice]: line.unitPrice ?? 0,
    [airtableSchema.fields.documentLines.source]: documentLineSourceFromApp,
    [airtableSchema.fields.documentLines.lineStatus]: activeDocumentLineStatus,
  };

  if (line.lineType === "סטנדרטי") {
    if (line.productId) {
      fields[airtableSchema.fields.documentLines.product] = [line.productId];
    }
    fields[airtableSchema.fields.documentLines.exitLocation] =
      line.exitLocation ?? undefined;
    return fields;
  }

  fields[airtableSchema.fields.documentLines.description] =
    line.description ?? line.lineType;
  return fields;
}

export async function getOrders() {
  const [records, taskRecords, documentLines, orderCreationRequests] = await Promise.all([
    selectRecords<RawOrderFields>(airtableTables.orders, {
      returnFieldsByFieldId: true,
    }),
    selectRecords<MinimalTaskRecord["fields"]>(airtableTables.tasks, {
      fields: ["fldJQBgJQDdtQFvML", "fldAP5bP6n8okIqec", "fld00gbAzyZVvDWOt"],
      returnFieldsByFieldId: true,
    }),
    getDocumentLines(),
    getOrderCreationRequests(),
  ]);
  const openTaskCountByOrderId = buildOpenTaskCountByOrderId(taskRecords);
  const linesByOrderId = groupDocumentLinesByOrderId(documentLines);
  const requestsByCreatedOrderId = new Map(
    records.map((record) => [
      record.id,
      orderCreationRequests.filter((request) =>
        request.createdOrderIds.includes(record.id),
      ),
    ]),
  );

  return records
    .map((record) => ({
      ...mapOrder(
        record,
        linesByOrderId.get(record.id) ?? [],
        requestsByCreatedOrderId.get(record.id) ?? [],
      ),
      openTaskCount: openTaskCountByOrderId.get(record.id) ?? 0,
    }))
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

export async function getOrderById(orderId: string) {
  const normalizedOrderId = orderId.trim();

  if (!airtableRecordIdPattern.test(normalizedOrderId)) {
    return null;
  }

  const [records, documentLines, orderCreationRequests] = await Promise.all([
    selectRecords<RawOrderFields>(airtableTables.orders, {
      filterByFormula: `RECORD_ID() = '${normalizedOrderId}'`,
      returnFieldsByFieldId: true,
      pageSize: 1,
    }),
    getDocumentLines(),
    getOrderCreationRequests(),
  ]);
  const [record] = records;

  if (!record) {
    return null;
  }

  return mapOrder(
    record,
    documentLines.filter((line) => line.orderIds.includes(normalizedOrderId)),
    orderCreationRequests.filter((request) =>
      request.createdOrderIds.includes(normalizedOrderId),
    ),
  );
}

export async function requestOrderInvoiceTrigger(
  input: RequestOrderInvoiceTriggerInput,
) {
  const orderId = input.orderId.trim();
  const errors: string[] = [];

  if (!airtableRecordIdPattern.test(orderId)) {
    errors.push("חסר מזהה הזמנה תקין.");
  }

  if (input.invoiceStage !== "first" && input.invoiceStage !== "final_40") {
    errors.push("סוג החשבונית אינו תקין.");
  }

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "לא ניתן לשלוח בקשת חשבונית.",
      errors,
    };
  }

  const order = await getOrderById(orderId);

  if (!order) {
    return {
      ok: false as const,
      message: "לא נמצאה הזמנה מתאימה.",
      errors: ["יש לוודא שמזהה ההזמנה קיים ב-Airtable."],
    };
  }

  const validationErrors = validateOrderInvoiceTrigger(order, input.invoiceStage);

  if (validationErrors.length > 0) {
    return {
      ok: false as const,
      message: "לא ניתן לשלוח בקשת חשבונית.",
      errors: validationErrors,
    };
  }

  const triggerField =
    input.invoiceStage === "final_40"
      ? airtableSchema.fields.orders.finalInvoiceTrigger
      : airtableSchema.fields.orders.firstInvoiceTrigger;

  try {
    await updateRecord<UpdatedOrderInvoiceTriggerFields>(airtableTables.orders, orderId, {
      [triggerField]: true,
    });

    return {
      ok: true as const,
      message:
        input.invoiceStage === "final_40"
          ? "בקשת חשבונית היתרה נשלחה לאוטומציית Airtable."
          : "בקשת החשבונית נשלחה לאוטומציית Airtable.",
      orderId,
      updatedFieldId: triggerField,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "עדכון שדה הפקת החשבונית ב-Airtable נכשל.",
      errors: [
        error instanceof Error
          ? error.message
          : "אירעה שגיאה לא צפויה בעת עדכון ההזמנה.",
      ],
    };
  }
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

  const orderType = orderTypeFromLines(normalizedInput.lines);
  const fields: CreatedOrderFields = {
    [airtableSchema.fields.orders.manualCustomerName]: normalizedInput.customerName,
    [airtableSchema.fields.orders.manualPhone]: normalizedInput.phone,
    [airtableSchema.fields.orders.manualAddress]: normalizedInput.address,
    [airtableSchema.fields.orders.orderType]: orderType,
    [airtableSchema.fields.orders.status]: normalizedInput.orderStatus,
    [airtableSchema.fields.orders.paymentMode]: normalizedInput.paymentMode ?? undefined,
    [airtableSchema.fields.orders.paymentMethod]:
      normalizedInput.paymentMethod ?? undefined,
    [airtableSchema.fields.orders.creationSource]: "Dashboard",
  };

  if (normalizedInput.notes) {
    fields[airtableSchema.fields.orders.notes] = normalizedInput.notes;
  }

  let orderId: string | null = null;
  const createdDocumentLineIds: string[] = [];

  try {
    const createdOrder = await createRecord<CreatedOrderFields>(
      airtableSchema.tables.orders,
      fields,
    );
    orderId = createdOrder.id;

    for (const line of normalizedInput.lines) {
      const documentLine = await createRecord<CreatedDocumentLineFields>(
        airtableSchema.tables.documentLines,
        documentLineFields(createdOrder.id, line),
      );
      createdDocumentLineIds.push(documentLine.id);
    }

    return {
      ok: true as const,
      message: "ההזמנה ושורות המסמך נוצרו בהצלחה.",
      orderId: createdOrder.id,
      documentLineCount: createdDocumentLineIds.length,
    };
  } catch (error) {
    if (orderId) {
      const deletedDocumentLineIds: string[] = [];
      const rollbackErrors: string[] = [];

      for (const documentLineId of [...createdDocumentLineIds].reverse()) {
        try {
          await deleteRecord(airtableSchema.tables.documentLines, documentLineId);
          deletedDocumentLineIds.push(documentLineId);
        } catch (rollbackError) {
          rollbackErrors.push(
            `מחיקת שורת מסמך ${documentLineId} נכשלה: ${
              rollbackError instanceof Error
                ? rollbackError.message
                : "שגיאה לא ידועה."
            }`,
          );
        }
      }

      let deletedOrderId: string | null = null;
      try {
        await deleteRecord(airtableSchema.tables.orders, orderId);
        deletedOrderId = orderId;
      } catch (rollbackError) {
        rollbackErrors.push(
          `מחיקת הזמנה ${orderId} נכשלה: ${
            rollbackError instanceof Error
              ? rollbackError.message
              : "שגיאה לא ידועה."
          }`,
        );
      }

      if (rollbackErrors.length > 0) {
        return {
          ok: false as const,
          message:
            "יצירת שורות המסמך נכשלה, וגם ה-rollback לא הושלם במלואו.",
          errors: [
            error instanceof Error ? error.message : "שגיאה לא ידועה.",
            `Order record id: ${orderId}`,
            `Document line record ids שנוצרו: ${
              createdDocumentLineIds.length > 0
                ? createdDocumentLineIds.join(", ")
                : "אין"
            }`,
            `Document line record ids שנמחקו: ${
              deletedDocumentLineIds.length > 0
                ? deletedDocumentLineIds.join(", ")
                : "אין"
            }`,
            `Order נמחק: ${deletedOrderId ?? "לא"}`,
            ...rollbackErrors,
          ],
          orderId,
          documentLineIds: createdDocumentLineIds,
          deletedDocumentLineIds,
          deletedOrderId,
        };
      }

      return {
        ok: false as const,
        message:
          "יצירת שורות המסמך נכשלה. ההזמנה ושורות המסמך שנוצרו נמחקו.",
        errors: [
          error instanceof Error ? error.message : "שגיאה לא ידועה.",
          `Order record id שנמחק: ${orderId}`,
          `Document line record ids שנמחקו: ${
            deletedDocumentLineIds.length > 0
              ? deletedDocumentLineIds.join(", ")
              : "אין"
          }`,
        ],
        orderId,
        documentLineIds: createdDocumentLineIds,
        deletedDocumentLineIds,
        deletedOrderId,
      };
    }

    return {
      ok: false as const,
      message: "יצירת ההזמנה נכשלה.",
      errors: [error instanceof Error ? error.message : "שגיאה לא ידועה."],
    };
  }
}

export async function updateCustomProduction(input: UpdateCustomProductionInput) {
  const orderId = input.orderId.trim();
  const finalProductionMeasurements =
    normalizedText(input.finalProductionMeasurements) || null;
  const customProductionStatus = input.customProductionStatus;
  const errors: string[] = [];

  if (!/^rec[A-Za-z0-9]{14}$/.test(orderId)) {
    errors.push("חסר מזהה הזמנה תקין.");
  }

  if (
    customProductionStatus &&
    !customProductionStatuses.includes(customProductionStatus)
  ) {
    errors.push("סטטוס ייצור אישי אינו תקין.");
  }

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "יש לתקן את השדות לפני שמירת הייצור האישי.",
      errors,
    };
  }

  try {
    await updateRecord<UpdatedCustomProductionFields>(airtableTables.orders, orderId, {
      fldeKIQJg3CYLFLoS: customProductionStatus,
      fldt9k7oNeFWYX37V: finalProductionMeasurements,
      fld5p9BH4axVPzKwV: input.sentToFactory === true,
      fldtpYU0EOhDmLiD8: input.readyAtFactory === true,
    });

    return {
      ok: true as const,
      message: "פרטי הייצור האישי נשמרו בהצלחה.",
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "עדכון הייצור האישי ב-Airtable נכשל.",
      errors: [
        error instanceof Error
          ? error.message
          : "אירעה שגיאה לא צפויה בעת עדכון הייצור האישי.",
      ],
    };
  }
}
