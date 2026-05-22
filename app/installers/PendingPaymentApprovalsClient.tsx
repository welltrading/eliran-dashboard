"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PendingPaymentApprovalTask } from "@/lib/types";
import { approveTaskPaymentAction } from "./actions";

type PendingPaymentApprovalsClientProps = {
  tasks: PendingPaymentApprovalTask[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("he-IL").format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function approvalStateLabel(task: PendingPaymentApprovalTask) {
  if (task.paymentApprovalState === "pending_approval") {
    return "קיים אישור ביצוע ממתין";
  }

  if (task.paymentApprovalState === "no_approval") {
    return "טרם נוצר אישור ביצוע";
  }

  if (task.paymentApprovalState === "duplicate_approval") {
    return `כפילות אישורי ביצוע (${task.existingApprovalCount})`;
  }

  if (task.paymentApprovalState === "canceled_approval") {
    return "קיים אישור ביצוע מבוטל";
  }

  return task.existingApprovalStatus
    ? `אישור ביצוע בסטטוס ${task.existingApprovalStatus}`
    : "אישור ביצוע לא תקף";
}

function approvalStateBadgeClass(task: PendingPaymentApprovalTask) {
  if (task.paymentApprovalState === "duplicate_approval") {
    return "badge badge--danger";
  }

  if (task.paymentApprovalState === "canceled_approval" || task.paymentWarning) {
    return "badge badge--warning";
  }

  if (task.paymentApprovalState === "pending_approval") {
    return "badge";
  }

  return "badge badge--muted";
}

export function PendingPaymentApprovalsClient({
  tasks,
}: PendingPaymentApprovalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  function handleApprove(task: PendingPaymentApprovalTask) {
    if (isPending || !task.paymentAmount || task.paymentWarning) {
      return;
    }

    setApprovalError(null);
    setApprovingTaskId(task.id);

    startTransition(async () => {
      const result = await approveTaskPaymentAction(task.id);

      if (result.ok) {
        setApprovingTaskId(null);
        router.refresh();
        return;
      }

      setApprovalError(
        [result.message, ...(result.errors ?? [])].filter(Boolean).join(" "),
      );
      setApprovingTaskId(null);
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="card__body placeholder">
        <div>
          <h2>אין משימות שממתינות לאישור אלירן לתשלום</h2>
          <p>כל המשימות שבוצעו ומשויכות למתקין כבר מאושרות לתשלום או שאין כאלה כרגע.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card__body pending-approvals__header">
        <div>
          <h2>משימות שממתינות לאישור אלירן לתשלום</h2>
          <p>
            {tasks.length} משימות שסומנו כבוצעו, יש להן מתקין, ועדיין אין להן
            אישור תשלום תקף.
          </p>
        </div>
      </div>

      <div className="table-wrap pending-approvals">
        {approvalError ? (
          <div className="task-update-error" role="alert" aria-live="assertive">
            {approvalError}
          </div>
        ) : null}

        <table className="data-table pending-approvals__table">
          <thead>
            <tr>
              <th>תאריך ביצוע</th>
              <th>לקוח</th>
              <th>מספר הזמנה</th>
              <th>סוג משימה</th>
              <th>מתקין</th>
              <th>סכום לתשלום</th>
              <th>מצב אישור ביצוע</th>
              <th>סיבת המתנה</th>
              <th>פעולה</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const canApprove = Boolean(task.paymentAmount) && !task.paymentWarning;
              const isApprovingCurrentTask = approvingTaskId === task.id;

              return (
                <tr
                  className={task.paymentWarning ? "data-table__row--warning" : undefined}
                  key={task.id}
                >
                  <td>{formatDate(task.executionDate)}</td>
                  <td>{task.customerName ?? "-"}</td>
                  <td>{task.orderNumber ?? "-"}</td>
                  <td>{task.taskType ?? "-"}</td>
                  <td>{task.installerName}</td>
                  <td>
                    {task.paymentAmount ? (
                      formatCurrency(task.paymentAmount)
                    ) : (
                      <span className="badge badge--warning">חסר תעריף</span>
                    )}
                  </td>
                  <td>
                    <span className={approvalStateBadgeClass(task)}>
                      {approvalStateLabel(task)}
                    </span>
                  </td>
                  <td>
                    {task.paymentWarning ? (
                      <span className="badge badge--warning">
                        {task.paymentWarning}
                      </span>
                    ) : (
                      "בוצע בפועל, יש מתקין, ואין אישור תשלום תקף."
                    )}
                  </td>
                  <td>
                    <button
                      className="primary-action"
                      type="button"
                      disabled={!canApprove || isApprovingCurrentTask}
                      onClick={() => handleApprove(task)}
                    >
                      {isApprovingCurrentTask
                        ? "מאשר..."
                        : "אשר ביצוע ותשלום"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
