import "server-only";
import type { Installer, InstallerSummary } from "@/lib/types";
import { selectRecords } from "../client";
import type {
  RawExecutionApprovalFields,
  RawInstallerFields,
  RawInstallerTaskFields,
} from "../raw-types";

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
    booleanValue(fields.fldOCqFBKS8KuXSSV) ||
    textValue(fields.fldmg9acRqIp0zim0).includes("מאושר")
  );
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
