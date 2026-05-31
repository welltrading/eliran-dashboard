"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  InstallerMonthlyPaymentMutationResult,
  InstallerMonthlyPaymentRow,
} from "@/lib/types";
import { markInstallerMonthlyPaymentPaidAction } from "./actions";

type PaymentsClientProps = {
  records: InstallerMonthlyPaymentRow[];
  selectedMonth: string;
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

function statusBadgeClass(status: string | null) {
  if (status === "שולם") {
    return "badge badge--success";
  }

  if (!status || status === "פתוח") {
    return "badge badge--warning";
  }

  return "badge badge--muted";
}

function isOpenPayment(status: string | null) {
  return !status || status === "פתוח";
}

export function PaymentsClient({ records, selectedMonth }: PaymentsClientProps) {
  const router = useRouter();
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);
  const [payingRecordId, setPayingRecordId] = useState<string | null>(null);
  const [mutationResult, setMutationResult] =
    useState<InstallerMonthlyPaymentMutationResult | null>(null);

  function handleMonthChange(value: string) {
    if (!value) {
      return;
    }

    router.push(`/payments?paymentMonth=${value}`);
  }

  async function handleMarkPaid(record: InstallerMonthlyPaymentRow) {
    if (!isOpenPayment(record.status) || payingRecordId) {
      return;
    }

    setMutationResult(null);
    setPayingRecordId(record.id);

    try {
      const result = await markInstallerMonthlyPaymentPaidAction(record.id);

      setMutationResult(result);
      setPayingRecordId(null);

      if (result.ok) {
        router.refresh();
      }
    } catch {
      setMutationResult({
        ok: false,
        action: "blocked",
        message: "סימון התשלום כשולם נכשל. נסו שוב או בדקו את הרשומה באיירטייבל.",
      });
      setPayingRecordId(null);
    }
  }

  return (
    <>
      <div className="card__body pending-approvals__header">
        <div>
          <h2>רשומות תשלום חודשיות</h2>
          <p>הנתונים מוצגים מתוך טבלת תשלומי מתקינים חודשיים בלבד.</p>
        </div>

        <label className="filter-field installer-monthly-report__month">
          <span className="filter-label">חודש לתשלום</span>
          <input
            className="filter-input"
            type="month"
            value={selectedMonth}
            onChange={(event) => handleMonthChange(event.target.value)}
            onInput={(event) => handleMonthChange(event.currentTarget.value)}
          />
        </label>
      </div>

      {mutationResult ? (
        <div
          className={mutationResult.ok ? "task-update-success" : "task-update-error"}
          role="alert"
          aria-live={mutationResult.ok ? "polite" : "assertive"}
        >
          {mutationResult.message}
        </div>
      ) : null}

      {records.length === 0 ? (
        <div className="card__body placeholder">
          <div>
            <h2>אין רשומות תשלום לחודש הנבחר</h2>
            <p>לא נמצאו רשומות קיימות בטבלת תשלומי מתקינים חודשיים.</p>
          </div>
        </div>
      ) : (
        <div className="pending-approvals">
          <div className="table-wrap">
            <table className="data-table payments-table">
              <thead>
                <tr>
                  <th>מתקין</th>
                  <th>חודש</th>
                  <th>אישורים כלולים</th>
                  <th>סכום לתשלום</th>
                  <th>סטטוס תשלום</th>
                  <th>תאריך תשלום</th>
                  <th>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const isOpen = openRecordId === record.id;
                  const isPaying = payingRecordId === record.id;
                  const canMarkPaid = isOpenPayment(record.status);

                  return (
                    <Fragment key={record.id}>
                      <tr>
                        <td>
                          <strong>{record.installerName}</strong>
                        </td>
                        <td>{record.paymentMonth}</td>
                        <td>{record.includedApprovalCount}</td>
                        <td>{formatCurrency(record.amount)}</td>
                        <td>
                          <span className={statusBadgeClass(record.status)}>
                            {record.status ?? "פתוח"}
                          </span>
                        </td>
                        <td>{formatDate(record.paymentDate)}</td>
                        <td>
                          <div className="task-row-actions">
                            {canMarkPaid ? (
                              <button
                                className="task-row-actions__secondary"
                                type="button"
                                disabled={Boolean(payingRecordId)}
                                onClick={() => handleMarkPaid(record)}
                              >
                                {isPaying ? "מסמן כשולם..." : "סמן כשולם"}
                              </button>
                            ) : (
                              <span className="badge badge--muted">אין פעולה</span>
                            )}
                            <button
                              className="task-row-actions__secondary"
                              type="button"
                              onClick={() =>
                                setOpenRecordId(isOpen ? null : record.id)
                              }
                            >
                              {isOpen ? "הסתר פירוט" : "הצג פירוט"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isOpen ? (
                        <tr className="installer-monthly-report__detail-row">
                          <td colSpan={7}>
                            <table className="data-table installer-monthly-report__details-table">
                              <thead>
                                <tr>
                                  <th>מספר אישור</th>
                                  <th>משימה</th>
                                  <th>סוג משימה</th>
                                  <th>תאריך</th>
                                  <th>סכום</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.includedApprovals.map((approval) => (
                                  <tr key={approval.id}>
                                    <td>{approval.approvalNumber ?? approval.approvalId}</td>
                                    <td>
                                      {approval.taskTitle ??
                                        approval.orderNumber ??
                                        "-"}
                                    </td>
                                    <td>{approval.taskType ?? "-"}</td>
                                    <td>{formatDate(approval.installationDate)}</td>
                                    <td>{formatCurrency(approval.amount)}</td>
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
