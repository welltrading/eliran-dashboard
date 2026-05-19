import { NextResponse } from "next/server";
import { getAirtableConfig } from "@/lib/airtable/config";
import { mapQuote } from "@/lib/airtable/mappers/quotes";
import type { RawQuoteFields } from "@/lib/airtable/raw-types";
import { airtableTables } from "@/lib/airtable/tables";

type CreateQuoteRequest = {
  record_id?: unknown;
  quote_type?: unknown;
};

type AirtableRecordResponse = {
  id: string;
  fields: RawQuoteFields;
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

async function getQuoteEzDocUrl(recordId: string) {
  const { apiKey, baseId } = getAirtableConfig();
  const url = new URL(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
      airtableTables.quotes,
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
    throw new Error(`Airtable quote lookup failed: ${response.status} ${details}`);
  }

  const record = (await response.json()) as AirtableRecordResponse;
  return mapQuote(record).ezDocUrl;
}

export async function POST(request: Request) {
  let body: CreateQuoteRequest;

  try {
    body = (await request.json()) as CreateQuoteRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const recordId =
    typeof body.record_id === "string" ? body.record_id.trim() : "";
  const quoteType =
    typeof body.quote_type === "string" ? body.quote_type.trim() : "";

  if (!recordId) {
    return NextResponse.json(
      { success: false, error: "Missing record_id" },
      { status: 400 },
    );
  }

  if (!quoteType) {
    return NextResponse.json(
      { success: false, error: "Missing quote_type" },
      { status: 400 },
    );
  }

  const webhookUrl = process.env.MAKE_CREATE_QUOTE_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { success: false, error: "Missing MAKE_CREATE_QUOTE_WEBHOOK_URL" },
      { status: 500 },
    );
  }

  try {
    const ezDocUrl = await getQuoteEzDocUrl(recordId);

    if (ezDocUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote already has EZ_DOC_URL",
          status: 409,
          details: { ezDocUrl },
        },
        { status: 409 },
      );
    }

    const makeResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        record_id: recordId,
        doc_type: "quote",
        quote_type: quoteType,
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
      message: "Quote creation request sent to Make",
      make_response: details,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create quote request",
        status: 500,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
