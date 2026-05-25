"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import {
  markInstallerMonthlyPaymentPaidAction,
  syncInstallerMonthlyPaymentAction,
} from "./actions";
import type {
  InstallerMonthlyPaymentSummary,
  InstallerMonthlyPaymentRecordState,
  InstallerMonthlyPaymentReport,
  InstallerMonthlyPaymentMutationResult,
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
    <div
      className={`installer-monthly-report__payment-state${
        state.record.status === "שולם"
          ? " installer-monthly-report__payment-state--locked"
          : ""
      }`}
    >
      <span
        className={
          state.record.status === "שולם"
            ? "badge badge--success installer-monthly-report__locked-badge"
            : "badge badge--success"
        }
      >
        {state.record.status ?? "ללא סטטוס"}
      </span>
      <span>{formatCurrency(state.record.amount)}</span>
      <span>{state.record.includedApprovalCount} אישורים כלולים</span>
      {state.record.paymentDate ? (
        <span>תאריך תשלום: {formatDate(state.record.paymentDate)}</span>
      ) : null}
      {state.record.status === "שולם" ? (
        <span className="installer-monthly-report__locked-note">
          נעול מסנכרון ועדכון בדשבורד
        </span>
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

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function isMonthlyPaymentSynced(installer: InstallerMonthlyPaymentSummary) {
  const state = installer.monthlyPaymentRecord;

  if (state.kind !== "existing") {
    return false;
  }

  return (
    state.record.amount === installer.totalAmount &&
    sameStringSet(
      state.record.includedApprovalIds,
      installer.details.map((detail) => detail.approvalId),
    )
  );
}

export function InstallerMonthlyPaymentsReportClient({
  report,
}: InstallerMonthlyPaymentsReportClientProps) {
  const router = useRouter();
  const [openInstallerId, setOpenInstallerId] = useState<string | null>(null);
  const [syncingInstallerId, setSyncingInstallerId] = useState<string | null>(null);
  const [payingInstallerId, setPayingInstallerId] = useState<string | null>(null);
  const [mutationResult, setMutationResult] =
    useState<InstallerMonthlyPaymentMutationResult | null>(null);

  function handleMonthChange(value: string) {
    if (!value) {
      return;
    }

    router.push(`/installers?paymentMonth=${value}`);
  }

  async function handleSyncMonthlyPayment(installer: InstallerMonthlyPaymentSummary) {
    setMutationResult(null);
    setSyncingInstallerId(installer.installerId);

    try {
      const result = await syncInstallerMonthlyPaymentAction(
        installer.installerId,
        report.selectedMonth,
      );

      setMutationResult(result);
      setSyncingInstallerId(null);

      if (result.ok) {
        router.refresh();
      }
    } catch {
      setMutationResult({
        ok: false,
        action: "blocked",
        message: "סנכרון התשלום החודשי נכשל. נסו שוב או בדקו את הרשומה באיירטייבל.",
      });
      setSyncingInstallerId(null);
    }
  }

  async function handleMarkMonthlyPaymentPaid(installer: InstallerMonthlyPaymentSummary) {
    const state = installer.monthlyPaymentRecord;

    if (state.kind !== "existing") {
      return;
    }

    setMutationResult(null);
    setPayingInstallerId(installer.installerId);

    try {
      const result = await markInstallerMonthlyPaymentPaidAction(
        state.record.id,
        installer.installerId,
        report.selectedMonth,
      );

      setMutationResult(result);
      setPayingInstallerId(null);

      if (result.ok) {
        router.refresh();
      }
    } catch {
      setMutationResult({
        ok: false,
        action: "blocked",
        message: "סימון התשלום כשולם נכשל. נסו שוב או בדקו את הרשומה באיירטייבל.",
      });
      setPayingInstallerId(null);
    }
  }

  function renderMonthlyPaymentAction(installer: InstallerMonthlyPaymentSummary) {
    const state = installer.monthlyPaymentRecord;
    const isSyncing = syncingInstallerId === installer.installerId;
    const isPaying = payingInstallerId === installer.installerId;
    const hasPendingMutation = syncingInstallerId !== null || payingInstallerId !== null;

    if (state.kind === "duplicate") {
      return (
        <span className="badge badge--danger">
          קיימת כפילות רשומות תשלום — טיפול ידני נדרש
        </span>
      );
    }

    if (state.kind === "existing" && state.record.status === "שולם") {
      const synced = isMonthlyPaymentSynced(installer);

      return (
        <span
          className={
            synced
              ? "badge badge--success installer-monthly-report__locked-badge"
              : "badge badge--warning"
          }
        >
          {synced ? "שולם — נעול" : "שולם — קיים פער מול הדוח"}
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

    if (state.kind === "existing" && isMonthlyPaymentSynced(installer)) {
      return (
        <button
          className="task-row-actions__secondary"
          type="button"
          disabled={hasPendingMutation}
          onClick={() => handleMarkMonthlyPaymentPaid(installer)}
        >
          {isPaying ? "מסמן כשולם..." : "סמן כשולם"}
        </button>
      );
    }

    return (
      <button
        className="task-row-actions__secondary"
        type="button"
        disabled={!canSyncMonthlyPayment(state) || hasPendingMutation}
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
            מבוסס רק על אישורי ביצוע שאושרו ידנית לתשלום. אחרי סימון רשומה
            כשולמה, הדשבורד חוסם סנכרון או עדכון נוסף.
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

      {mutationResult ? (
        <div
          className={
            mutationResult.ok ? "task-update-success" : "task-update-error"
          }
          role="alert"
          aria-live={mutationResult.ok ? "polite" : "assertive"}
        >
          {mutationResult.message}
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
        <div className="pending-approvals">
          <div className="payment-workspace__chips installer-monthly-report__summary">
            <span className="badge badge--success">
              {report.totalApprovalCount} אישורים תקפים
            </span>
            <span className="badge badge--success">
              {formatCurrency(report.totalAmount)}
            </span>
            <span className="badge badge--muted">חודש Airtable: {report.airtableMonth}</span>
          </div>
          <div className="table-wrap">
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
        </div>
      )}
    </>
  );
}
