"use server";

import {
  createStandaloneOrder,
  requestOrderInvoiceTrigger,
  updateCustomProduction,
  type CreateStandaloneOrderInput,
  type RequestOrderInvoiceTriggerInput,
  type UpdateCustomProductionInput,
} from "@/lib/airtable/services/orders";
import {
  createOrderTask,
  type CreateOrderTaskInput,
} from "@/lib/airtable/services/tasks";
import {
  DOCUMENT_LINES_WRITE_GUARD_ERROR,
  DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
  isDocumentLinesWriteGuardEnabled,
} from "@/lib/safety-guard.server";

export async function createStandaloneOrderAction(input: CreateStandaloneOrderInput) {

  if (isDocumentLinesWriteGuardEnabled()) {
    return {
      ok: false as const,
      message: DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
      errors: [DOCUMENT_LINES_WRITE_GUARD_ERROR],
    };
  }

  return createStandaloneOrder(input);
}

export async function createOrderTaskAction(input: CreateOrderTaskInput) {

  return createOrderTask(input);
}

export async function updateCustomProductionAction(
  input: UpdateCustomProductionInput,
) {

  return updateCustomProduction(input);
}

export async function requestOrderInvoiceAction(
  input: RequestOrderInvoiceTriggerInput,
) {

  return requestOrderInvoiceTrigger(input);
}
