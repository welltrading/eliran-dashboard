import { NextResponse } from "next/server";
import { getAirtableConfig } from "@/lib/airtable/config";
import { mapOrder } from "@/lib/airtable/mappers/orders";
import type { RawOrderFields } from "@/lib/airtable/raw-types";
import { airtableTables } from "@/lib/airtable/tables";
import type { Order, OrderType, PaymentStage } from "@/lib/types";

type CreateInvoiceRequest = {
  record_id?: unknown;
  doc_type?: unknown;
  order_type?: unknown;
  payment_stage?: unknown;
  invoice_stage?: unknown;
};

type AirtableRecordResponse = {
  id: string;
  fields: RawOrderFields;
};

async function readMakeResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function getOrder(recordId: string) {
  const { apiKey, baseId } = getAirtableConfig();
  const url = new URL(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
      airtableTables.orders,
    )}/${recordId}`,
  );
  url.searchParams.set("returnFieldsByFieldId", "true");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Airtable order lookup failed: ${response.status} ${details}`);
  }

  const record = (await response.json()) as AirtableRecordResponse;
  return mapOrder(record);
}

function orderTypeValue(value: unknown): OrderType | null {
  if (value === "סטנדרטי" || value === "ייצור אישי") {
    return value;
  }

  return null;
}

function paymentStageValue(value: unknown): PaymentStage | null {
  if (
    value === "advance_60" ||
    value === "full_payment" ||
    value === "final_40"
  ) {
    return value;
  }

  return null;
}

function invoiceAmountForStage(order: Order, paymentStage: PaymentStage) {
  if (paymentStage === "advance_60") {
    return order.advancePaymentAmount;
  }

  if (paymentStage === "final_40") {
    return order.remainingPaymentAmount;
  }

  return order.totalPrice;
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

  const recordId =
    typeof body.record_id === "string" ? body.record_id.trim() : "";
  const requestedOrderType = orderTypeValue(body.order_type);
  const paymentStage =
    paymentStageValue(body.payment_stage) ?? paymentStageValue(body.invoice_stage);

  if (!recordId) {
    return NextResponse.json(
      { success: false, error: "Missing record_id" },
      { status: 400 },
    );
  }

  if (!paymentStage) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid payment_stage" },
      { status: 400 },
    );
  }

  try {
    const order = await getOrder(recordId);

    const existingDocument =
      paymentStage === "final_40"
        ? order.easyCountFinalDocumentUrl || order.easyCountFinalDocumentId
        : order.easyCountDocumentUrl || order.easyCountDocumentId;

    if (existingDocument) {
      return NextResponse.json(
        {
          success: false,
          error:
            paymentStage === "final_40"
              ? "Order already has final invoice receipt"
              : "Order already has invoice receipt",
          status: 409,
          details: { paymentStage, existingDocument },
        },
        { status: 409 },
      );
    }

    const amount = invoiceAmountForStage(order, paymentStage);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Order invoice amount is missing or invalid",
          status: 400,
          details: { paymentStage, amount },
        },
        { status: 400 },
      );
    }

    const webhookUrl = process.env.MAKE_CREATE_QUOTE_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Make webhook URL is not configured",
        },
        { status: 500 },
      );
    }

    const invoiceType = requestedOrderType ?? order.orderType;

    const makeResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        record_id: recordId,
        doc_type: "invoice_receipt",
        amount,
        payment_stage: paymentStage,
        invoice_stage: paymentStage,
        order_type: invoiceType,
        quote_type: invoiceType,
      }),
    });

    const details = await readMakeResponse(makeResponse);

    if (!makeResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Make webhook returned an error",
          status: makeResponse.status,
          details,
        },
        { status: makeResponse.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invoice receipt creation request sent to Make",
      make_response: details,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create invoice receipt request",
        status: 500,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
