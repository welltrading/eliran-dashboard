"use server";

import { markInstallerMonthlyPaymentRecordPaid } from "@/lib/airtable/services/installers";

export async function markInstallerMonthlyPaymentPaidAction(
  monthlyPaymentRecordId: string,
) {
  return markInstallerMonthlyPaymentRecordPaid(monthlyPaymentRecordId);
}
