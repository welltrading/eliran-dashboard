import "server-only";
import type { Installer } from "@/lib/types";
import type { RawInstallerFields } from "../raw-types";
import { booleanValue, nullableText, text } from "./shared";

type RawRecord = {
  id: string;
  fields: RawInstallerFields;
};

export function mapInstaller(record: RawRecord): Installer {
  return {
    id: record.id,
    name: text(record.fields["שם מתקין"]),
    firstName: null,
    phone: nullableText(record.fields.טלפון),
    mobile: null,
    capabilities: [],
    active: booleanValue(record.fields.פעיל, true),
    paidThisMonth: false,
    approvedAmountToPay: 0,
    openTaskCount: 0,
    completedTaskCount: 0,
    approvedPaymentAmount: 0,
  };
}
