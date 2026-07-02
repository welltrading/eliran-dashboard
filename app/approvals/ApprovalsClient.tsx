"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PendingPaymentApprovalTask } from "@/lib/types";
import { approveTaskPaymentAction } from "./actions";

type ApprovalsClientProps = {
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

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
  }).format(date);
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
    return "ממתין לאישור אלירן";
  }

  if (task.paymentApprovalState === "no_approval") {
    return "ממתין לאוטומציה";
  }

  if (task.paymentApprovalState === "duplicate_approval") {
    return `כפילות אישורים (${task.existingApprovalCount})`;
  }

  if (task.paymentApprovalState === "canceled_approval") {
    return "אישור מבוטל";
  }

  return task.existingApprovalStatus
    ? `סטטוס ${task.existingApprovalStatus}`
    : "אישור לא תקף";
}

function approvalStateBadgeClass(task: PendingPaymentApprovalTask) {
  if (task.paymentApprovalState === "duplicate_approval") {
    return "badge badge--danger";
  }

  if (task.paymentApprovalState === "canceled_approval" || task.paymentWarning) {
    return "badge badge--warning";
  }

  if (task.paymentApprovalState === "pending_approval") {
    return "badge badge--success";
  }

  return "badge badge--muted";
}

function blockedReason(task: PendingPaymentApprovalTask) {
  if (task.paymentWarning) {
    return task.paymentWarning;
  }

  if (!task.paymentAmount) {
    return "חסר סכום לתשלום.";
  }

  if (task.paymentApprovalState === "no_approval") {
    return "אישור הביצוע ייווצר על ידי Airtable Automation.";
  }

  if (task.paymentApprovalState !== "pending_approval") {
    return "נדרש טיפול ידני לפני אישור.";
  }

  return null;
}

export function ApprovalsClient({ tasks }: ApprovalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  function handleApprove(task: PendingPaymentApprovalTask) {
    if (
      isPending ||
      !task.paymentAmount ||
      task.paymentWarning ||
      task.paymentApprovalState !== "pending_approval"
    ) {
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
          <h2>אין כרגע ביצועים שממתינים לאישור</h2>
          <p>כל המשימות שבוצעו כבר מאושרות לתשלום, או שעדיין אין משימות מוכנות.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-approvals">
      {approvalError ? (
        <div className="task-update-error" role="alert" aria-live="assertive">
          {approvalError}
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="data-table approvals-table">
          <thead>
            <tr>
              <th>תאריך משימה</th>
              <th>לקוח</th>
              <th>טלפון</th>
              <th>כתובת</th>
              <th>הזמנה</th>
              <th>סוג משימה</th>
              <th>מתקין</th>
              <th>סכום לתשלום</th>
              <th>סטטוס</th>
              <th>פעולה</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const canApprove =
                Boolean(task.paymentAmount) &&
                !task.paymentWarning &&
                task.paymentApprovalState === "pending_approval";
              const isApprovingCurrentTask = approvingTaskId === task.id;
              const reason = blockedReason(task);

              return (
                <tr
                  className={task.paymentWarning ? "data-table__row--warning" : undefined}
                  key={task.id}
                >
                  <td>{formatDate(task.executionDate)}</td>
                  <td>
                    <strong>{task.customerName ?? "-"}</strong>
                  </td>
                  <td>{task.phone ?? "-"}</td>
                  <td className="task-notes">{task.address ?? "-"}</td>
                  <td>
                    {task.orderId && task.orderNumber ? (
                      <Link href={{ pathname: "/orders", query: { orderId: task.orderId } }}>
                        {task.orderNumber}
                      </Link>
                    ) : (
                      task.orderNumber ?? "-"
                    )}
                  </td>
                  <td>{task.taskType ?? "-"}</td>
                  <td>{task.installerName}</td>
                  <td>
                    {task.paymentAmount ? (
                      formatCurrency(task.paymentAmount)
                    ) : (
                      <span className="badge badge--warning">חסר סכום</span>
                    )}
                  </td>
                  <td>
                    <div className="approval-status-cell">
                      <span className={approvalStateBadgeClass(task)}>
                        {approvalStateLabel(task)}
                      </span>
                      {reason ? <span>{reason}</span> : null}
                    </div>
                  </td>
                  <td>
                    {task.paymentApprovalState === "no_approval" ? (
                      <span className="badge badge--muted">ממתין לאוטומציה</span>
                    ) : (
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
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
