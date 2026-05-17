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
    title: text(record.fields.fld9pZpcEyipF5teB) || text(record.fields.כותרת),
    status: taskStatus(record.fields.fldAP5bP6n8okIqec ?? record.fields.סטטוס),
    taskType: nullableText(record.fields.fld8xgcv4HEeW2NYF),
    executionDate:
      nullableText(record.fields.fld7wFWvaROfYEQ8B) ??
      nullableText(record.fields["תאריך מתוכנן"]),
    scheduledDate:
      nullableText(record.fields.fld7wFWvaROfYEQ8B) ??
      nullableText(record.fields["תאריך מתוכנן"]),
    timeWindow: nullableText(record.fields.fldGurfCRnIZNu8Dl),
    notes: nullableText(record.fields.fldIcfmWGysvQYv8c),
    actuallyDone: record.fields.fld00gbAzyZVvDWOt === true,
    scheduleSentToInstaller: record.fields.fldwCt6kfDJKCwRGl === true,
    scheduleSentAt: nullableText(record.fields.fldThdHcsu0pVe6wV),
    scheduleSendStatus: nullableText(record.fields.flduXVUqqxhKDwV7i),
    scheduleSendError: nullableText(record.fields.fldVo4YVjCEUBZ2JP),
    installerIds: linkedRecordIds(record.fields.fldtSaIGqknI4t1IM ?? record.fields.מתקין),
    installerName: null,
    installerPhone: null,
    orderIds: linkedRecordIds(record.fields.fldJQBgJQDdtQFvML ?? record.fields.הזמנה),
    orderNumber: null,
    customerName: null,
    phone: null,
    address: null,
    orderStatus: null,
  };
}
