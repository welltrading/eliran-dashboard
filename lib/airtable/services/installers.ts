import "server-only";
import { selectRecords } from "../client";
import { mapInstaller } from "../mappers/installers";
import type { RawInstallerFields } from "../raw-types";
import { airtableTables } from "../tables";

export async function getInstallers() {
  const records = await selectRecords<RawInstallerFields>(airtableTables.installers);
  return records.map(mapInstaller);
}
