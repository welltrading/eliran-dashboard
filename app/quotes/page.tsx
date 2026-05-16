import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { getQuotes } from "@/lib/airtable/services/quotes";
import { QuotesTableClient } from "./QuotesTableClient";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const quotes = await getQuotes();

  return (
    <div className="page">
      <PageHeader
        title="הצעות מחיר"
        description="טבלת הצעות מחיר לקריאה בלבד מתוך Airtable."
      />

      <Card>
        <QuotesTableClient quotes={quotes} />
      </Card>
    </div>
  );
}
