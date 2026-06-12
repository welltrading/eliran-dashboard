"use server";

import {
  createQuote,
  type CreateQuoteInput,
  type CreateQuoteResult,
} from "@/lib/airtable/services/quotes";
import {
  createQuoteWithDocumentLines,
  type CreateQuoteWithDocumentLinesInput,
  type CreateQuoteWithDocumentLinesResult,
} from "@/lib/airtable/services/create-quote-with-document-lines";
import {
  createOrderCreationRequestFromQuote,
  type CreateOrderCreationRequestInput,
  type CreateOrderCreationRequestResult,
} from "@/lib/airtable/services/order-creation-requests";
import {
  DOCUMENT_LINES_WRITE_GUARD_ERROR,
  DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
  isDocumentLinesWriteGuardEnabled,
} from "@/lib/safety-guard.server";

export async function createQuoteAction(
  input: CreateQuoteInput,
): Promise<CreateQuoteResult> {
  if (isDocumentLinesWriteGuardEnabled()) {
    return {
      ok: false,
      message: DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
      errors: [DOCUMENT_LINES_WRITE_GUARD_ERROR],
    };
  }

  return createQuote(input);
}

export async function createQuoteWithDocumentLinesAction(
  input: CreateQuoteWithDocumentLinesInput,
): Promise<CreateQuoteWithDocumentLinesResult> {
  return createQuoteWithDocumentLines(input);
}

export async function createOrderCreationRequestFromQuoteAction(
  input: CreateOrderCreationRequestInput,
): Promise<CreateOrderCreationRequestResult> {
  return createOrderCreationRequestFromQuote(input);
}
