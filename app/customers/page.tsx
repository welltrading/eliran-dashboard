import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function CustomersPage() {
  return (
    <div className="page">
      <PageHeader title="לקוחות" description="פרטי לקוחות וקישור להזמנות והתקנות." />
      <Card>
        <div className="card__body placeholder">
          <div>
            <h2>עמוד לקוחות</h2>
            <p>בשלב הבא יופיעו כאן לקוחות, פרטי קשר והיסטוריית פעילות.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
