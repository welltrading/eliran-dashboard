import "server-only";
import { selectRecords } from "../client";
import { mapProduct } from "../mappers/products";
import type { RawProductFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getProducts() {
  const records = await selectRecords<RawProductFields>(airtableTables.products, {
    returnFieldsByFieldId: true,
  });

  return records.map(mapProduct);
}
