import "server-only";
import { selectRecords } from "../client";
import { mapTask } from "../mappers/tasks";
import type { RawTaskFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getTasks() {
  const records = await selectRecords<RawTaskFields>(airtableTables.tasks);
  return records.map(mapTask);
}
