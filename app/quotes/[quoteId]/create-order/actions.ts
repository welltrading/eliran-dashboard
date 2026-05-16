"use server";

import type { CreateOrderFromQuoteInput } from "@/lib/airtable/services/create-order-from-quote";
import { createOrderFromQuote } from "@/lib/airtable/services/create-order-from-quote";

export async function createOrderFromQuoteAction(input: CreateOrderFromQuoteInput) {
  return createOrderFromQuote(input);
}
