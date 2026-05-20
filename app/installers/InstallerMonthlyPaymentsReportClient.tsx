"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import type {
  InstallerMonthlyPaymentRecordState,
  InstallerMonthlyPaymentReport,
} from "@/lib/types";

type InstallerMonthlyPaymentsReportClientProps = {
  report: InstallerMonthlyPaymentReport;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
  }).format(date);
}

function renderMonthlyPaymentRecordState(state: InstallerMonthlyPaymentRecordState) {
  if (state.kind === "missing") {
    return (
      <div className="installer-monthly-report__payment-state">
        <span className="badge badge--muted">לא נוצרה רשומת תשלום</span>
      </div>
    );
  }

  if (state.kind === "duplicate") {
    return (
      <div className="installer-monthly-report__payment-state">
        <span className="badge badge--danger">כפילות רשומות תשלום חודשיות</span>
        <span>{state.records.length} רשומות</span>
      </div>
    );
  }

  return (
    <div className="installer-monthly-report__payment-state">
      <span className="badge badge--success">
        {state.record.status ?? "ללא סטטוס"}
      </span>
      <span>{formatCurrency(state.record.amount)}</span>
      <span>{state.record.includedApprovalCount} אישורים כלולים</span>
      {state.record.paymentDate ? (
        <span>תשלום: {formatDate(state.record.paymentDate)}</span>
      ) : null}
    </div>
  );
}

export function InstallerMonthlyPaymentsReportClient({
  report,
}: InstallerMonthlyPaymentsReportClientProps) {
  const router = useRouter();
  const [openInstallerId, setOpenInstallerId] = useState<string | null>(null);

  function handleMonthChange(value: string) {
    if (!value) {
      return;
    }

    router.push(`/installers?paymentMonth=${value}`);
  }

  return (
    <>
      <div className="card__body pending-approvals__header">
        <div>
          <h2>דוח סוף חודש — תשלומים למתקינים</h2>
          <p>
            {report.totalApprovalCount} אישורים תקפים לחודש {report.airtableMonth} ·{" "}
            {formatCurrency(report.totalAmount)}
          </p>
        </div>

        <label className="filter-field installer-monthly-report__month">
          <span className="filter-label">חודש לתשלום</span>
          <input
            className="filter-input"
            type="month"
            value={report.selectedMonth}
            onChange={(event) => handleMonthChange(event.target.value)}
            onInput={(event) => handleMonthChange(event.currentTarget.value)}
          />
        </label>
      </div>

      {report.installerSummaries.length === 0 ? (
        <div className="card__body placeholder">
          <div>
            <h2>אין אישורים תקפים בחודש הנבחר</h2>
            <p>לא נמצאו אישורי ביצוע מאושרים לתשלום עבור {report.airtableMonth}.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap pending-approvals">
          <table className="data-table installer-monthly-report__table">
            <thead>
              <tr>
                <th>מתקין</th>
                <th>כמות אישורים תקפים</th>
                <th>סה"כ לתשלום</th>
                <th>רשומת תשלום חודשית</th>
                <th>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {report.installerSummaries.map((installer) => {
                const isOpen = openInstallerId === installer.installerId;

                return (
                  <Fragment key={installer.installerId}>
                    <tr key={installer.installerId}>
                      <td>{installer.installerName}</td>
                      <td>{installer.approvalCount}</td>
                      <td>{formatCurrency(installer.totalAmount)}</td>
                      <td>
                        {renderMonthlyPaymentRecordState(
                          installer.monthlyPaymentRecord,
                        )}
                      </td>
                      <td>
                        <button
                          className="task-row-actions__secondary"
                          type="button"
                          onClick={() =>
                            setOpenInstallerId(isOpen ? null : installer.installerId)
                          }
                        >
                          {isOpen ? "הסתר פירוט" : "הצג פירוט"}
                        </button>
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr
                        className="installer-monthly-report__detail-row"
                        key={`${installer.installerId}-details`}
                      >
                        <td colSpan={5}>
                          <table className="data-table installer-monthly-report__details-table">
                            <thead>
                              <tr>
                                <th>תאריך התקנה</th>
                                <th>מספר הזמנה</th>
                                <th>לקוח</th>
                                <th>סוג משימה</th>
                                <th>סכום</th>
                                <th>סטטוס אישור</th>
                              </tr>
                            </thead>
                            <tbody>
                              {installer.details.map((detail) => (
                                <tr key={detail.id}>
                                  <td>{formatDate(detail.installationDate)}</td>
                                  <td>{detail.orderNumber ?? "-"}</td>
                                  <td>{detail.customerName ?? "-"}</td>
                                  <td>{detail.taskType ?? "-"}</td>
                                  <td>
                                    {formatCurrency(detail.amount)}
                                    {detail.amountMissing ? (
                                      <span className="badge badge--warning">
                                        חסר סכום
                                      </span>
                                    ) : null}
                                  </td>
                                  <td>{detail.approvalStatus}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
