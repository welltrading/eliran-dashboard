import "server-only";
import { selectRecords } from "../client";
import { mapCustomer } from "../mappers/customers";
import type { RawCustomerFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getCustomers() {
  const records = await selectRecords<RawCustomerFields>(airtableTables.customers);
  return records.map(mapCustomer);
}
