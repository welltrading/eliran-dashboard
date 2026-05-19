import "server-only";
import { getAirtableConfig } from "./config";

type AirtableRecord<TFields> = {
  id: string;
  createdTime: string;
  fields: TFields;
};

type AirtableListResponse<TFields> = {
  records: AirtableRecord<TFields>[];
  offset?: string;
};

type SelectOptions = {
  view?: string;
  pageSize?: number;
  filterByFormula?: string;
  returnFieldsByFieldId?: boolean;
  sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
  cache?: RequestCache;
  revalidate?: number;
};

function buildSelectUrl(baseId: string, tableName: string, options: SelectOptions) {
  const url = new URL(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
  );

  if (options.view) {
    url.searchParams.set("view", options.view);
  }

  if (options.pageSize) {
    url.searchParams.set("pageSize", String(options.pageSize));
  }

  if (options.filterByFormula) {
    url.searchParams.set("filterByFormula", options.filterByFormula);
  }

  if (options.returnFieldsByFieldId) {
    url.searchParams.set("returnFieldsByFieldId", "true");
  }

  options.sort?.forEach((sortItem, index) => {
    url.searchParams.set(`sort[${index}][field]`, sortItem.field);
    url.searchParams.set(`sort[${index}][direction]`, sortItem.direction ?? "asc");
  });

  return url;
}

export async function selectRecords<TFields>(
  tableName: string,
  options: SelectOptions = {},
) {
  const { apiKey, baseId } = getAirtableConfig();
  const records: AirtableRecord<TFields>[] = [];
  let offset: string | undefined;

  do {
    const url = buildSelectUrl(baseId, tableName, options);

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    };

    if (options.cache) {
      fetchOptions.cache = options.cache;
    } else {
      fetchOptions.next = {
        revalidate: options.revalidate ?? 60,
      };
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Airtable read failed for ${tableName}: ${response.status}`);
    }

    const payload = (await response.json()) as AirtableListResponse<TFields>;
    records.push(...payload.records);
    offset = payload.offset;
  } while (offset);

  return records;
}
