import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  getInstallerRatesControlData,
  getInstallerMonthlyPaymentReport,
  getInstallers,
  getPaymentReliabilityControlData,
  getPendingPaymentApprovalTasks,
} from "@/lib/airtable/services/installers";
import {
  InstallerRatesTable,
  TasksWithoutRateTable,
} from "./InstallerRatesControl";
import { InstallerMonthlyPaymentsReportClient } from "./InstallerMonthlyPaymentsReportClient";
import { InstallersTableClient } from "./InstallersTableClient";
import { PaymentReliabilityControl } from "./PaymentReliabilityControl";
import { PendingPaymentApprovalsClient } from "./PendingPaymentApprovalsClient";

export const dynamic = "force-dynamic";

const AIRTABLE_INSTALLERS_TABLE_URL =
  "https://airtable.com/app77CdzKEqLlhZ8d/tblNj2W8WJWbeG1sl";

type InstallersPageProps = {
  searchParams?: Promise<{
    paymentMonth?: string | string[];
  }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function InstallersPage({ searchParams }: InstallersPageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedPaymentMonth = Array.isArray(resolvedSearchParams?.paymentMonth)
    ? resolvedSearchParams?.paymentMonth[0]
    : resolvedSearchParams?.paymentMonth;
  const [
    { installers, summary },
    pendingPaymentApprovalTasks,
    { rates, tasksWithoutRate },
    monthlyPaymentReport,
    paymentReliabilityControlData,
  ] = await Promise.all([
    getInstallers(),
    getPendingPaymentApprovalTasks(),
    getInstallerRatesControlData(),
    getInstallerMonthlyPaymentReport(requestedPaymentMonth),
    getPaymentReliabilityControlData(),
  ]);

  return (
    <div className="page">
      <PageHeader
        title="מתקינים"
        description="מסך עבודה למעקב אחר מתקינים, משימות ואישורי תשלום."
      />

      <Card className="validation-card">
        <div className="card__body exception-panel__header">
          <p className="muted-text">הוספה ועריכת מתקינים מתבצעת כרגע באירטייבל.</p>
          <a
            className="primary-action"
            href={AIRTABLE_INSTALLERS_TABLE_URL}
            target="_blank"
            rel="noreferrer"
          >
            פתח טבלת מתקינים באירטייבל
          </a>
        </div>
      </Card>

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
        <TasksWithoutRateTable tasks={tasksWithoutRate} />
      </Card>

      <Card>
        <PendingPaymentApprovalsClient tasks={pendingPaymentApprovalTasks} />
      </Card>

      <Card>
        <InstallerRatesTable rates={rates} />
      </Card>

      <Card>
        <InstallerMonthlyPaymentsReportClient report={monthlyPaymentReport} />
      </Card>

      <Card>
        <PaymentReliabilityControl data={paymentReliabilityControlData} />
      </Card>

      <Card>
        <InstallersTableClient
          installers={installers}
          airtableTableUrl={AIRTABLE_INSTALLERS_TABLE_URL}
        />
      </Card>
    </div>
  );
}
