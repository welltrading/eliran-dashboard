import { notFound } from "next/navigation";
import { getQuoteById } from "@/lib/airtable/services/quotes";
import { getProducts } from "@/lib/airtable/services/products";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { CreateOrderFormClient } from "./CreateOrderFormClient";

export const dynamic = "force-dynamic";

type CreateOrderPageProps = {
  params: Promise<{
    quoteId: string;
  }>;
};

export default async function CreateOrderPage({ params }: CreateOrderPageProps) {
  const { quoteId } = await params;
  const [quote, products] = await Promise.all([
    getQuoteById(quoteId),
    getProducts(),
  ]);

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
          <CreateOrderFormClient quote={quote} products={products} />
        </div>
      </Card>
    </div>
  );
}
