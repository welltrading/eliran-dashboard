import "server-only";
import type { Task } from "@/lib/types";
import type { RawTaskFields } from "../raw-types";
import { linkedRecordIds, nullableText, taskStatus, text } from "./shared";

type RawRecord = {
  id: string;
  fields: RawTaskFields;
};

export function mapTask(record: RawRecord): Task {
  return {
    id: record.id,
    title: text(record.fields.כותרת),
    status: taskStatus(record.fields.סטטוס),
    scheduledDate: nullableText(record.fields["תאריך מתוכנן"]),
    installerIds: linkedRecordIds(record.fields.מתקין),
    customerIds: linkedRecordIds(record.fields.לקוח),
    orderIds: linkedRecordIds(record.fields.הזמנה),
  };
}
