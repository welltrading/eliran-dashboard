import "server-only";
import type {
  AirtableAttachment,
  CustomProductionStatus,
  Order,
  OrderType,
} from "@/lib/types";
import type { RawOrderFields } from "../raw-types";
import { numberValue } from "./shared";

type RawRecord = {
  id: string;
  fields: RawOrderFields;
};

function textValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (
    value &&
    typeof value === "object" &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return value.name;
  }

  return "";
}

function nullableTextValue(value: unknown) {
  const normalized = textValue(value).trim();
  return normalized ? normalized : null;
}

function urlValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (
    value &&
    typeof value === "object" &&
    "url" in value &&
    typeof value.url === "string"
  ) {
    return value.url.trim() || null;
  }

  return null;
}

function orderTypeValue(value: unknown): OrderType {
  const normalized = textValue(value);
  if (normalized === "ייצור אישי" || normalized === "מעורב") {
    return normalized;
  }

  return "סטנדרטי";
}

function booleanValue(value: unknown) {
  return value === true;
}

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

function customProductionStatusValue(value: unknown) {
  const normalized = textValue(value);
  return customProductionStatuses.includes(normalized as CustomProductionStatus)
    ? (normalized as CustomProductionStatus)
    : null;
}

function attachmentValue(value: unknown): AirtableAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const id = "id" in item && typeof item.id === "string" ? item.id : "";
    const filename =
      "filename" in item && typeof item.filename === "string"
        ? item.filename.trim()
        : "";
    const url = "url" in item && typeof item.url === "string" ? item.url.trim() : "";

    return id && filename && url ? [{ id, filename, url }] : [];
  });
}

function linkedRecordIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function mapOrder(record: RawRecord): Order {
  const easyCountStatus = nullableTextValue(record.fields.fldws1tElgJlhMLR7);

  return {
    id: record.id,
    orderNumber: textValue(record.fields.fldDrP4MqsxV6EtJd),
    customerName: textValue(record.fields.fldZEobEKEQtMtoGV),
    phone: nullableTextValue(record.fields.fldk7OdnVLITahJxd) || nullableTextValue(record.fields.fld5bh56XRJGJhrsz),
    orderType: orderTypeValue(record.fields.flduurO6CcPQx6oya),
    status: textValue(record.fields.fldwvbnGd8e3PAU7d),
    createdAt: nullableTextValue(record.fields.flde2no9Qoof141vN),
    totalPrice: numberValue(record.fields.flddZQjojnGZeZ5By),
    paymentMode: nullableTextValue(record.fields.fldPN0eZPJuSJSh8o),
    advancePaymentAmount: numberValue(record.fields.fldoBnRqI3ZTZXorO),
    remainingPaymentAmount: numberValue(record.fields.fldOAbx5iIaFAihvt),
    easyCountDocumentId: nullableTextValue(record.fields.fldRZSAngZ2MzRg9v),
    easyCountDocumentNumber: nullableTextValue(record.fields.fldoXRciteMB9WdfP),
    easyCountDocumentUrl: urlValue(record.fields.fld9OEARVSvYDuEdR),
    easyCountStatus,
    easyCountError: nullableTextValue(record.fields.fldJlbQJWexlStXRn),
    easyCountFinalDocumentId: nullableTextValue(record.fields.flduY6TY8M5stl1rX),
    easyCountFinalDocumentNumber: nullableTextValue(record.fields.fldUYfYJE8EJC4CGq),
    easyCountFinalDocumentUrl: urlValue(record.fields.fldOwFIxHHujvMTfw),
    easyCountFinalStatus: nullableTextValue(record.fields.fldtE1r6tMMj28HNF),
    easyCountFinalError: nullableTextValue(record.fields.fldT6fSDKdVbhcPmw),
    invoiceReceiptRequested: booleanValue(record.fields.fldUHtJ82z3U2eG6W),
    shortNotes: nullableTextValue(record.fields.fldFRK1Kz26jE99xR),
    orderLineIds: Array.isArray(record.fields.fldIJzxGrwPaDNACs)
      ? record.fields.fldIJzxGrwPaDNACs.filter((item): item is string => typeof item === "string")
      : [],
    taskIds: linkedRecordIds(record.fields.fldEZ175gAwbH7vge),
    sendStatus: easyCountStatus,
    productDescription: nullableTextValue(record.fields.fldvuJBwo3Qb4ub7p),
    customProductionStatus: customProductionStatusValue(
      record.fields.fldeKIQJg3CYLFLoS,
    ),
    finalProductionMeasurements: nullableTextValue(record.fields.fldt9k7oNeFWYX37V),
    factoryDrawings: attachmentValue(record.fields.fldgWWu4EYvJXQuHC),
    sentToFactory: booleanValue(record.fields.fld5p9BH4axVPzKwV),
    sentToFactoryDate: nullableTextValue(record.fields.fldyJ3cRvlR9VTEWh),
    readyAtFactory: booleanValue(record.fields.fldtpYU0EOhDmLiD8),
    readyAtFactoryDate: nullableTextValue(record.fields.fldwyz5aHZ4KJtJ43),
  };
}
