import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { getPendingPaymentApprovalTasks } from "@/lib/airtable/services/installers";
import { ApprovalsClient } from "./ApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const tasks = await getPendingPaymentApprovalTasks();
  const approvableTaskCount = tasks.filter(
    (task) =>
      task.paymentAmount &&
      !task.paymentWarning &&
      task.paymentApprovalState === "pending_approval",
  ).length;
  const waitingForAutomationCount = tasks.filter(
    (task) => task.paymentApprovalState === "no_approval",
  ).length;
  const blockedTaskCount =
    tasks.length - approvableTaskCount - waitingForAutomationCount;

  return (
    <div className="page page--wide">
      <PageHeader
        title="אישורי ביצוע"
        description="משימות בסטטוס בוצע שממתינות לאישור אלירן לפני כניסה לתשלום."
      />

      <div className="grid stats-grid approvals-summary">
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">ממתינות לאישור</p>
            <p className="stat-card__value">{tasks.length}</p>
            <p className="stat-card__note">סטטוס בוצע ועדיין לא אושרו לתשלום</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">מוכנות לאישור</p>
            <p className="stat-card__value">{approvableTaskCount}</p>
            <p className="stat-card__note">קיים אישור ביצוע ממתין וסכום תקין</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">ממתינות לאוטומציה</p>
            <p className="stat-card__value">{waitingForAutomationCount}</p>
            <p className="stat-card__note">עדיין אין אישור ביצוע שנוצר ב-Airtable</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">חסומות</p>
            <p className="stat-card__value">{blockedTaskCount}</p>
            <p className="stat-card__note">חסר סכום, כפילות או סטטוס לא תקף</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="card__body pending-approvals__header">
          <div>
            <h2>ביצועים שממתינים לאישור תשלום</h2>
            <p>האישור משתמש בלוגיקה הקיימת ואינו יוצר מנגנון חדש.</p>
          </div>
        </div>
        <ApprovalsClient tasks={tasks} />
      </Card>
    </div>
  );
}
