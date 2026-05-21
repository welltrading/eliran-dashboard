import "server-only";
import type { Task, TaskScheduleSummary, TaskStatus } from "@/lib/types";
import { selectRecords } from "../client";
import type {
  RawInstallerFields,
  RawInstallerRateFields,
  RawOrderFields,
  RawTaskFields,
} from "../raw-types";
import { airtableTables } from "../tables";
import { createRecord, updateRecord } from "../write-client";

const TASKS_TABLE_ID = "tblsodUowDPPiOcCk";
const ORDERS_TABLE_ID = "tblJYbxBXWUkAoI7m";
const INSTALLERS_TABLE_ID = "tblNj2W8WJWbeG1sl";
const RATES_TABLE_ID = "tbl4guJMDoluPnHLD";
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

type TaskInstallerOption = {
  id: string;
  name: string;
};

type TaskTypeOption = {
  id: string;
  name: string;
};

export type UpdateTaskAssignmentInput = {
  taskId: string;
  executionDate: string | null;
  timeWindow: string | null;
  installerId: string | null;
};

export type CreateStandaloneTaskInput = {
  customerName: string;
  phone: string | null;
  address: string | null;
  executionDate: string | null;
  timeWindow: string | null;
  status: TaskStatus;
  notes: string | null;
  taskTypeId?: string | null;
  installerId?: string | null;
};

const taskStatuses: TaskStatus[] = [
  "פתוח",
  "בטיפול",
  "הושלם",
  "לביצוע",
  "בוצע",
  "בוטל",
];

type UpdatedTaskFields = {
  fld00gbAzyZVvDWOt?: boolean;
  fldAP5bP6n8okIqec?: TaskStatus;
  fld7wFWvaROfYEQ8B?: string | null;
  fldGurfCRnIZNu8Dl?: string | null;
  fldtSaIGqknI4t1IM?: string[];
};

type CreatedStandaloneTaskFields = {
  fldGgCBOWaXKWzTv8: string;
  fldR8epP63UCm2dvH?: string;
  fldIWMyTY6eUcphOx?: string;
  fld7wFWvaROfYEQ8B?: string;
  fldGurfCRnIZNu8Dl?: string;
  fldAP5bP6n8okIqec: TaskStatus;
  fldIcfmWGysvQYv8c?: string;
  fld8xgcv4HEeW2NYF?: string[];
  fldtSaIGqknI4t1IM?: string[];
};

const assignmentTimeWindows = ["10-13", "13-16", "16-19"];

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

function mapInstallerOption(record: AirtableRecord<RawInstallerFields>): TaskInstallerOption | null {
  const installer = mapInstaller(record);

  if (!installer.name) {
    return null;
  }

  return {
    id: record.id,
    name: installer.name,
  };
}

