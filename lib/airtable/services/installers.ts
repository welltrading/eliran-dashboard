import "server-only";
import type {
  Installer,
  InstallerSummary,
  PendingPaymentApprovalTask,
} from "@/lib/types";
import { selectRecords } from "../client";
import type {
  RawExecutionApprovalFields,
  RawInstallerFields,
  RawInstallerTaskFields,
} from "../raw-types";
import { createRecord, updateRecord } from "../write-client";

const INSTALLERS_TABLE_ID = "tblNj2W8WJWbeG1sl";
const TASKS_TABLE_ID = "tblsodUowDPPiOcCk";
const APPROVALS_TABLE_ID = "tbl6z2mmkNpEFI6jx";

type AirtableRecord<TFields> = {
  id: string;
  fields: TFields;
};

type InstallerTaskCounts = {
  openTaskCount: number;
  completedTaskCount: number;
};

type InstallerPaymentTotals = {
  approvedPaymentAmount: number;
};

type ApprovalPaymentFields = {
  fldpAZh1st8qRqA7n?: string[];
  fld82nUwa5hZGSDlF?: string;
  fldTjEOiF0qd1FgEd?: string[];
  fldOCqFBKS8KuXSSV?: boolean;
  fldmg9acRqIp0zim0?: "אושר";
  fldDLbU0YVyUJN3WV?: string;
};

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

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + numberValue(item), 0);
  }

  return 0;
}

function nullableNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    const total = value.reduce((sum, item) => sum + numberValue(item), 0);
    return total > 0 ? total : null;
  }

  return null;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function linkedRecordIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function listValue(value: unknown) {
  if (!Array.isArray(value)) {
    const singleValue = textValue(value);
    return singleValue ? [singleValue] : [];
  }

  return value
    .map((item) => textValue(item))
    .filter((item) => item.length > 0);
}

function firstListText(value: unknown) {
  return listValue(value)[0] ?? null;
}

function taskTypeLabel(fields: RawInstallerTaskFields) {
  const dashboardLabel = nullableTextValue(fields.fld8IAHnls7oZUMOC);

  if (dashboardLabel) {
    return dashboardLabel;
  }

  const taskTitle = nullableTextValue(fields.fld9pZpcEyipF5teB);
  const titlePrefix = taskTitle?.split(" | הזמנה ")[0]?.trim();

  if (titlePrefix) {
    return titlePrefix;
  }

  const linkedLabel = firstListText(fields.fld8xgcv4HEeW2NYF);
  return linkedLabel?.startsWith("rec") ? null : linkedLabel;
}

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function dateMonthKey(value: unknown) {
  const rawDate = textValue(value);

  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return rawDate.slice(0, 7) || null;
  }

  return monthKey(date);
}

function isCompletedTask(fields: RawInstallerTaskFields) {
  return textValue(fields.fldAP5bP6n8okIqec).includes("הושל") ||
    booleanValue(fields.fld00gbAzyZVvDWOt);
}

function isOpenTask(fields: RawInstallerTaskFields) {
  const status = textValue(fields.fldAP5bP6n8okIqec);

  if (status.includes("בוטל") || isCompletedTask(fields)) {
    return false;
  }

  return true;
}

function isApprovedApproval(fields: RawExecutionApprovalFields) {
  return (
    booleanValue(fields.fldOCqFBKS8KuXSSV) &&
    textValue(fields.fldmg9acRqIp0zim0) === "אושר" &&
    !booleanValue(fields.fldxJM4QXKh7kitBM)
  );
}

function isValidPaymentApproval(fields: RawExecutionApprovalFields) {
  return isApprovedApproval(fields);
}

function approvalDateTimeFromTaskDate(value: string | null) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(`${value.slice(0, 10)}T00:00:00.000+03:00`).toISOString();
}

