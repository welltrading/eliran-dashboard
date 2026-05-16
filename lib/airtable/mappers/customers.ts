import "server-only";
import type { Customer } from "@/lib/types";
import type { RawCustomerFields } from "../raw-types";
import { nullableText, text } from "./shared";

type RawRecord = {
  id: string;
  fields: RawCustomerFields;
};

export function mapCustomer(record: RawRecord): Customer {
  return {
    id: record.id,
    name: text(record.fields["שם לקוח"]),
    phone: nullableText(record.fields.טלפון),
    email: nullableText(record.fields.אימייל),
    address: nullableText(record.fields.כתובת),
  };
}
