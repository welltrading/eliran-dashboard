"use server";

import {
  createStandaloneOrder,
  updateCustomProduction,
  type CreateStandaloneOrderInput,
  type UpdateCustomProductionInput,
} from "@/lib/airtable/services/orders";
import {
  createOrderTask,
  type CreateOrderTaskInput,
} from "@/lib/airtable/services/tasks";

export async function createStandaloneOrderAction(input: CreateStandaloneOrderInput) {
  return createStandaloneOrder(input);
}

export async function createOrderTaskAction(input: CreateOrderTaskInput) {
  return createOrderTask(input);
}

export async function updateCustomProductionAction(
  input: UpdateCustomProductionInput,
) {
  return updateCustomProduction(input);
}
