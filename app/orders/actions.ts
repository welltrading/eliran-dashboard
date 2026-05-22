"use server";

import {
  createOrderTask,
  type CreateOrderTaskInput,
} from "@/lib/airtable/services/tasks";

export async function createOrderTaskAction(input: CreateOrderTaskInput) {
  return createOrderTask(input);
}
