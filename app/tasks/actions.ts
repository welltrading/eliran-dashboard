"use server";

import {
  markTaskDone,
  updateTaskAssignment,
  type UpdateTaskAssignmentInput,
} from "@/lib/airtable/services/tasks";

export async function markTaskDoneAction(taskId: string) {
  return markTaskDone(taskId);
}

export async function updateTaskAssignmentAction(input: UpdateTaskAssignmentInput) {
  return updateTaskAssignment(input);
}
