"use server";

import {
  createQuote,
  type CreateQuoteInput,
  type CreateQuoteResult,
} from "@/lib/airtable/services/quotes";

export async function createQuoteAction(
  input: CreateQuoteInput,
): Promise<CreateQuoteResult> {
  return createQuote(input);
}
