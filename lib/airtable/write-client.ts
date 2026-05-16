import "server-only";
import { getAirtableConfig } from "./config";

type AirtableWriteRecord<TFields> = {
  id: string;
  createdTime: string;
  fields: TFields;
};

type AirtableWriteResponse<TFields> = {
  records: AirtableWriteRecord<TFields>[];
};

type CreateRecordInput = {
  fields: Record<string, unknown>;
};

function airtableTableUrl(baseId: string, tableName: string) {
  return `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
}

export async function createRecord<TFields>(
  tableName: string,
  fields: Record<string, unknown>,
) {
  const [record] = await createRecords<TFields>(tableName, [{ fields }]);

  if (!record) {
    throw new Error(`Airtable create failed for ${tableName}: empty response`);
  }

  return record;
}

export async function createRecords<TFields>(
  tableName: string,
  records: CreateRecordInput[],
) {
  const { apiKey, baseId } = getAirtableConfig();
  const response = await fetch(airtableTableUrl(baseId, tableName), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records,
      typecast: false,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Airtable create failed for ${tableName}: ${response.status} ${details}`);
  }

  const payload = (await response.json()) as AirtableWriteResponse<TFields>;
  return payload.records;
}

export async function updateRecord<TFields>(
  tableName: string,
  recordId: string,
  fields: Record<string, unknown>,
) {
  const { apiKey, baseId } = getAirtableConfig();
  const response = await fetch(`${airtableTableUrl(baseId, tableName)}/${recordId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields,
      typecast: false,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Airtable update failed for ${tableName}: ${response.status} ${details}`);
  }

  return (await response.json()) as AirtableWriteRecord<TFields>;
}

export async function deleteRecord(tableName: string, recordId: string) {
  const { apiKey, baseId } = getAirtableConfig();
  const response = await fetch(`${airtableTableUrl(baseId, tableName)}/${recordId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Airtable delete failed for ${tableName}: ${response.status} ${details}`);
  }
}
