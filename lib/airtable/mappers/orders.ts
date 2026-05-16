import "server-only";
import type { Order, OrderType } from "@/lib/types";
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
  return normalized === "ייצור אישי" ? "ייצור אישי" : "סטנדרטי";
}

export function mapOrder(record: RawRecord): Order {
  return {
    id: record.id,
    orderNumber: textValue(record.fields.fldDrP4MqsxV6EtJd),
    customerName: textValue(record.fields.fldZEobEKEQtMtoGV),
    phone: nullableTextValue(record.fields.fldk7OdnVLITahJxd) || nullableTextValue(record.fields.fld5bh56XRJGJhrsz),
    orderType: orderTypeValue(record.fields.flduurO6CcPQx6oya),
    status: textValue(record.fields.fldwvbnGd8e3PAU7d),
    createdAt: nullableTextValue(record.fields.flde2no9Qoof141vN),
    totalPrice: numberValue(record.fields.flddZQjojnGZeZ5By),
    easyCountDocumentNumber: nullableTextValue(record.fields.fldoXRciteMB9WdfP),
    easyCountDocumentUrl: urlValue(record.fields.fld9OEARVSvYDuEdR),
    shortNotes: nullableTextValue(record.fields.fldFRK1Kz26jE99xR),
    orderLineIds: Array.isArray(record.fields.fldIJzxGrwPaDNACs)
      ? record.fields.fldIJzxGrwPaDNACs.filter((item): item is string => typeof item === "string")
      : [],
    sendStatus: textValue(record.fields.fldws1tElgJlhMLR7) || null,
  };
}
