import { notFound } from "next/navigation";
import { getQuoteById } from "@/lib/airtable/services/quotes";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { DOCUMENT_LINES_WRITE_GUARD_MESSAGE } from "@/lib/safety-guard";

export const dynamic = "force-dynamic";

type CreateOrderPageProps = {
  params: Promise<{
    quoteId: string;
  }>;
};

export default async function CreateOrderPage({ params }: CreateOrderPageProps) {
  const { quoteId } = await params;
  const quote = await getQuoteById(quoteId);

  if (!quote) {
    notFound();
  }

  return (
    <div className="page">
      <PageHeader
        title="יצירת הזמנה מהצעת מחיר"
        description="תצוגת תהליך פנימי לבדיקה בלבד. בשלב זה לא נשמר מידע."
      />

      <Card>
        <div className="card__body">
          <div className="placeholder">
            <div>
              <h2>{DOCUMENT_LINES_WRITE_GUARD_MESSAGE}</h2>
              <p>
                יצירת הזמנה מהצעה תיבנה מחדש דרך בקשות יצירת הזמנה ושורות מסמך.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
