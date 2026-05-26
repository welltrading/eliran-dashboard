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
import { CreateInstallerFormClient } from "./CreateInstallerFormClient";
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
    { installers },
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
  const blockedPendingApprovalCount = pendingPaymentApprovalTasks.filter(
    (task) => task.paymentWarning || !task.paymentAmount,
  ).length;
  const openMonthlyPaymentRecordCount =
    monthlyPaymentReport.installerSummaries.filter((installer) => {
      const state = installer.monthlyPaymentRecord;
      return (
        state.kind === "existing" &&
        (!state.record.status || state.record.status === "פתוח")
      );
    }).length;
  const paidLockedMonthlyPaymentRecordCount =
    monthlyPaymentReport.installerSummaries.filter((installer) => {
      const state = installer.monthlyPaymentRecord;
      return state.kind === "existing" && state.record.status === "שולם";
    }).length;

  return (
    <div className="page">
      <PageHeader
        title="מתקינים ותשלומים"
        description="מרחב העבודה לאישור ביצוע ידני, דוח תשלומים חודשי וסגירת תשלום למתקינים."
      />

      <Card className="validation-card">
        <CreateInstallerFormClient airtableTableUrl={AIRTABLE_INSTALLERS_TABLE_URL} />
      </Card>

      <div className="grid stats-grid inventory-summary">
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">ממתינות לאישור אלירן</p>
            <p className="stat-card__value">{pendingPaymentApprovalTasks.length}</p>
            <p className="stat-card__note">משימות שבוצעו ועדיין אינן מאושרות לתשלום</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">חסומות לאישור</p>
            <p className="stat-card__value">{blockedPendingApprovalCount}</p>
            <p className="stat-card__note">חסר סכום, כפילות או אישור בעייתי</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">מאושר בחודש הנבחר</p>
            <p className="stat-card__value">
              {formatCurrency(monthlyPaymentReport.totalAmount)}
            </p>
            <p className="stat-card__note">
              {monthlyPaymentReport.totalApprovalCount} אישורי ביצוע תקפים
            </p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">תשלומים פתוחים</p>
            <p className="stat-card__value">{openMonthlyPaymentRecordCount}</p>
            <p className="stat-card__note">רשומות חודשיות שניתן עדיין לסנכרן</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">שולם / נעול</p>
            <p className="stat-card__value">{paidLockedMonthlyPaymentRecordCount}</p>
            <p className="stat-card__note">חסום מסנכרון ועדכון בדשבורד</p>
          </div>
        </Card>
      </div>

      <Card>
        <PendingPaymentApprovalsClient tasks={pendingPaymentApprovalTasks} />
      </Card>

      <Card>
        <InstallerMonthlyPaymentsReportClient report={monthlyPaymentReport} />
      </Card>

      <Card>
        <PaymentReliabilityControl data={paymentReliabilityControlData} />
      </Card>

      <Card>
        <TasksWithoutRateTable tasks={tasksWithoutRate} />
      </Card>

      <Card>
        <InstallerRatesTable rates={rates} />
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
