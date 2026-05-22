"use server";

import {
  approveTaskPayment,
  syncInstallerMonthlyPayment,
} from "@/lib/airtable/services/installers";
import type { InstallerMonthlyPaymentSyncResult } from "@/lib/types";

export async function approveTaskPaymentAction(taskId: string) {
  return approveTaskPayment(taskId);
}

export async function syncInstallerMonthlyPaymentAction(
  installerId: string,
  paymentMonth: string,
): Promise<InstallerMonthlyPaymentSyncResult> {
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
