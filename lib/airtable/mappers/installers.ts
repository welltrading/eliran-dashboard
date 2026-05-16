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
    phone: nullableText(record.fields.טלפון),
    active: booleanValue(record.fields.פעיל, true),
  };
}
