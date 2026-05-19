"use server";

import { markTaskDone } from "@/lib/airtable/services/tasks";

export async function markTaskDoneAction(taskId: string) {
  return markTaskDone(taskId);
}
