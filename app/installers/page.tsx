import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function InstallersPage() {
  return (
    <div className="page">
      <PageHeader title="מתקינים" description="מעקב אחר צוותי התקנה ועומסים." />
      <Card>
        <div className="card__body placeholder">
          <div>
            <h2>עמוד מתקינים</h2>
            <p>בשלב הבא יופיעו כאן מתקינים, זמינות והתקנות קרובות.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
