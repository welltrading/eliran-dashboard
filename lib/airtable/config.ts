import "server-only";

export type AirtableConfig = {
  apiKey: string;
  baseId: string;
};

export function getAirtableConfig(): AirtableConfig {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey) {
    throw new Error("Missing AIRTABLE_API_KEY");
  }

  if (!baseId) {
    throw new Error("Missing AIRTABLE_BASE_ID");
  }

  return { apiKey, baseId };
}
