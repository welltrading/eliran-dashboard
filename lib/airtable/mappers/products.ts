import "server-only";
import type { Product } from "@/lib/types";
import type { RawProductFields } from "../raw-types";
import { numberValue } from "./shared";

type RawRecord = {
  id: string;
  fields: RawProductFields;
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

export function mapProduct(record: RawRecord): Product {
  const selectLabel =
    nullableTextValue(record.fields.fldhnlxw7qtgFIHUc) ??
    nullableTextValue(record.fields.flddMBY4tu0y0TR1t) ??
    nullableTextValue(record.fields.fld7oDVwD2TD3960b) ??
    record.id;

  return {
    id: record.id,
    selectLabel,
    fullName: nullableTextValue(record.fields.flddMBY4tu0y0TR1t),
    baseName: nullableTextValue(record.fields.fld7oDVwD2TD3960b),
    baseModel: nullableTextValue(record.fields.fldldbeNRfgk6jrYA),
    size: nullableTextValue(record.fields.fldygZqbnX3OknW9b),
    glassType: nullableTextValue(record.fields.fldsl5TQHXUfg3EEH),
    hardwareColor: nullableTextValue(record.fields.fldZQxtBcT4c324xc),
    height: nullableTextValue(record.fields.fldUdDB11R6kXBSPn),
    price: numberValue(record.fields.fldrwR6l60DWTwQhF),
    stockDisplay: nullableTextValue(record.fields.fldRlIlTLpDDR7cBl),
  };
}
