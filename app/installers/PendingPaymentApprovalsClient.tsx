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

export function PendingPaymentApprovalsClient({
  tasks,
}: PendingPaymentApprovalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  function handleApprove(task: PendingPaymentApprovalTask) {
    if (isPending || !task.paymentAmount) {
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
          <h2>אין משימות שממתינות לאישור תשלום</h2>
          <p>כל המשימות שבוצעו ומשויכות למתקין כבר מאושרות או שאין כאלה כרגע.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card__body pending-approvals__header">
        <div>
          <h2>משימות שממתינות לאישור תשלום</h2>
          <p>{tasks.length} משימות שבוצעו ועדיין לא אושרו לתשלום.</p>
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
              <th>פעולה</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const hasPaymentAmount = Boolean(task.paymentAmount);
              const isApprovingCurrentTask = approvingTaskId === task.id;

              return (
                <tr key={task.id}>
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
                    <button
                      className="primary-action"
                      type="button"
                      disabled={!hasPaymentAmount || isApprovingCurrentTask}
                      onClick={() => handleApprove(task)}
                    >
                      {isApprovingCurrentTask ? "מאשר..." : "אשר לתשלום"}
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