function mapTaskTypeOption(record: AirtableRecord<RawInstallerRateFields>): TaskTypeOption | null {
  const fields = record.fields;

  if (!booleanValue(fields.fldm3OVYRryVl6bvx)) {
    return null;
  }

  const name = nullableTextValue(fields.fldpoNfga22gQZsau);

  if (!name) {
    return null;
  }

  return {
    id: record.id,
    name,
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
    customerName:
      nullableTextValue(fields.fldnW9tNzTBwHeB5k) ??
      joinLabels(relatedOrders.map((order) => order?.customerName ?? null)),
    phone:
      nullableTextValue(fields.fld6yO2AJBtvihM9W) ??
      joinLabels(relatedOrders.map((order) => order?.phone ?? null)),
    address:
      nullableTextValue(fields.fldzHUUvieCC7sZqz) ??
      joinLabels(relatedOrders.map((order) => order?.address ?? null)),
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
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawOrderFields>(ORDERS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
      cache: "no-store",
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

export async function getTaskInstallerOptions() {
  const records = await selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
    cache: "no-store",
    returnFieldsByFieldId: true,
  });

  return records
    .map(mapInstallerOption)
    .filter((installer): installer is TaskInstallerOption => Boolean(installer))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export async function getTaskTypeOptions() {
  const records = await selectRecords<RawInstallerRateFields>(RATES_TABLE_ID, {
    cache: "no-store",
    returnFieldsByFieldId: true,
  });

  return records
    .map(mapTaskTypeOption)
    .filter((taskType): taskType is TaskTypeOption => Boolean(taskType))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export async function markTaskDone(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    return {
      ok: false as const,
      message: "חסרה משימה לעדכון.",
      errors: ["חסר מזהה משימה."],
    };
  }

  try {
    await updateRecord<UpdatedTaskFields>(airtableTables.tasks, normalizedTaskId, {
      fld00gbAzyZVvDWOt: true,
      fldAP5bP6n8okIqec: "בוצע",
    });

    return {
      ok: true as const,
      message: "המשימה סומנה כבוצעה.",
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "עדכון המשימה ב-Airtable נכשל.",
      errors: [
        error instanceof Error
          ? error.message
          : "אירעה שגיאה לא צפויה בעת עדכון המשימה.",
      ],
    };
  }
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

function isValidDateInput(value: string | null) {
  return value === null || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function createStandaloneTask(input: CreateStandaloneTaskInput) {
  const customerName = input.customerName.trim();
  const phone = normalizeOptionalText(input.phone);
  const address = normalizeOptionalText(input.address);
  const executionDate = normalizeOptionalText(input.executionDate);
  const timeWindow = normalizeOptionalText(input.timeWindow);
  const notes = normalizeOptionalText(input.notes);
  const taskTypeId = normalizeOptionalText(input.taskTypeId);
  const installerId = normalizeOptionalText(input.installerId);
  const normalizedStatus = textValue(input.status);
  const status = normalizedStatus as TaskStatus;
  const errors: string[] = [];

  if (!customerName) {
    errors.push("שם לקוח הוא שדה חובה.");
  }

  if (!isValidDateInput(executionDate)) {
    errors.push("תאריך הביצוע אינו תקין.");
  }

  if (timeWindow && !assignmentTimeWindows.includes(timeWindow)) {
    errors.push("חלון הזמן אינו תקין.");
  }

  if (!taskStatuses.includes(status)) {
    errors.push("סטטוס המשימה אינו תקין.");
  }

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "יש לתקן את השדות לפני יצירת המשימה.",
      errors,
    };
  }

  if (taskTypeId || installerId) {
    try {
      const [taskTypeOptions, installerOptions] = await Promise.all([
        taskTypeId ? getTaskTypeOptions() : Promise.resolve([]),
        installerId ? getTaskInstallerOptions() : Promise.resolve([]),
      ]);

      if (
        taskTypeId &&
        !taskTypeOptions.some((taskTypeOption) => taskTypeOption.id === taskTypeId)
      ) {
        errors.push("סוג המשימה שנבחר אינו פעיל או אינו קיים.");
      }

      if (
        installerId &&
        !installerOptions.some((installerOption) => installerOption.id === installerId)
      ) {
        errors.push("המתקין שנבחר אינו קיים.");
      }
    } catch (error) {
      return {
        ok: false as const,
        message: "בדיקת אפשרויות המשימה ב-Airtable נכשלה.",
        errors: [
          error instanceof Error
            ? error.message
            : "אירעה שגיאה לא צפויה בעת בדיקת האפשרויות.",
        ],
      };
    }
  }

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "יש לתקן את השדות לפני יצירת המשימה.",
      errors,
    };
  }

  const fields: CreatedStandaloneTaskFields = {
    fldGgCBOWaXKWzTv8: customerName,
    fldAP5bP6n8okIqec: status,
  };

  if (phone) {
    fields.fldR8epP63UCm2dvH = phone;
  }

  if (address) {
    fields.fldIWMyTY6eUcphOx = address;
  }

  if (executionDate) {
    fields.fld7wFWvaROfYEQ8B = executionDate;
  }

  if (timeWindow) {
    fields.fldGurfCRnIZNu8Dl = timeWindow;
  }

  if (notes) {
    fields.fldIcfmWGysvQYv8c = notes;
  }

  if (taskTypeId) {
    fields.fld8xgcv4HEeW2NYF = [taskTypeId];
  }

  if (installerId) {
    fields.fldtSaIGqknI4t1IM = [installerId];
  }

  try {
    const record = await createRecord<CreatedStandaloneTaskFields>(
      airtableTables.tasks,
      fields,
    );

    return {
      ok: true as const,
      message: "המשימה הכללית נוצרה בהצלחה.",
      recordId: record.id,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "יצירת המשימה ב-Airtable נכשלה.",
      errors: [
        error instanceof Error
          ? error.message
          : "אירעה שגיאה לא צפויה בעת יצירת המשימה.",
      ],
    };
  }
}

export async function updateTaskAssignment(input: UpdateTaskAssignmentInput) {
  const taskId = input.taskId.trim();
  const executionDate = normalizeOptionalText(input.executionDate);
  const timeWindow = normalizeOptionalText(input.timeWindow);
  const installerId = normalizeOptionalText(input.installerId);
  const errors: string[] = [];

  if (!taskId) {
    errors.push("חסר מזהה משימה.");
  }

  if (!isValidDateInput(executionDate)) {
    errors.push("תאריך הביצוע אינו תקין.");
  }

  if (timeWindow && !assignmentTimeWindows.includes(timeWindow)) {
    errors.push("חלון הזמן אינו תקין.");
  }

  if (errors.length > 0) {
    return {
      ok: false as const,
      message: "יש לתקן את השדות לפני שמירת השיבוץ.",
      errors,
    };
  }

  try {
    await updateRecord<UpdatedTaskFields>(airtableTables.tasks, taskId, {
      fld7wFWvaROfYEQ8B: executionDate,
      fldGurfCRnIZNu8Dl: timeWindow,
      fldtSaIGqknI4t1IM: installerId ? [installerId] : [],
    });

    return {
      ok: true as const,
      message: "השיבוץ נשמר בהצלחה.",
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "עדכון השיבוץ ב-Airtable נכשל.",
      errors: [
        error instanceof Error
          ? error.message
          : "אירעה שגיאה לא צפויה בעת עדכון השיבוץ.",
      ],
    };
  }
}
