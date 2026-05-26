"use server";

import {
  approveTaskPayment,
  createInstaller,
  markInstallerMonthlyPaymentPaid,
  syncInstallerMonthlyPayment,
} from "@/lib/airtable/services/installers";
import type { InstallerMonthlyPaymentMutationResult } from "@/lib/types";

export async function approveTaskPaymentAction(taskId: string) {
  return approveTaskPayment(taskId);
}

export async function createInstallerAction(input: {
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
}) {
  return createInstaller(input);
}

export async function syncInstallerMonthlyPaymentAction(
  installerId: string,
  paymentMonth: string,
): Promise<InstallerMonthlyPaymentMutationResult> {
  const normalizedInstallerId = installerId.trim();
  const normalizedPaymentMonth = paymentMonth.trim();

  if (!normalizedInstallerId) {
    return {
      ok: false,
      action: "blocked",
      message: "חסר מתקין לסנכרון תשלום חודשי.",
    };
  }

  if (!/^\d{4}-\d{2}$/.test(normalizedPaymentMonth)) {
    return {
      ok: false,
      action: "blocked",
      message: "חודש התשלום אינו תקין.",
    };
  }

  return syncInstallerMonthlyPayment({
    installerId: normalizedInstallerId,
    paymentMonth: normalizedPaymentMonth,
  });
}

export async function markInstallerMonthlyPaymentPaidAction(
  recordId: string,
  installerId: string,
  paymentMonth: string,
): Promise<InstallerMonthlyPaymentMutationResult> {
  const normalizedRecordId = recordId.trim();
  const normalizedInstallerId = installerId.trim();
  const normalizedPaymentMonth = paymentMonth.trim();

  if (!/^rec[A-Za-z0-9]{14}$/.test(normalizedRecordId)) {
    return {
      ok: false,
      action: "blocked",
      message: "רשומת התשלום אינה תקינה.",
    };
  }

  if (!/^rec[A-Za-z0-9]{14}$/.test(normalizedInstallerId)) {
    return {
      ok: false,
      action: "blocked",
      message: "חסר מתקין לסימון תשלום כשולם.",
    };
  }

  if (!/^\d{4}-\d{2}$/.test(normalizedPaymentMonth)) {
    return {
      ok: false,
      action: "blocked",
      message: "חודש התשלום אינו תקין.",
    };
  }

  return markInstallerMonthlyPaymentPaid({
    recordId: normalizedRecordId,
    installerId: normalizedInstallerId,
    paymentMonth: normalizedPaymentMonth,
  });
}
