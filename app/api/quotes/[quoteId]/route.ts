import { NextResponse } from "next/server";
import { getQuoteById } from "@/lib/airtable/services/quotes";

type QuoteStatusRouteProps = {
  params: Promise<{
    quoteId: string;
  }>;
};

const airtableRecordIdPattern = /^rec[A-Za-z0-9]{14}$/;

export async function GET(_request: Request, { params }: QuoteStatusRouteProps) {
  const { quoteId } = await params;
  const recordId = quoteId.trim();

  if (!airtableRecordIdPattern.test(recordId)) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid quote id" },
      { status: 400 },
    );
  }

  const quote = await getQuoteById(recordId);

  if (!quote) {
    return NextResponse.json(
      { success: false, error: "Quote not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    quote: {
      id: quote.id,
      ezDocUrl: quote.ezDocUrl,
      ezDocNumber: quote.ezDocNumber,
      ezDocStatus: quote.status || null,
      ezDocError: quote.ezDocError,
    },
  });
}
