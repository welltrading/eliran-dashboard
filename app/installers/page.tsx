import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { getInstallers } from "@/lib/airtable/services/installers";
import { InstallersTableClient } from "./InstallersTableClient";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function InstallersPage() {
  const { installers, summary } = await getInstallers();

  return (
    <div className="page">
      <PageHeader
        title="מתקינים"
        description="דשבורד קריאה בלבד למעקב אחר מתקינים, משימות ותשלומים."
      />

      <div className="grid stats-grid inventory-summary">
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">סה"כ מתקינים</p>
            <p className="stat-card__value">{summary.totalInstallers}</p>
            <p className="stat-card__note">מתוך טבלת מתקינים</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">עם טלפון / נייד</p>
            <p className="stat-card__value">{summary.installersWithPhoneOrMobile}</p>
            <p className="stat-card__note">רשומות עם פרטי קשר</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">סכום לתשלום</p>
            <p className="stat-card__value">
              {formatCurrency(summary.totalApprovedAmountToPay)}
            </p>
            <p className="stat-card__note">Rollup מטבלת מתקינים</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">משימות החודש</p>
            <p className="stat-card__value">{summary.tasksScheduledThisMonth}</p>
            <p className="stat-card__note">לפי תאריך ביצוע</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">הושלמו ללא אישור</p>
            <p className="stat-card__value">{summary.completedTasksPendingApproval}</p>
            <p className="stat-card__note">
              {summary.completedTasksPendingApprovalIsBestEffort
                ? "Best-effort לפי קישורי משימה"
                : "לפי אישורי ביצוע"}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <InstallersTableClient installers={installers} />
      </Card>
    </div>
  );
}
