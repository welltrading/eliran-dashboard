import { NextResponse } from "next/server";
import {
  requestOrderInvoiceTrigger,
  type OrderInvoiceTriggerStage,
} from "@/lib/airtable/services/orders";

type CreateInvoiceRequest = {
  record_id?: unknown;
  payment_stage?: unknown;
  invoice_stage?: unknown;
};

function invoiceStageValue(value: unknown): OrderInvoiceTriggerStage | null {
  if (value === "final_40") {
    return "final_40";
  }

  if (value === "advance_60" || value === "full_payment" || value === "first") {
    return "first";
  }

  return null;
}

export async function POST(request: Request) {

  let body: CreateInvoiceRequest;

  try {
    body = (await request.json()) as CreateInvoiceRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const orderId = typeof body.record_id === "string" ? body.record_id.trim() : "";
  const invoiceStage =
    invoiceStageValue(body.payment_stage) ?? invoiceStageValue(body.invoice_stage);

  if (!invoiceStage) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid invoice stage" },
      { status: 400 },
    );
  }

  const result = await requestOrderInvoiceTrigger({
    orderId,
    invoiceStage,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: result.message,
        details: result.errors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    order_id: result.orderId,
    updated_field_id: result.updatedFieldId,
  });
}
