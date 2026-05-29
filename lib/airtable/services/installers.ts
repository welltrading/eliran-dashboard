import "server-only";
import type {
  ApprovalMissingAmountIssue,
  DuplicateTaskApprovalIssue,
  Installer,
  InstallerMonthlyPaymentDetail,
  InstallerMonthlyPaymentReport,
  InstallerMonthlyPaymentRecordSnapshot,
  InstallerMonthlyPaymentRecordState,
  InstallerMonthlyPaymentSummary,
  InstallerMonthlyPaymentMutationResult,
  InstallerMonthlyPaymentSyncResult,
  InstallerRate,
  InstallerSummary,
  PaymentReliabilityControlData,
  PendingPaymentApprovalTask,
  TaskWithoutRate,
} from "@/lib/types";
import { selectRecords } from "../client";
import type {
  RawExecutionApprovalFields,
  RawInstallerFields,
  RawInstallerMonthlyPaymentFields,
  RawInstallerRateFields,
  RawInstallerTaskFields,
} from "../raw-types";
import { createRecord, updateRecord } from "../write-client";

const INSTALLERS_TABLE_ID = "tblNj2W8WJWbeG1sl";
const TASKS_TABLE_ID = "tblsodUowDPPiOcCk";
const APPROVALS_TABLE_ID = "tbl6z2mmkNpEFI6jx";
const RATES_TABLE_ID = "tbl4guJMDoluPnHLD";
const INSTALLER_MONTHLY_PAYMENTS_TABLE_ID = "tbl614tWbo2VrpS8d";

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

type MonthlyPaymentAccumulator = {
  installerId: string;
  installerName: string;
  details: InstallerMonthlyPaymentDetail[];
  totalAmount: number;
};

type ApprovalPaymentFields = {
  fldpAZh1st8qRqA7n?: string[];
  fld82nUwa5hZGSDlF?: string;
  fldTjEOiF0qd1FgEd?: string[];
  fldOCqFBKS8KuXSSV?: boolean;
  fldmg9acRqIp0zim0?: "אושר";
  fldDLbU0YVyUJN3WV?: string;
};

type InstallerMonthlyPaymentWriteFields = {
  fldcM0YGpLHWIg4PZ?: string;
  fldmSOmxfRd8UrDxg?: string;
  fld594iX5aq1LoMU5?: string[];
  fldjSy3ma0Mt0PAPQ?: string;
  fldXjjBCkocB0DVJ7?: number;
  fldS6XbWsE6uMtPqp?: "פתוח";
  fldHso8OGch2Bw937?: string[];
  fldDwt9bGfyl20oSF?: string;
};

type InstallerMonthlyPaymentPaidFields = {
  fldS6XbWsE6uMtPqp: "שולם";
  fldF8uamPnjnRE5xF: string;
};

type CreateInstallerFields = {
  fld0sR1uUVVUdSSKV: string;
  fld5Qhfq26o0cRHoo?: string;
  fldNuwr5rLp0Vbicu?: string;
  fldEKq3y8mVAqnQZu?: string;
  fld1pT9vTum0JNiFa?: string;
};

export type CreateInstallerInput = {
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
};

