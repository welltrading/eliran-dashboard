"use server";

import { approveTaskPayment } from "@/lib/airtable/services/installers";

export async function approveTaskPaymentAction(taskId: string) {
  return approveTaskPayment(taskId);
}
