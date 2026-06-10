import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { RefreshDataButton } from "@/components/ui/RefreshDataButton";
import { getInstallerMonthlyPaymentsPageReport } from "@/lib/airtable/services/installers";
import { PaymentsClient } from "./PaymentsClient";

export const dynamic = "force-dynamic";

type PaymentsPageProps = {
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

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedPaymentMonth = Array.isArray(resolvedSearchParams?.paymentMonth)
    ? resolvedSearchParams?.paymentMonth[0]
    : resolvedSearchParams?.paymentMonth;
  const report = await getInstallerMonthlyPaymentsPageReport(
    requestedPaymentMonth,
  );

  return (
    <div className="page page--wide">
      <PageHeader
        title="תשלומי מתקינים"
        description="סוף חודש: כמה פתוח לתשלום, כמה כבר שולם, ולמי."
      />

      <div className="page-actions">
        <RefreshDataButton />
      </div>

      <div className="grid stats-grid payments-summary">
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">סה"כ פתוח לתשלום</p>
            <p className="stat-card__value">
              {formatCurrency(report.totalOpenAmount)}
            </p>
            <p className="stat-card__note">מתוך רשומות תשלום פתוחות בלבד</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">סה"כ שולם</p>
            <p className="stat-card__value">
              {formatCurrency(report.totalPaidAmount)}
            </p>
            <p className="stat-card__note">רשומות שכבר סומנו כשולמו</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">מתקינים לתשלום</p>
            <p className="stat-card__value">{report.installersToPayCount}</p>
            <p className="stat-card__note">מתקינים עם רשומה פתוחה בחודש</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">רשומות פתוחות</p>
            <p className="stat-card__value">{report.openRecordCount}</p>
            <p className="stat-card__note">חודש Airtable: {report.airtableMonth}</p>
          </div>
        </Card>
      </div>

      <Card>
        <PaymentsClient
          records={report.records}
          selectedMonth={report.selectedMonth}
        />
      </Card>
    </div>
  );
}
