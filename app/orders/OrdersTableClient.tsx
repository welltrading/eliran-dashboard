"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneText } from "@/components/ui/PhoneText";
import type { Order, TaskStatus } from "@/lib/types";
import { createOrderTaskAction } from "./actions";

type TaskInstallerOption = {
  id: string;
  name: string;
};

type TaskTypeOption = {
  id: string;
  name: string;
};

type OrdersTableClientProps = {
  orders: Order[];
  installerOptions: TaskInstallerOption[];
  taskTypeOptions: TaskTypeOption[];
};

const assignmentTimeWindows = ["10-13", "13-16", "16-19"] as const;
const taskStatusOptions: TaskStatus[] = [
  "פתוח",
  "בטיפול",
  "הושלם",
  "לביצוע",
  "בוצע",
  "בוטל",
];

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

export function OrdersTableClient({
  orders,
  installerOptions,
  taskTypeOptions,
}: OrdersTableClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function closeForm() {
    if (isPending) {
      return;
    }

    setOpenOrderId(null);
    setFeedback(null);
  }

  function handleCreateOrderTask(order: Order, formData: FormData) {
    if (isPending) {
      return;
    }

    setFeedback(null);
    setSavingOrderId(order.id);

    startTransition(async () => {
      const result = await createOrderTaskAction({
        orderId: order.id,
        executionDate: String(formData.get("executionDate") ?? "") || null,
        timeWindow: String(formData.get("timeWindow") ?? "") || null,
        status: String(formData.get("status") ?? "לביצוע") as TaskStatus,
        notes: String(formData.get("notes") ?? "") || null,
        taskTypeId: String(formData.get("taskTypeId") ?? "") || null,
        installerId: String(formData.get("installerId") ?? "") || null,
      });

      if (result.ok) {
        setOpenOrderId(null);
        setSavingOrderId(null);
        setFeedback({ kind: "success", message: result.message });
        router.refresh();
        return;
      }

      setFeedback({
        kind: "error",
        message: [result.message, ...(result.errors ?? [])]
          .filter(Boolean)
          .join(" "),
      });
      setSavingOrderId(null);
    });
  }

  const renderTaskForm = (order: Order) => {
    const isSavingCurrentOrder = savingOrderId === order.id;

    return (
      <tr className="tasks-table__assignment-row">
        <td colSpan={11}>
          <form
            className="task-assignment-editor"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateOrderTask(order, new FormData(event.currentTarget));
            }}
          >
            <div className="task-assignment-editor__heading">
              <div>
                <strong>יצירת משימה להזמנה</strong>
                <span>
                  {order.orderNumber || order.id} · {order.customerName || "לקוח ללא שם"}
                </span>
              </div>
            </div>

            <div className="task-assignment-editor__fields">
              <label className="filter-field">
                <span className="filter-label">סוג משימה</span>
                <select
                  className="filter-select"
                  name="taskTypeId"
                  defaultValue=""
                  disabled={isSavingCurrentOrder}
                >
                  <option value="">ללא סוג משימה</option>
                  {taskTypeOptions.map((taskTypeOption) => (
                    <option value={taskTypeOption.id} key={taskTypeOption.id}>
                      {taskTypeOption.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span className="filter-label">מתקין</span>
                <select
                  className="filter-select"
                  name="installerId"
                  defaultValue=""
                  disabled={isSavingCurrentOrder}
                >
                  <option value="">ללא מתקין</option>
                  {installerOptions.map((installerOption) => (
                    <option value={installerOption.id} key={installerOption.id}>
                      {installerOption.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span className="filter-label">תאריך ביצוע</span>
                <input
                  className="filter-input"
                  type="date"
                  name="executionDate"
                  disabled={isSavingCurrentOrder}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">חלון זמן</span>
                <select
                  className="filter-select"
                  name="timeWindow"
                  defaultValue=""
                  disabled={isSavingCurrentOrder}
                >
                  <option value="">ללא חלון זמן</option>
                  {assignmentTimeWindows.map((timeWindow) => (
                    <option value={timeWindow} key={timeWindow}>
                      {timeWindow}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span className="filter-label">סטטוס</span>
                <select
                  className="filter-select"
                  name="status"
                  defaultValue="לביצוע"
                  disabled={isSavingCurrentOrder}
                >
                  {taskStatusOptions.map((taskStatusOption) => (
                    <option value={taskStatusOption} key={taskStatusOption}>
                      {taskStatusOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field standalone-task-creator__notes">
                <span className="filter-label">הערות</span>
                <textarea
                  className="filter-input"
                  name="notes"
                  rows={3}
                  disabled={isSavingCurrentOrder}
                />
              </label>
            </div>

            <div className="task-assignment-editor__actions">
              <button
                className="primary-action"
                type="submit"
                disabled={isSavingCurrentOrder}
              >
                {isSavingCurrentOrder ? "יוצר משימה..." : "צור משימה"}
              </button>
              <button
                className="task-row-actions__secondary"
                type="button"
                disabled={isSavingCurrentOrder}
                onClick={closeForm}
              >
                ביטול
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  };

  return (
    <>
      {feedback ? (
        <div
          className={
            feedback.kind === "success" ? "task-update-success" : "task-update-error"
          }
          role={feedback.kind === "success" ? "status" : "alert"}
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>פעולה</th>
            <th>מספר הזמנה</th>
            <th>שם לקוח</th>
            <th>טלפון</th>
            <th>סוג הזמנה</th>
            <th>מוצרים / תיאור הזמנה</th>
            <th>סטטוס</th>
            <th>תאריך יצירה</th>
            <th>מחיר כולל</th>
            <th>מסמך EasyCount</th>
            <th>הערות קצרות</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <Fragment key={order.id}>
              <tr>
                <td>
                  <div className="task-row-actions">
                    <button
                      className="task-row-actions__secondary"
                      type="button"
                      onClick={() => {
                        setFeedback(null);
                        setOpenOrderId((current) =>
                          current === order.id ? null : order.id,
                        );
                      }}
                      disabled={isPending && savingOrderId !== order.id}
                    >
                      צור משימה להזמנה
                    </button>
                  </div>
                </td>
                <td>{order.orderNumber || "-"}</td>
                <td>{order.customerName || "-"}</td>
                <td><PhoneText value={order.phone} /></td>
                <td>{order.orderType}</td>
                <td>
                  {order.productSummary ? (
                    <div style={{ whiteSpace: "pre-line" }}>{order.productSummary}</div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{order.status || "-"}</td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{formatCurrency(order.totalPrice)}</td>
                <td>
                  {order.easyCountDocumentNumber ? (
                    <div>{order.easyCountDocumentNumber}</div>
                  ) : null}
                  {order.easyCountDocumentUrl ? (
                    <a
                      href={order.easyCountDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      פתיחת מסמך
                    </a>
                  ) : null}
                  {!order.easyCountDocumentNumber && !order.easyCountDocumentUrl
                    ? "-"
                    : null}
                </td>
                <td>{order.shortNotes ?? "-"}</td>
              </tr>
              {openOrderId === order.id ? renderTaskForm(order) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}
