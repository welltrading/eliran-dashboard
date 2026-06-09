import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { getProductsForQuoteForm } from "@/lib/airtable/services/products";
import { getQuotes } from "@/lib/airtable/services/quotes";
import { QuotesTableClient } from "./QuotesTableClient";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const [quotes, products] = await Promise.all([
    getQuotes(),
    getProductsForQuoteForm(),
  ]);

  return (
    <div className="page page--wide">
      <PageHeader
        title="הצעות מחיר"
        description="מסך עבודה להצעות מחיר, לקוחות והפקת PDF."
      />

      <Card>
        <QuotesTableClient quotes={quotes} products={products} />
      </Card>
    </div>
  );
}
