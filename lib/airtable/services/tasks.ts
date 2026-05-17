import "server-only";
import type { Task, TaskScheduleSummary, TaskStatus } from "@/lib/types";
import { selectRecords } from "../client";
import type { RawInstallerFields, RawOrderFields, RawTaskFields } from "../raw-types";

const TASKS_TABLE_ID = "tblsodUowDPPiOcCk";
const ORDERS_TABLE_ID = "tblJYbxBXWUkAoI7m";
const INSTALLERS_TABLE_ID = "tblNj2W8WJWbeG1sl";
const ISRAEL_TIME_ZONE = "Asia/Jerusalem";

type AirtableRecord<TFields> = {
  id: string;
  fields: TFields;
};

type RelatedOrder = {
  orderNumber: string | null;
  customerName: string | null;
  phone: string | null;
  address: string | null;
  orderStatus: string | null;
};

type RelatedInstaller = {
  name: string | null;
  phone: string | null;
};

const taskStatuses: TaskStatus[] = [
  "פתוח",
  "בטיפול",
  "הושלם",
  "לביצוע",
  "בוצע",
  "בוטל",
];

function textValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
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
    return value.name.trim();
  }

  return "";
}

function nullableTextValue(value: unknown) {
  const normalized = textValue(value);
  return normalized ? normalized : null;
}

function booleanValue(value: unknown) {
  return value === true;
}

function linkedRecordIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function taskStatusValue(value: unknown): TaskStatus {
  const normalized = textValue(value);
  return taskStatuses.includes(normalized as TaskStatus)
    ? (normalized as TaskStatus)
    : "פתוח";
}

function dateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function taskDateKey(value: string | null) {
  if (!value) {
    return null;
  }

  return value.slice(0, 10);
}

function mapOrder(record: AirtableRecord<RawOrderFields>): RelatedOrder {
  const fields = record.fields;

  return {
    orderNumber: nullableTextValue(fields.fldDrP4MqsxV6EtJd),
    customerName: nullableTextValue(fields.fldZEobEKEQtMtoGV),
    phone: nullableTextValue(fields.fldk7OdnVLITahJxd),
    address: nullableTextValue(fields.fldzNnG3a9uojQPyO),
    orderStatus: nullableTextValue(fields.fldwvbnGd8e3PAU7d),
  };
}

function mapInstaller(record: AirtableRecord<RawInstallerFields>): RelatedInstaller {
  const fields = record.fields;

  return {
    name:
      nullableTextValue(fields.fldOSaSnJIAr43Btv) ??
      nullableTextValue(fields["שם מתקין"]),
    phone:
      nullableTextValue(fields.fldEKq3y8mVAqnQZu) ??
      nullableTextValue(fields.fldNuwr5rLp0Vbicu) ??
      nullableTextValue(fields.טלפון),
  };
}

function joinLabels(values: Array<string | null>) {
  const labels = values.filter((value): value is string => Boolean(value));
  return labels.length > 0 ? labels.join(", ") : null;
}

function mapTask(
  record: AirtableRecord<RawTaskFields>,
  ordersById: Map<string, RelatedOrder>,
  installersById: Map<string, RelatedInstaller>,
): Task {
  const fields = record.fields;
  const orderIds = linkedRecordIds(fields.fldJQBgJQDdtQFvML);
  const installerIds = linkedRecordIds(fields.fldtSaIGqknI4t1IM);
  const relatedOrders = orderIds.map((orderId) => ordersById.get(orderId) ?? null);
  const relatedInstallers = installerIds.map(
    (installerId) => installersById.get(installerId) ?? null,
  );

  const executionDate = nullableTextValue(fields.fld7wFWvaROfYEQ8B);

  return {
    id: record.id,
    title: textValue(fields.fld9pZpcEyipF5teB),
    status: taskStatusValue(fields.fldAP5bP6n8okIqec),
    taskType: nullableTextValue(fields.fld8xgcv4HEeW2NYF),
    executionDate,
    scheduledDate: executionDate,
    timeWindow: nullableTextValue(fields.fldGurfCRnIZNu8Dl),
    notes: nullableTextValue(fields.fldIcfmWGysvQYv8c),
    actuallyDone: booleanValue(fields.fld00gbAzyZVvDWOt),
    scheduleSentToInstaller: booleanValue(fields.fldwCt6kfDJKCwRGl),
    scheduleSentAt: nullableTextValue(fields.fldThdHcsu0pVe6wV),
    scheduleSendStatus: nullableTextValue(fields.flduXVUqqxhKDwV7i),
    scheduleSendError: nullableTextValue(fields.fldVo4YVjCEUBZ2JP),
    installerIds,
    installerName: joinLabels(relatedInstallers.map((installer) => installer?.name ?? null)),
    installerPhone: joinLabels(relatedInstallers.map((installer) => installer?.phone ?? null)),
    orderIds,
    orderNumber: joinLabels(relatedOrders.map((order) => order?.orderNumber ?? null)),
    customerName: joinLabels(relatedOrders.map((order) => order?.customerName ?? null)),
    phone: joinLabels(relatedOrders.map((order) => order?.phone ?? null)),
    address: joinLabels(relatedOrders.map((order) => order?.address ?? null)),
    orderStatus: joinLabels(relatedOrders.map((order) => order?.orderStatus ?? null)),
  };
}

export function getTaskScheduleSummary(tasks: Task[]): TaskScheduleSummary {
  const today = dateKey(new Date());
  const tomorrow = dateKey(addDays(new Date(), 1));
  const byStatus = new Map<string, number>();

  tasks.forEach((task) => {
    byStatus.set(task.status, (byStatus.get(task.status) ?? 0) + 1);
  });

  return {
    totalTasks: tasks.length,
    scheduledToday: tasks.filter((task) => taskDateKey(task.executionDate) === today)
      .length,
    scheduledTomorrow: tasks.filter(
      (task) => taskDateKey(task.executionDate) === tomorrow,
    ).length,
    withoutDate: tasks.filter((task) => !task.executionDate).length,
    withoutInstaller: tasks.filter((task) => task.installerIds.length === 0).length,
    byStatus: Array.from(byStatus, ([status, count]) => ({ status, count })).sort((a, b) =>
      a.status.localeCompare(b.status, "he"),
    ),
    scheduleNotSentToInstaller: tasks.filter(
      (task) => !task.scheduleSentToInstaller,
    ).length,
  };
}

export async function getTasks() {
  const [taskRecords, orderRecords, installerRecords] = await Promise.all([
    selectRecords<RawTaskFields>(TASKS_TABLE_ID, {
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawOrderFields>(ORDERS_TABLE_ID, {
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
      returnFieldsByFieldId: true,
    }),
  ]);

  const ordersById = new Map(
    orderRecords.map((record) => [record.id, mapOrder(record)]),
  );
  const installersById = new Map(
    installerRecords.map((record) => [record.id, mapInstaller(record)]),
  );

  return taskRecords.map((record) => mapTask(record, ordersById, installersById));
}
