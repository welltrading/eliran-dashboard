import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function TasksPage() {
  return (
    <div className="page">
      <PageHeader title="משימות / התקנות" description="ניהול תיאומים, ביצוע והשלמת התקנות." />
      <Card>
        <div className="card__body placeholder">
          <div>
            <h2>עמוד משימות / התקנות</h2>
            <p>בשלב הבא יופיעו כאן משימות, התקנות, סטטוסים ושיוך מתקינים.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
