"use server";

import type { CreateOrderFromQuoteInput } from "@/lib/airtable/services/create-order-from-quote";
import { createOrderFromQuote } from "@/lib/airtable/services/create-order-from-quote";
import {
  DOCUMENT_LINES_WRITE_GUARD_ERROR,
  DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
  isDocumentLinesWriteGuardEnabled,
} from "@/lib/safety-guard.server";

export async function createOrderFromQuoteAction(input: CreateOrderFromQuoteInput) {
  if (isDocumentLinesWriteGuardEnabled()) {
    return {
      ok: false as const,
      message: DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
      errors: [DOCUMENT_LINES_WRITE_GUARD_ERROR],
    };
  }

  return createOrderFromQuote(input);
}