export type CreateInstallerResult = {
  ok: boolean;
  message: string;
  errors?: string[];
  recordId?: string;
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

function monthKeyInTimeZone(value: Date, timeZone = "Asia/Jerusalem") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? String(value.getFullYear());
  const month =
    parts.find((part) => part.type === "month")?.value ??
    String(value.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function normalizePaymentMonth(value?: string | null) {
  return value && /^\d{4}-\d{2}$/.test(value)
    ? value
    : monthKeyInTimeZone(new Date());
}

function airtablePaymentMonth(value: string) {
  const [year, month] = normalizePaymentMonth(value).split("-");
  return `${month}-${year}`;
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

function taskCustomerName(fields: RawInstallerTaskFields) {
  return nullableTextValue(fields.fldnW9tNzTBwHeB5k) ?? firstListText(fields.fldgntnzuRgEBSfdj);
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

function pendingPaymentApprovalState(
  approvals: AirtableRecord<RawExecutionApprovalFields>[],
): PendingPaymentApprovalTask["paymentApprovalState"] {
  if (approvals.length === 0) {
    return "no_approval";
  }

  if (approvals.length > 1) {
    return "duplicate_approval";
  }

  const approval = approvals[0];
  const status = textValue(approval.fields.fldmg9acRqIp0zim0);

  if (booleanValue(approval.fields.fldxJM4QXKh7kitBM) || status === "מבוטל") {
    return "canceled_approval";
  }

  if (status === "ממתין") {
    return "pending_approval";
  }

  return "other_approval";
}

function pendingPaymentWarning(
  approvals: AirtableRecord<RawExecutionApprovalFields>[],
  paymentAmount: number | null,
) {
  if (!paymentAmount) {
    return "חסר תעריף או סכום לתשלום. אי אפשר לאשר עד השלמת התעריף.";
  }

  if (approvals.length > 1) {
    return "נמצאו כמה אישורי ביצוע לאותה משימה. יש לטפל בכפילות לפני אישור.";
  }

  if (approvals.length === 1) {
    const approval = approvals[0];

    if (
      booleanValue(approval.fields.fldxJM4QXKh7kitBM) ||
      textValue(approval.fields.fldmg9acRqIp0zim0) === "מבוטל"
    ) {
      return "קיים אישור ביצוע מבוטל. יש להסדיר אותו באיירטייבל לפני אישור מחדש.";
    }
  }

  return null;
}

function buildTaskById(tasks: AirtableRecord<RawInstallerTaskFields>[]) {
  return new Map(tasks.map((task) => [task.id, task]));
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
  const paymentAmount = nullableNumberValue(fields.fldSh9sHtkiOTkIwd);
  const existingApprovalStatus =
    taskApprovals.length === 1
      ? nullableTextValue(taskApprovals[0].fields.fldmg9acRqIp0zim0)
      : null;

  if (hasValidPaymentApproval(taskApprovals)) {
    return null;
  }

  return {
    id: task.id,
    executionDate: nullableTextValue(fields.fld7wFWvaROfYEQ8B),
    customerName: taskCustomerName(fields),
    orderNumber: firstListText(fields.fldJktpQOU9RRgy1t),
    taskType: taskTypeLabel(fields),
    installerId,
    installerName: installerById.get(installerId) ?? "ללא שם מתקין",
    paymentAmount,
    existingApprovalId: taskApprovals.length === 1 ? taskApprovals[0].id : null,
    existingApprovalStatus,
    existingApprovalCount: taskApprovals.length,
    paymentApprovalState: pendingPaymentApprovalState(taskApprovals),
    paymentWarning: pendingPaymentWarning(taskApprovals, paymentAmount),
  };
}

function mapInstallerRate(
  record: AirtableRecord<RawInstallerRateFields>,
): InstallerRate {
  const fields = record.fields;

  return {
    id: record.id,
    taskType: textValue(fields.fldpoNfga22gQZsau) || "ללא סוג משימה",
    price: numberValue(fields.fldB8SlJKO4BbLRbE),
    active: booleanValue(fields.fldm3OVYRryVl6bvx),
    linkedTaskCount: linkedRecordIds(fields.fldB06onBocNuTZmw).length,
  };
}

function installerNameForTask(
  task: AirtableRecord<RawInstallerTaskFields>,
  installerById: Map<string, string>,
) {
  const names = linkedRecordIds(task.fields.fldtSaIGqknI4t1IM)
    .map((installerId) => installerById.get(installerId))
    .filter((name): name is string => Boolean(name));

  return names.length > 0 ? names.join(", ") : null;
}

function mapTaskWithoutRate(
  task: AirtableRecord<RawInstallerTaskFields>,
  installerById: Map<string, string>,
): TaskWithoutRate | null {
  const fields = task.fields;
  const hasInstaller = linkedRecordIds(fields.fldtSaIGqknI4t1IM).length > 0;
  const isDone = booleanValue(fields.fld00gbAzyZVvDWOt);
  const price = nullableNumberValue(fields.fldSh9sHtkiOTkIwd);

  if ((!hasInstaller && !isDone) || price) {
    return null;
  }

  return {
    id: task.id,
    executionDate: nullableTextValue(fields.fld7wFWvaROfYEQ8B),
    customerName: taskCustomerName(fields),
    orderNumber: firstListText(fields.fldJktpQOU9RRgy1t),
    taskType: taskTypeLabel(fields),
    installerName: installerNameForTask(task, installerById),
  };
}

function mapMonthlyPaymentDetail(
  approval: AirtableRecord<RawExecutionApprovalFields>,
  installerId: string,
  taskById: Map<string, AirtableRecord<RawInstallerTaskFields>>,
): InstallerMonthlyPaymentDetail {
  const fields = approval.fields;
  const taskId = linkedRecordIds(fields.fldpAZh1st8qRqA7n)[0];
  const task = taskId ? taskById.get(taskId) : undefined;
  const amount = numberValue(fields.fldsMGqafeCRlN7zo);

  return {
    id: `${approval.id}-${installerId}`,
    approvalId: approval.id,
    installationDate: nullableTextValue(fields.fld82nUwa5hZGSDlF),
    orderNumber:
      (task ? firstListText(task.fields.fldJktpQOU9RRgy1t) : null) ??
      firstListText(fields.flds6B6t8maAaevga),
    customerName: task ? taskCustomerName(task.fields) : null,
    taskType:
      firstListText(fields.fldmOfBYtD9CjxDx6) ??
      (task ? taskTypeLabel(task.fields) : null),
    amount,
    amountMissing: amount <= 0,
    approvalStatus: textValue(fields.fldmg9acRqIp0zim0) || "-",
  };
}

function paymentRecordKey(installerId: string, airtableMonth: string) {
  return `${installerId}|${airtableMonth}`;
}

function isOpenMonthlyPaymentStatus(status: string | null) {
  return !status || status === "פתוח";
}

function isLockedMonthlyPaymentStatus(status: string | null) {
  return status === "שולם" || status === "בוטל / לא לתשלום";
}

function isAirtableRecordId(value: string) {
  return /^rec[A-Za-z0-9]{14}$/.test(value);
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function isValidOptionalEmail(value: string | null) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function todayDateInTimeZone(timeZone = "Asia/Jerusalem") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function validMonthlyApprovalsForInstaller(
  approvals: AirtableRecord<RawExecutionApprovalFields>[],
  installerId: string,
  airtableMonth: string,
) {
  return approvals.filter(
    (approval) =>
      isValidPaymentApproval(approval.fields) &&
      textValue(approval.fields.fld2wVyMe3wyhYsqK) === airtableMonth &&
      linkedRecordIds(approval.fields.fldTjEOiF0qd1FgEd).includes(installerId),
  );
}

function mapInstallerMonthlyPaymentRecord(
  record: AirtableRecord<RawInstallerMonthlyPaymentFields>,
  fallbackKey: string,
): InstallerMonthlyPaymentRecordSnapshot {
  const fields = record.fields;
  const includedApprovalIds = linkedRecordIds(fields.fldHso8OGch2Bw937);

  return {
    id: record.id,
    name: nullableTextValue(fields.fldcM0YGpLHWIg4PZ),
    paymentKey: textValue(fields.fldmSOmxfRd8UrDxg) || fallbackKey,
    status: nullableTextValue(fields.fldS6XbWsE6uMtPqp),
    amount: numberValue(fields.fldXjjBCkocB0DVJ7),
    paymentDate: nullableTextValue(fields.fldF8uamPnjnRE5xF),
    includedApprovalCount: includedApprovalIds.length,
    includedApprovalIds,
  };
}

function buildMonthlyPaymentRecordsByKey(
  records: AirtableRecord<RawInstallerMonthlyPaymentFields>[],
) {
  const byKey = new Map<string, InstallerMonthlyPaymentRecordSnapshot[]>();

  records.forEach((record) => {
    const explicitKey = textValue(record.fields.fldmSOmxfRd8UrDxg);
    const installerIds = linkedRecordIds(record.fields.fld594iX5aq1LoMU5);
    const month = textValue(record.fields.fldjSy3ma0Mt0PAPQ);
    const fallbackKeys =
      !explicitKey && month
        ? installerIds.map((installerId) => paymentRecordKey(installerId, month))
        : [];
    const keys = explicitKey ? [explicitKey] : fallbackKeys;

    keys.forEach((key) => {
      const mappedRecord = mapInstallerMonthlyPaymentRecord(record, key);
      byKey.set(key, [...(byKey.get(key) ?? []), mappedRecord]);
    });
  });

  return byKey;
}

function monthlyPaymentRecordState(
  records: InstallerMonthlyPaymentRecordSnapshot[] | undefined,
): InstallerMonthlyPaymentRecordState {
  if (!records || records.length === 0) {
    return { kind: "missing" };
  }

  if (records.length === 1) {
    return {
      kind: "existing",
      record: records[0],
    };
  }

  return {
    kind: "duplicate",
    records,
  };
}

function buildMonthlyReportByInstaller(
  approvals: AirtableRecord<RawExecutionApprovalFields>[],
  installerById: Map<string, string>,
  taskById: Map<string, AirtableRecord<RawInstallerTaskFields>>,
  monthlyPaymentRecordsByKey: Map<string, InstallerMonthlyPaymentRecordSnapshot[]>,
  airtableMonth: string,
): InstallerMonthlyPaymentSummary[] {
  const byInstaller = new Map<string, MonthlyPaymentAccumulator>();

  approvals.forEach((approval) => {
    linkedRecordIds(approval.fields.fldTjEOiF0qd1FgEd).forEach((installerId) => {
      const current = byInstaller.get(installerId) ?? {
        installerId,
        installerName: installerById.get(installerId) ?? "ללא שם מתקין",
        details: [],
        totalAmount: 0,
      };
      const detail = mapMonthlyPaymentDetail(approval, installerId, taskById);

      current.details.push(detail);
      current.totalAmount += detail.amount;
      byInstaller.set(installerId, current);
    });
  });

  return Array.from(byInstaller.values())
    .map((item) => ({
      installerId: item.installerId,
      installerName: item.installerName,
      approvalCount: item.details.length,
      totalAmount: item.totalAmount,
      monthlyPaymentRecord: monthlyPaymentRecordState(
        monthlyPaymentRecordsByKey.get(paymentRecordKey(item.installerId, airtableMonth)),
      ),
      details: item.details.sort((a, b) => {
        if (a.installationDate && b.installationDate) {
          return a.installationDate.localeCompare(b.installationDate);
        }

        if (!a.installationDate && b.installationDate) {
          return 1;
        }

        if (a.installationDate && !b.installationDate) {
          return -1;
        }

        return (a.orderNumber ?? "").localeCompare(b.orderNumber ?? "", "he");
      }),
    }))
    .sort((a, b) => {
      if (b.totalAmount !== a.totalAmount) {
        return b.totalAmount - a.totalAmount;
      }

      return a.installerName.localeCompare(b.installerName, "he");
    });
}

function mapMissingAmountApprovalIssue(
  approval: AirtableRecord<RawExecutionApprovalFields>,
  installerById: Map<string, string>,
  taskById: Map<string, AirtableRecord<RawInstallerTaskFields>>,
): ApprovalMissingAmountIssue {
  const fields = approval.fields;
  const taskId = linkedRecordIds(fields.fldpAZh1st8qRqA7n)[0] ?? null;
  const installerId = linkedRecordIds(fields.fldTjEOiF0qd1FgEd)[0];
  const task = taskId ? taskById.get(taskId) : undefined;

  return {
    id: approval.id,
    approvalId: approval.id,
    installerName: installerId ? installerById.get(installerId) ?? null : null,
    installationDate: nullableTextValue(fields.fld82nUwa5hZGSDlF),
    taskId,
    orderNumber:
      (task ? firstListText(task.fields.fldJktpQOU9RRgy1t) : null) ??
      firstListText(fields.flds6B6t8maAaevga),
    amount: numberValue(fields.fldsMGqafeCRlN7zo),
    approvalStatus: textValue(fields.fldmg9acRqIp0zim0) || "-",
  };
}

function buildDuplicateTaskApprovalIssues(
  approvalsByTaskId: Map<string, AirtableRecord<RawExecutionApprovalFields>[]>,
): DuplicateTaskApprovalIssue[] {
  return Array.from(approvalsByTaskId.entries())
    .filter(([, approvals]) => approvals.length > 1)
    .map(([taskId, approvals]) => ({
      taskId,
      approvalCount: approvals.length,
      approvalIds: approvals.map((approval) => approval.id),
      statuses: approvals.map((approval) => textValue(approval.fields.fldmg9acRqIp0zim0) || "-"),
      validApprovalCount: approvals.filter((approval) =>
        isValidPaymentApproval(approval.fields),
      ).length,
    }))
    .sort((a, b) => b.validApprovalCount - a.validApprovalCount || b.approvalCount - a.approvalCount);
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

export async function createInstaller(
  input: CreateInstallerInput,
): Promise<CreateInstallerResult> {
  const firstName = input.firstName.trim();
  const lastName = normalizeOptionalText(input.lastName);
  const phone = normalizeOptionalText(input.phone);
  const mobile = normalizeOptionalText(input.mobile);
  const email = normalizeOptionalText(input.email);
  const errors: string[] = [];

  if (!firstName) {
    errors.push("שם פרטי הוא שדה חובה.");
  }

  if (!phone && !mobile) {
    errors.push("יש להזין לפחות טלפון או נייד.");
  }

  if (!isValidOptionalEmail(email)) {
    errors.push("כתובת האימייל אינה תקינה.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      message: "לא ניתן ליצור מתקין חדש.",
      errors,
    };
  }

  const fields: CreateInstallerFields = {
    fld0sR1uUVVUdSSKV: firstName,
  };

  if (lastName) {
    fields.fld5Qhfq26o0cRHoo = lastName;
  }

  if (phone) {
    fields.fldNuwr5rLp0Vbicu = phone;
  }

  if (mobile) {
    fields.fldEKq3y8mVAqnQZu = mobile;
  }

  if (email) {
    fields.fld1pT9vTum0JNiFa = email;
  }

  try {
    const createdRecord = await createRecord<RawInstallerFields>(
      INSTALLERS_TABLE_ID,
      fields,
    );

    return {
      ok: true,
      message: "המתקין נוצר בהצלחה.",
      recordId: createdRecord.id,
    };
  } catch (error) {
    return {
      ok: false,
      message: "יצירת המתקין ב-Airtable נכשלה.",
      errors: [
        error instanceof Error
          ? error.message
          : "אירעה שגיאה לא צפויה בעת יצירת המתקין.",
      ],
    };
  }
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

export async function getInstallerRatesControlData() {
  const [rateRecords, taskRecords, installerRecords] = await Promise.all([
    selectRecords<RawInstallerRateFields>(RATES_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerTaskFields>(TASKS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
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

  const rates = rateRecords
    .map(mapInstallerRate)
    .sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }

      return a.taskType.localeCompare(b.taskType, "he");
    });

  const tasksWithoutRate = taskRecords
    .map((task) => mapTaskWithoutRate(task, installerById))
    .filter((task): task is TaskWithoutRate => Boolean(task))
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

      return (a.customerName ?? "").localeCompare(b.customerName ?? "", "he");
    });

  return {
    rates,
    tasksWithoutRate,
  };
}

export async function getInstallerMonthlyPaymentReport(
  paymentMonth?: string | null,
): Promise<InstallerMonthlyPaymentReport> {
  const selectedMonth = normalizePaymentMonth(paymentMonth);
  const airtableMonth = airtablePaymentMonth(selectedMonth);
  const [approvalRecords, installerRecords, taskRecords, monthlyPaymentRecords] = await Promise.all([
    selectRecords<RawExecutionApprovalFields>(APPROVALS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerTaskFields>(TASKS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerMonthlyPaymentFields>(INSTALLER_MONTHLY_PAYMENTS_TABLE_ID, {
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
  const taskById = buildTaskById(taskRecords);
  const validMonthlyApprovals = approvalRecords.filter(
    (approval) =>
      isValidPaymentApproval(approval.fields) &&
      textValue(approval.fields.fld2wVyMe3wyhYsqK) === airtableMonth,
  );
  const monthlyPaymentRecordsByKey =
    buildMonthlyPaymentRecordsByKey(monthlyPaymentRecords);
  const installerSummaries = buildMonthlyReportByInstaller(
    validMonthlyApprovals,
    installerById,
    taskById,
    monthlyPaymentRecordsByKey,
    airtableMonth,
  );

  return {
    selectedMonth,
    airtableMonth,
    installerSummaries,
    totalApprovalCount: validMonthlyApprovals.length,
    totalAmount: installerSummaries.reduce(
      (total, installer) => total + installer.totalAmount,
      0,
    ),
  };
}

export async function syncInstallerMonthlyPayment(input: {
  installerId: string;
  paymentMonth: string;
}): Promise<InstallerMonthlyPaymentSyncResult> {
  const installerId = input.installerId.trim();
  const selectedMonth = input.paymentMonth.trim();

  if (!/^\d{4}-\d{2}$/.test(selectedMonth)) {
    return {
      ok: false,
      action: "blocked",
      message: "חודש התשלום אינו תקין.",
    };
  }

  const airtableMonth = airtablePaymentMonth(selectedMonth);
  const key = paymentRecordKey(installerId, airtableMonth);

  if (!installerId) {
    return {
      ok: false,
      action: "blocked",
      message: "חסר מתקין לסנכרון תשלום חודשי.",
    };
  }

  const [approvalRecords, installerRecords, monthlyPaymentRecords] = await Promise.all([
    selectRecords<RawExecutionApprovalFields>(APPROVALS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerMonthlyPaymentFields>(INSTALLER_MONTHLY_PAYMENTS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
  ]);

  const installer = installerRecords.find((record) => record.id === installerId);
  const installerName = installer
    ? textValue(installer.fields.fldOSaSnJIAr43Btv) ||
      textValue(installer.fields["שם מתקין"]) ||
      "ללא שם מתקין"
    : "ללא שם מתקין";

  if (!installer) {
    return {
      ok: false,
      action: "blocked",
      message: "המתקין לא נמצא באיירטייבל.",
    };
  }

  const validApprovals = validMonthlyApprovalsForInstaller(
    approvalRecords,
    installerId,
    airtableMonth,
  );

  if (validApprovals.length === 0) {
    return {
      ok: false,
      action: "no_approvals",
      message: `לא נמצאו אישורי ביצוע תקפים עבור ${installerName} בחודש ${airtableMonth}.`,
    };
  }

  const totalAmount = validApprovals.reduce(
    (total, approval) => total + numberValue(approval.fields.fldsMGqafeCRlN7zo),
    0,
  );
  const includedApprovalIds = validApprovals.map((approval) => approval.id);
  const existingRecords = buildMonthlyPaymentRecordsByKey(monthlyPaymentRecords).get(key) ?? [];

  if (existingRecords.length > 1) {
    return {
      ok: false,
      action: "duplicate",
      message: "קיימת כפילות רשומות תשלום חודשיות למתקין ולחודש הזה. נדרש טיפול ידני לפני סנכרון.",
    };
  }

  const fields: InstallerMonthlyPaymentWriteFields = {
    fldcM0YGpLHWIg4PZ: `${installerName} | ${airtableMonth}`,
    fldmSOmxfRd8UrDxg: key,
    fld594iX5aq1LoMU5: [installerId],
    fldjSy3ma0Mt0PAPQ: airtableMonth,
    fldXjjBCkocB0DVJ7: totalAmount,
    fldHso8OGch2Bw937: includedApprovalIds,
    fldDwt9bGfyl20oSF: "נוצר מדוח סוף חודש",
  };

  const existingRecord = existingRecords[0];

  if (!existingRecord) {
    const createdRecord = await createRecord<RawInstallerMonthlyPaymentFields>(
      INSTALLER_MONTHLY_PAYMENTS_TABLE_ID,
      {
        ...fields,
        fldS6XbWsE6uMtPqp: "פתוח",
      },
    );

    return {
      ok: true,
      action: "created",
      message: `נוצר תשלום חודשי פתוח עבור ${installerName} בסך ${totalAmount} ש"ח.`,
      recordId: createdRecord.id,
    };
  }

  if (isLockedMonthlyPaymentStatus(existingRecord.status)) {
    return {
      ok: false,
      action: "blocked",
      message: `רשומת התשלום החודשית בסטטוס ${existingRecord.status} ולכן לא עודכנה.`,
      recordId: existingRecord.id,
    };
  }

  if (!isOpenMonthlyPaymentStatus(existingRecord.status)) {
    return {
      ok: false,
      action: "blocked",
      message: `רשומת התשלום החודשית בסטטוס ${existingRecord.status}; ניתן לסנכרן רק רשומה פתוחה.`,
      recordId: existingRecord.id,
    };
  }

  await updateRecord<RawInstallerMonthlyPaymentFields>(
    INSTALLER_MONTHLY_PAYMENTS_TABLE_ID,
    existingRecord.id,
    fields,
  );

  return {
    ok: true,
    action: "updated",
    message: `רשומת התשלום החודשית סונכרנה עבור ${installerName} בסך ${totalAmount} ש"ח.`,
    recordId: existingRecord.id,
  };
}

export async function markInstallerMonthlyPaymentPaid(input: {
  recordId: string;
  installerId: string;
  paymentMonth: string;
}): Promise<InstallerMonthlyPaymentMutationResult> {
  const recordId = input.recordId.trim();
  const installerId = input.installerId.trim();
  const selectedMonth = input.paymentMonth.trim();

  if (!isAirtableRecordId(recordId)) {
    return {
      ok: false,
      action: "blocked",
      message: "רשומת התשלום אינה תקינה.",
    };
  }

  if (!isAirtableRecordId(installerId)) {
    return {
      ok: false,
      action: "blocked",
      message: "חסר מתקין לסימון תשלום כשולם.",
    };
  }

  if (!/^\d{4}-\d{2}$/.test(selectedMonth)) {
    return {
      ok: false,
      action: "blocked",
      message: "חודש התשלום אינו תקין.",
    };
  }

  const airtableMonth = airtablePaymentMonth(selectedMonth);
  const key = paymentRecordKey(installerId, airtableMonth);
  const [approvalRecords, monthlyPaymentRecords] = await Promise.all([
    selectRecords<RawExecutionApprovalFields>(APPROVALS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerMonthlyPaymentFields>(INSTALLER_MONTHLY_PAYMENTS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
  ]);
  const existingRecords = buildMonthlyPaymentRecordsByKey(monthlyPaymentRecords).get(key) ?? [];

  if (existingRecords.length === 0) {
    return {
      ok: false,
      action: "not_found",
      message: "לא נמצאה רשומת תשלום חודשית למתקין ולחודש הזה.",
    };
  }

  if (existingRecords.length > 1) {
    return {
      ok: false,
      action: "duplicate",
      message: "קיימת כפילות רשומות תשלום חודשיות למתקין ולחודש הזה. נדרש טיפול ידני לפני סימון כשולם.",
    };
  }

  const existingRecord = existingRecords[0];

  if (existingRecord.id !== recordId) {
    return {
      ok: false,
      action: "blocked",
      message: "רשומת התשלום אינה תואמת למתקין ולחודש שנבחרו.",
      recordId: existingRecord.id,
    };
  }

  if (existingRecord.status === "שולם") {
    return {
      ok: false,
      action: "blocked",
      message: "רשומת התשלום כבר סומנה כשולמה.",
      recordId,
    };
  }

  if (isLockedMonthlyPaymentStatus(existingRecord.status)) {
    return {
      ok: false,
      action: "blocked",
      message: `רשומת התשלום החודשית בסטטוס ${existingRecord.status} ולכן לא עודכנה.`,
      recordId,
    };
  }

  if (!isOpenMonthlyPaymentStatus(existingRecord.status)) {
    return {
      ok: false,
      action: "blocked",
      message: `רשומת התשלום החודשית בסטטוס ${existingRecord.status}; ניתן לסמן כשולם רק רשומה פתוחה.`,
      recordId,
    };
  }

  const validApprovals = validMonthlyApprovalsForInstaller(
    approvalRecords,
    installerId,
    airtableMonth,
  );
  const totalAmount = validApprovals.reduce(
    (total, approval) => total + numberValue(approval.fields.fldsMGqafeCRlN7zo),
    0,
  );
  const includedApprovalIds = validApprovals.map((approval) => approval.id);

  if (
    existingRecord.amount !== totalAmount ||
    !sameStringSet(existingRecord.includedApprovalIds, includedApprovalIds)
  ) {
    return {
      ok: false,
      action: "blocked",
      message: "יש לסנכרן את התשלום לפני סימון כשולם.",
      recordId,
    };
  }

  await updateRecord<RawInstallerMonthlyPaymentFields>(
    INSTALLER_MONTHLY_PAYMENTS_TABLE_ID,
    recordId,
    {
      fldS6XbWsE6uMtPqp: "שולם",
      fldF8uamPnjnRE5xF: todayDateInTimeZone(),
    } satisfies InstallerMonthlyPaymentPaidFields,
  );

  return {
    ok: true,
    action: "paid",
    message: "התשלום החודשי סומן כשולם וננעל לעריכה.",
    recordId,
  };
}

export async function getPaymentReliabilityControlData(): Promise<PaymentReliabilityControlData> {
  const [approvalRecords, taskRecords, installerRecords] = await Promise.all([
    selectRecords<RawExecutionApprovalFields>(APPROVALS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerTaskFields>(TASKS_TABLE_ID, {
      cache: "no-store",
      returnFieldsByFieldId: true,
    }),
    selectRecords<RawInstallerFields>(INSTALLERS_TABLE_ID, {
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
  const taskById = buildTaskById(taskRecords);
  const approvalsByTaskId = buildApprovalsByTaskId(approvalRecords);
  const missingAmountApprovals = approvalRecords
    .filter(
      (approval) =>
        isValidPaymentApproval(approval.fields) &&
        numberValue(approval.fields.fldsMGqafeCRlN7zo) <= 0,
    )
    .map((approval) =>
      mapMissingAmountApprovalIssue(approval, installerById, taskById),
    )
    .sort((a, b) => {
      if (a.installationDate && b.installationDate) {
        return a.installationDate.localeCompare(b.installationDate);
      }

      if (!a.installationDate && b.installationDate) {
        return 1;
      }

      if (a.installationDate && !b.installationDate) {
        return -1;
      }

      return (a.installerName ?? "").localeCompare(b.installerName ?? "", "he");
    });
  const duplicateTaskApprovals = buildDuplicateTaskApprovalIssues(approvalsByTaskId);
  const pendingApprovalTasks = taskRecords
    .map((task) =>
      mapPendingPaymentApprovalTask(task, installerById, approvalsByTaskId),
    )
    .filter((task): task is PendingPaymentApprovalTask => Boolean(task));
  const tasksWithoutRate = taskRecords
    .map((task) => mapTaskWithoutRate(task, installerById))
    .filter((task): task is TaskWithoutRate => Boolean(task));

  return {
    missingAmountApprovals,
    duplicateTaskApprovals,
    pendingApprovalTasks,
    tasksWithoutRate,
    totalIssueCount:
      missingAmountApprovals.length +
      duplicateTaskApprovals.length +
      pendingApprovalTasks.length +
      tasksWithoutRate.length,
  };
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

  if (approvalRecords.length === 0) {
    return {
      ok: false as const,
      message: "ממתין ליצירת אישור ביצוע על ידי Airtable Automation",
      errors: ["אישור התשלום יתאפשר אחרי שהאוטומציה תיצור אישור ביצוע ממתין."],
    };
  }

  if (approvalRecords.length === 1) {
    const existingApproval = approvalRecords[0];
    const approvalStatus = textValue(existingApproval.fields.fldmg9acRqIp0zim0);

    if (
      booleanValue(existingApproval.fields.fldxJM4QXKh7kitBM) ||
      approvalStatus === "מבוטל"
    ) {
      return {
        ok: false as const,
        message: "לא ניתן לאשר ביצוע ותשלום על בסיס אישור ביצוע מבוטל.",
        errors: ["יש להסדיר את אישור הביצוע המבוטל באיירטייבל לפני אישור מחדש."],
      };
    }

    if (approvalStatus !== "ממתין") {
      return {
        ok: false as const,
        message: "לא ניתן לאשר תשלום על בסיס אישור ביצוע שאינו ממתין.",
        errors: ["יש להסדיר את סטטוס אישור הביצוע באיירטייבל לפני אישור התשלום."],
      };
    }
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
    await updateRecord<ApprovalPaymentFields>(
      APPROVALS_TABLE_ID,
      approvalRecords[0].id,
      approvalFields,
    );

    return {
      ok: true as const,
      message: "הביצוע והתשלום אושרו בהצלחה.",
    };
  } catch (error) {
    return {
      ok: false as const,
      message: "אישור הביצוע והתשלום ב-Airtable נכשל.",
      errors: [
        error instanceof Error
          ? error.message
          : "אירעה שגיאה לא צפויה בעת אישור התשלום.",
      ],
    };
  }
}
