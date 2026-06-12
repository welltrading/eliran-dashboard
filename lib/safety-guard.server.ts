import "server-only";

export {
  DOCUMENT_LINES_WRITE_GUARD_ERROR,
  DOCUMENT_LINES_WRITE_GUARD_MESSAGE,
} from "./safety-guard";

export function isDocumentLinesWriteGuardEnabled() {
  return process.env.DOCUMENT_LINES_WRITE_GUARD !== "disabled";
}