function buildApprovalsByTaskId(
  approvals: AirtableRecord<RawExecutionApprovalFields>[],
) {
  const approvalsByTaskId = new Map<string, AirtableRecord<RawExecutionApprovalFields>[]>();

  approvals.forEach((approval) => {
    linkedRecordIds(approval.fields.fldpAZh1st8qRqA7n).forEach((taskId) => {
      approvalsByTaskId.set(taskId, [
        ...(approvalsByTaskId.get(taskId) ?? []),
        approval,
      ]);
    });
  });

  return approvalsByTaskId;
}

function hasValidPaymentApproval(
  approvals: AirtableRecord<RawExecutionApprovalFields>[],
) {
  return approvals.some((approval) => isValidPaymentApproval(approval.fields));
}

function mapPendingPaymentApprovalTask(
  task: AirtableRecord<RawInstallerTaskFields>,
  installerById: Map<string, string>,
  approvalsByTaskId: Map<string, AirtableRecord<RawExecutionApprovalFields>[]>,
): PendingPaymentApprovalTask | null {
  const fields = task.fields;
  const installerId = linkedRecordIds(fields.fldtSaIGqknI4t1IM)[0];

  if (!booleanValue(fields.fld00gbAzyZVvDWOt) || !installerId) {
    return null;
  }

  const taskApprovals = approvalsByTaskId.get(task.id) ?? [];

  if (hasValidPaymentApproval(taskApprovals)) {
    return null;
  }

  return {
    id: task.id,
    executionDate: nullableTextValue(fields.fld7wFWvaROfYEQ8B),
    customerName: firstListText(fields.fldgntnzuRgEBSfdj),
    orderNumber: firstListText(fields.fldJktpQOU9RRgy1t),
    taskType: taskTypeLabel(fields),
    installerId,
    installerName: installerById.get(installerId) ?? "ללא שם מתקין",
    paymentAmount: nullableNumberValue(fields.fldSh9sHtkiOTkIwd),
    existingApprovalId: taskApprovals.length === 1 ? taskApprovals[0].id : null,
  };
}

function mapInstaller(
  record: AirtableRecord<RawInstallerFields>,
  taskCounts: Map<string, InstallerTaskCounts>,
  paymentTotals: Map<string, InstallerPaymentTotals>,
): Installer {
  const fields = record.fields;
  const counts = taskCounts.get(record.id);
  const payments = paymentTotals.get(record.id);

  return {
    id: record.id,
    name: textValue(fields.fldOSaSnJIAr43Btv) || textValue(fields["שם מתקין"]),
    firstName: nullableTextValue(fields.fld0sR1uUVVUdSSKV),
    phone: nullableTextValue(fields.fldNuwr5rLp0Vbicu) ?? nullableTextValue(fields.טלפון),
    mobile: nullableTextValue(fields.fldEKq3y8mVAqnQZu),
    capabilities: listValue(fields.fldGiu9i3KciTcMSO),
    active: booleanValue(fields.פעיל, true),
    paidThisMonth: booleanValue(fields.fldICb7wcohXGmKLV),
    approvedAmountToPay: numberValue(fields.fldpaHuYIWVkk9z17),
    openTaskCount: counts?.openTaskCount ?? 0,
    completedTaskCount: counts?.completedTaskCount ?? 0,
    approvedPaymentAmount: payments?.approvedPaymentAmount ?? 0,
  };
}

function buildInstallerTaskSummary(tasks: AirtableRecord<RawInstallerTaskFields>[]) {
  const counts = new Map<string, InstallerTaskCounts>();

  tasks.forEach((task) => {
    const installerIds = linkedRecordIds(task.fields.fldtSaIGqknI4t1IM);

    installerIds.forEach((installerId) => {
      const current = counts.get(installerId) ?? {
        openTaskCount: 0,
        completedTaskCount: 0,
      };

      if (isCompletedTask(task.fields)) {
        current.completedTaskCount += 1;
      } else if (isOpenTask(task.fields)) {
        current.openTaskCount += 1;
      }

      counts.set(installerId, current);
    });
  });

  return counts;
}

