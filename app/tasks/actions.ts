"use server";

import {
  createStandaloneTask,
  markTaskDone,
  updateTaskAssignment,
  type CreateStandaloneTaskInput,
  type UpdateTaskAssignmentInput,
} from "@/lib/airtable/services/tasks";

export async function createStandaloneTaskAction(input: CreateStandaloneTaskInput) {
  return createStandaloneTask(input);
}

export async function markTaskDoneAction(taskId: string) {
  return markTaskDone(taskId);
}

export async function updateTaskAssignmentAction(input: UpdateTaskAssignmentInput) {
  return updateTaskAssignment(input);
}
