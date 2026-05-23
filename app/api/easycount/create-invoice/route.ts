import { NextResponse } from "next/server";
import { getAirtableConfig } from "@/lib/airtable/config";
import { mapOrder } from "@/lib/airtable/mappers/orders";
import type { RawOrderFields } from "@/lib/airtable/raw-types";
import { airtableTables } from "@/lib/airtable/tables";
import type { OrderType } from "@/lib/types";

type CreateInvoiceRequest = {
  record_id?: unknown;
  doc_type?: unknown;
  order_type?: unknown;
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

  if (!recordId) {
    return NextResponse.json(
      { success: false, error: "Missing record_id" },
      { status: 400 },
    );
  }

  try {
    const order = await getOrder(recordId);

    if (order.easyCountDocumentUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Order already has EZ_DOC_URL",
          status: 409,
          details: { ezDocUrl: order.easyCountDocumentUrl },
        },
        { status: 409 },
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

    const makeResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        record_id: recordId,
        doc_type: "invoice_receipt",
        order_type: requestedOrderType ?? order.orderType,
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
