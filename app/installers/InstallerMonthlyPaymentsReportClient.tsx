"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { syncInstallerMonthlyPaymentAction } from "./actions";
import type {
  InstallerMonthlyPaymentSummary,
  InstallerMonthlyPaymentRecordState,
  InstallerMonthlyPaymentReport,
  InstallerMonthlyPaymentSyncResult,
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

function canSyncMonthlyPayment(state: InstallerMonthlyPaymentRecordState) {
  return (
    state.kind === "missing" ||
    (state.kind === "existing" &&
      (!state.record.status || state.record.status === "פתוח"))
  );
}

export function InstallerMonthlyPaymentsReportClient({
  report,
}: InstallerMonthlyPaymentsReportClientProps) {
  const router = useRouter();
  const [openInstallerId, setOpenInstallerId] = useState<string | null>(null);
  const [syncingInstallerId, setSyncingInstallerId] = useState<string | null>(null);
  const [syncResult, setSyncResult] =
    useState<InstallerMonthlyPaymentSyncResult | null>(null);

  function handleMonthChange(value: string) {
    if (!value) {
      return;
    }

    router.push(`/installers?paymentMonth=${value}`);
  }

  async function handleSyncMonthlyPayment(installer: InstallerMonthlyPaymentSummary) {
    setSyncResult(null);
    setSyncingInstallerId(installer.installerId);

    try {
      const result = await syncInstallerMonthlyPaymentAction(
        installer.installerId,
        report.selectedMonth,
      );

      setSyncResult(result);
      setSyncingInstallerId(null);

      if (result.ok) {
        router.refresh();
      }
    } catch {
      setSyncResult({
        ok: false,
        action: "blocked",
        message: "סנכרון התשלום החודשי נכשל. נסו שוב או בדקו את הרשומה באיירטייבל.",
      });
      setSyncingInstallerId(null);
    }
  }

  function renderMonthlyPaymentAction(installer: InstallerMonthlyPaymentSummary) {
    const state = installer.monthlyPaymentRecord;
    const isSyncing = syncingInstallerId === installer.installerId;

    if (state.kind === "duplicate") {
      return (
        <span className="badge badge--danger">
          קיימת כפילות רשומות תשלום — טיפול ידני נדרש
        </span>
      );
    }

    if (state.kind === "existing" && state.record.status === "שולם") {
      return (
        <span className="badge badge--success">
          שולם — נעול
        </span>
      );
    }

    if (
      state.kind === "existing" &&
      state.record.status &&
      state.record.status !== "פתוח"
    ) {
      return (
        <span className="badge badge--muted">
          {state.record.status} — נעול
        </span>
      );
    }

    return (
      <button
        className="task-row-actions__secondary"
        type="button"
        disabled={!canSyncMonthlyPayment(state) || syncingInstallerId !== null}
        onClick={() => handleSyncMonthlyPayment(installer)}
      >
        {isSyncing
          ? "מסנכרן..."
          : state.kind === "missing"
            ? "צור תשלום חודשי"
            : "סנכרן תשלום פתוח"}
      </button>
    );
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

      {syncResult ? (
        <div
          className={
            syncResult.ok ? "task-update-success" : "task-update-error"
          }
          role="alert"
          aria-live={syncResult.ok ? "polite" : "assertive"}
        >
          {syncResult.message}
        </div>
      ) : null}

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
                        <div className="task-row-actions">
                          {renderMonthlyPaymentAction(installer)}
                          <button
                            className="task-row-actions__secondary"
                            type="button"
                            onClick={() =>
                              setOpenInstallerId(isOpen ? null : installer.installerId)
                            }
                          >
                            {isOpen ? "הסתר פירוט" : "הצג פירוט"}
                          </button>
                        </div>
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
