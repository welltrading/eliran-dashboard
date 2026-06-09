import { NextResponse } from "next/server";
import type { DocumentLine } from "@/lib/types";
import { getQuoteById } from "@/lib/airtable/services/quotes";

type CreateQuoteRequest = {
  record_id?: unknown;
  source?: unknown;
};

const airtableRecordIdPattern = /^rec[A-Za-z0-9]{14}$/;

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

function documentLineValidationError(line: DocumentLine, index: number) {
  const lineLabel = `שורת מסמך ${index + 1}`;

  if (!line.lineType) {
    return `${lineLabel}: חסר סוג שורה.`;
  }

  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    return `${lineLabel}: כמות חייבת להיות גדולה מ-0.`;
  }

  if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
    return `${lineLabel}: מחיר יחידה חייב להיות 0 או יותר.`;
  }

  if (
    line.lineType === "ייצור אישי" &&
    !line.description.trim() &&
    !line.displayDescription.trim()
  ) {
    return `${lineLabel}: שורת ייצור אישי חייבת תיאור.`;
  }

  if (
    line.lineType === "סטנדרטי" &&
    line.productIds.length === 0 &&
    !line.displayDescription.trim()
  ) {
    return `${lineLabel}: שורת סטנדרטי חייבת מוצר או תיאור לתצוגה.`;
  }

  return null;
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

  if (!airtableRecordIdPattern.test(recordId)) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid record_id" },
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
    const quote = await getQuoteById(recordId);

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 },
      );
    }

    if (quote.ezDocUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote already has EasyCount document",
          status: 409,
          details: { ezDocUrl: quote.ezDocUrl },
        },
        { status: 409 },
      );
    }

    if (quote.documentLines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote has no document lines",
        },
        { status: 400 },
      );
    }

    const validationErrors = quote.documentLines
      .map(documentLineValidationError)
      .filter((error): error is string => Boolean(error));

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote document lines are invalid",
          details: validationErrors,
        },
        { status: 400 },
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
        source: "document_lines",
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
