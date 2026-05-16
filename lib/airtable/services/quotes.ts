import "server-only";
import { selectRecords } from "../client";
import { mapQuote } from "../mappers/quotes";
import type { RawQuoteFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getQuotes() {
  const records = await selectRecords<RawQuoteFields>(airtableTables.quotes, {
    returnFieldsByFieldId: true,
  });
  return records.map(mapQuote);
}

export async function getQuoteById(id: string) {
  const quotes = await getQuotes();
  return quotes.find((quote) => quote.id === id) ?? null;
}