function buildInstallerPaymentSummary(
  approvals: AirtableRecord<RawExecutionApprovalFields>[],
) {
  const totals = new Map<string, InstallerPaymentTotals>();

  approvals.forEach((approval) => {
    if (!isApprovedApproval(approval.fields)) {
      return;
    }

    linkedRecordIds(approval.fields.fldTjEOiF0qd1FgEd).forEach((installerId) => {
      const current = totals.get(installerId) ?? { approvedPaymentAmount: 0 };
      current.approvedPaymentAmount += numberValue(approval.fields.fldsMGqafeCRlN7zo);
      totals.set(installerId, current);
    });
  });

  return totals;
}

function buildSummary(
  installers: Installer[],
  tasks: AirtableRecord<RawInstallerTaskFields>[],
  approvals: AirtableRecord<RawExecutionApprovalFields>[],
): InstallerSummary {
  const currentMonth = monthKey(new Date());
  const approvedTaskIds = new Set<string>();

  approvals.forEach((approval) => {
    if (!isApprovedApproval(approval.fields)) {
      return;
    }

    linkedRecordIds(approval.fields.fldpAZh1st8qRqA7n).forEach((taskId) => {
      approvedTaskIds.add(taskId);
    });
  });

  return {
    totalInstallers: installers.length,
    installersWithPhoneOrMobile: installers.filter(
      (installer) => Boolean(installer.phone) || Boolean(installer.mobile),
    ).length,
    totalApprovedAmountToPay: installers.reduce(
      (total, installer) => total + installer.approvedAmountToPay,
      0,
    ),
    tasksScheduledThisMonth: tasks.filter(
      (task) => dateMonthKey(task.fields.fld7wFWvaROfYEQ8B) === currentMonth,
    ).length,
    completedTasksPendingApproval: tasks.filter(
      (task) => isCompletedTask(task.fields) && !approvedTaskIds.has(task.id),
    ).length,
    completedTasksPendingApprovalIsBestEffort: true,
  };
}

export async function getInstallerTaskSummary() {
  const records = await selectRecords<RawInstallerTaskFields>(TASKS_TABLE_ID, {
    returnFieldsByFieldId: true,
  });

  return buildInstallerTaskSummary(records);
}

export async function getInstallerPaymentSummary() {
  const records = await selectRecords<RawExecutionApprovalFields>(APPROVALS_TABLE_ID, {
    returnFieldsByFieldId: true,
  });

  return buildInstallerPaymentSummary(records);
}

export async function getInstallers() {
  const [installerRecords, taskRecords, approvalRecords] = await Promise.all([
    selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerTaskFields>(TASKS_TABLE_ID, {
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawExecutionApprovalFields>(APPROVALS_TABLE_ID, {
      returnFieldsByFieldId: true,
    }),
  ]);

  const taskSummary = buildInstallerTaskSummary(taskRecords);
  const paymentSummary = buildInstallerPaymentSummary(approvalRecords);
  const installers = installerRecords.map((record) =>
    mapInstaller(record, taskSummary, paymentSummary),
  );

  return {
    installers,
    summary: buildSummary(installers, taskRecords, approvalRecords),
  };
}

export async function getPendingPaymentApprovalTasks() {
  const [taskRecords, installerRecords, approvalRecords] = await Promise.all([
    selectRecords<RawInstallerTaskFields>(TASKS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawExecutionApprovalFields>(APPROVALS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
  ]);

  const installerById = new Map(
    installerRecords.map((record) => [
      record.id,
      textValue(record.fields.fldOSaSnJIAr43Btv) || textValue(record.fields["שם מתקין"]),
    ]),
  );
  const approvalsByTaskId = buildApprovalsByTaskId(approvalRecords);

  return taskRecords
    .map((task) =>
      mapPendingPaymentApprovalTask(task, installerById, approvalsByTaskId),
    )
    .filter((task): task is PendingPaymentApprovalTask => Boolean(task))
    .sort((a, b) => {
      if (a.executionDate && b.executionDate && a.executionDate !== b.executionDate) {
        return a.executionDate.localeCompare(b.executionDate);
      }

      if (!a.executionDate && b.executionDate) {
        return 1;
      }

      if (a.executionDate && !b.executionDate) {
        return -1;
      }

      return a.installerName.localeCompare(b.installerName, "he");
    });
}

export async function approveTaskPayment(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    return {
      ok: false as const,
      message: "חסרה משימה לאישור.",
      errors: ["חסר מזהה משימה."],
    };
  }

  const [taskRecords, allApprovalRecords] = await Promise.all([
    selectRecords<RawInstallerTaskFields>(TASKS_TABLE_ID, {
      cache: "no-store",
      filterByFormula: `RECORD_ID() = '${normalizedTaskId}'`,
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawExecutionApprovalFields>(APPROVALS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
  ]);
  const approvalRecords = allApprovalRecords.filter((approvalRecord) =>
    linkedRecordIds(approvalRecord.fields.fldpAZh1st8qRqA7n).includes(
      normalizedTaskId,
    ),
  );

  const task = taskRecords[0];

  if (!task) {
    return {
      ok: false as const,
      message: "המשימה לא נמצאה.",
      errors: ["לא נמצאה משימה תואמת בטבלת משימות."],
    };
  }

  const installerId = linkedRecordIds(task.fields.fldtSaIGqknI4t1IM)[0];
  const paymentAmount = nullableNumberValue(task.fields.fldSh9sHtkiOTkIwd);

  if (!booleanValue(task.fields.fld00gbAzyZVvDWOt)) {
    return {
      ok: false as const,
      message: "לא ניתן לאשר תשלום למשימה שלא סומנה כבוצעה.",
      errors: ["בוצע בפועל אינו מסומן."],
    };
  }

  if (!installerId) {
    return {
      ok: false as const,
      message: "לא ניתן לאשר תשלום ללא מתקין.",
      errors: ["למשימה אין מתקין משויך."],
    };
  }

  if (!paymentAmount) {
    return {
      ok: false as const,
      message: "לא ניתן לאשר תשלום למשימה ללא סכום.",
      errors: ["חסר תעריף או סכום לתשלום."],
    };
  }

  if (approvalRecords.length > 1) {
    return {
      ok: false as const,
      message: "נמצאו כמה אישורי ביצוע למשימה הזו. האישור נעצר כדי למנוע כפילות תשלום.",
      errors: ["יש לטפל בכפילויות אישורי הביצוע באיירטייבל לפני אישור התשלום."],
    };
  }

  const approvalFields: ApprovalPaymentFields = {
    fldpAZh1st8qRqA7n: [normalizedTaskId],
    fld82nUwa5hZGSDlF: approvalDateTimeFromTaskDate(
      nullableTextValue(task.fields.fld7wFWvaROfYEQ8B),
    ),
    fldTjEOiF0qd1FgEd: [installerId],
    fldOCqFBKS8KuXSSV: true,
    fldmg9acRqIp0zim0: "אושר",
    fldDLbU0YVyUJN3WV: new Date().toISOString(),
  };

  try {
    if (approvalRecords.length === 1) {
      await updateRecord<ApprovalPaymentFields>(
        APPROVALS_TABLE_ID,
        approvalRecords[0].id,
        approvalFields,
      );
    } else {
      await createRecord<ApprovalPaymentFields>(APPROVALS_TABLE_ID, approvalFields);
    }

    return {
      ok: true as const,
      message: "התשלום אושר בהצלחה.",
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "אישור התשלום ב-Airtable נכשל.",
      errors: [
        error instanceof Error
          ? error.message
          : "אירעה שגיאה לא צפויה בעת אישור התשלום.",
      ],
    };
  }
}
