"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneText } from "@/components/ui/PhoneText";
import type {
  CustomProductionStatus,
  Order,
  PaymentStage,
  TaskStatus,
} from "@/lib/types";
import {
  createOrderTaskAction,
  updateCustomProductionAction,
} from "./actions";
import { CreateInvoiceButton } from "./CreateInvoiceButton";

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

type ProductionFilter = "הכל" | "ייצור אישי" | "נשלח למפעל" | "מוכן במפעל";

const assignmentTimeWindows = ["10-13", "13-16", "16-19"] as const;
const taskStatusOptions: TaskStatus[] = [
  "פתוח",
  "בטיפול",
  "הושלם",
  "לביצוע",
  "בוצע",
  "בוטל",
];
const customProductionStatusOptions: CustomProductionStatus[] = [
  "ממתין למדידה",
  "מדידה תואמה",
  "מדידה בוצעה",
  "ממתין לשרטוטים",
  "שרטוטים מוכנים",
  "נשלח למפעל",
  "מוכן במפעל",
  "התקנה תואמה",
  "הותקן",
];
const productionFilters: ProductionFilter[] = [
  "הכל",
  "ייצור אישי",
  "נשלח למפעל",
  "מוכן במפעל",
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

function formatOptionalCurrency(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return formatCurrency(value);
}

function firstPaymentStage(order: Order): PaymentStage {
  return order.paymentMode?.includes("מלא") ? "full_payment" : "advance_60";
}

function firstPaymentAmount(order: Order) {
  return firstPaymentStage(order) === "full_payment"
    ? order.totalPrice
    : order.advancePaymentAmount;
}

function isCustomProductionOrder(order: Order) {
  return order.orderType === "ייצור אישי" || order.orderType === "מעורב";
}

function productionBadgeClass(order: Order) {
  if (order.readyAtFactory || order.customProductionStatus === "הותקן") {
    return "badge badge--success";
  }

  if (order.sentToFactory || order.customProductionStatus === "נשלח למפעל") {
    return "badge badge--warning";
  }

  return "badge badge--muted";
}

function productionBadgeLabel(order: Order) {
  if (!isCustomProductionOrder(order)) {
    return null;
  }

  return order.customProductionStatus ?? "ייצור אישי";
}

function productionFilterMatches(order: Order, filter: ProductionFilter) {
  if (filter === "הכל") {
    return true;
  }

  if (filter === "ייצור אישי") {
    return isCustomProductionOrder(order);
  }

  if (filter === "נשלח למפעל") {
    return isCustomProductionOrder(order) && order.sentToFactory;
  }

  return isCustomProductionOrder(order) && order.readyAtFactory;
}

export function OrdersTableClient({
  orders,
  installerOptions,
  taskTypeOptions,
}: OrdersTableClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openTaskFormOrderId, setOpenTaskFormOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [productionSavingOrderId, setProductionSavingOrderId] = useState<
    string | null
  >(null);
  const [productionFilter, setProductionFilter] =
    useState<ProductionFilter>("הכל");
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function closeForm() {
    if (isPending) {
      return;
    }

    setOpenTaskFormOrderId(null);
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
        setOpenTaskFormOrderId(null);
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

  function handleUpdateCustomProduction(order: Order, formData: FormData) {
    if (isPending) {
      return;
    }

    setFeedback(null);
    setProductionSavingOrderId(order.id);

    startTransition(async () => {
      const result = await updateCustomProductionAction({
        orderId: order.id,
        customProductionStatus:
          (String(formData.get("customProductionStatus") ?? "") ||
            null) as CustomProductionStatus | null,
        finalProductionMeasurements:
          String(formData.get("finalProductionMeasurements") ?? "") || null,
        sentToFactory: formData.get("sentToFactory") === "on",
        readyAtFactory: formData.get("readyAtFactory") === "on",
      });

      if (result.ok) {
        setProductionSavingOrderId(null);
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
      setProductionSavingOrderId(null);
    });
  }

  const renderTaskForm = (order: Order) => {
    const isSavingCurrentOrder = savingOrderId === order.id;

    return (
      <tr className="tasks-table__assignment-row">
        <td colSpan={12}>
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

  const renderCustomProductionDetails = (order: Order) => {
    const isSavingCurrentOrder = productionSavingOrderId === order.id;

    return (
      <tr className="tasks-table__assignment-row orders-table__production-row">
        <td colSpan={12}>
          <div className="custom-production-panel">
            <form
              className="task-assignment-editor"
              onSubmit={(event) => {
                event.preventDefault();
                handleUpdateCustomProduction(
                  order,
                  new FormData(event.currentTarget),
                );
              }}
            >
              <div className="task-assignment-editor__heading">
                <div>
                  <strong>ייצור אישי</strong>
                  <span>
                    {order.orderNumber || order.id} · {order.customerName || "לקוח ללא שם"}
                  </span>
                </div>
                <div className="task-row-actions">
                  <button
                    className="task-row-actions__secondary"
                    type="button"
                    disabled={isSavingCurrentOrder}
                    onClick={() => {
                      setFeedback(null);
                      setOpenTaskFormOrderId((current) =>
                        current === order.id ? null : order.id,
                      );
                    }}
                  >
                    צור משימה להזמנה
                  </button>
                  <a
                    className="task-row-actions__secondary"
                    href={`/tasks?orderId=${encodeURIComponent(order.id)}`}
                  >
                    פתח משימות
                  </a>
                </div>
              </div>

              <div className="custom-production-panel__grid">
                <label className="filter-field">
                  <span className="filter-label">סטטוס ייצור אישי</span>
                  <select
                    className="filter-select"
                    name="customProductionStatus"
                    defaultValue={order.customProductionStatus ?? ""}
                    disabled={isSavingCurrentOrder}
                  >
                    <option value="">ללא סטטוס</option>
                    {customProductionStatusOptions.map((statusOption) => (
                      <option value={statusOption} key={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-field custom-production-panel__measurements">
                  <span className="filter-label">מידות סופיות לייצור</span>
                  <textarea
                    className="filter-input"
                    name="finalProductionMeasurements"
                    rows={4}
                    defaultValue={order.finalProductionMeasurements ?? ""}
                    disabled={isSavingCurrentOrder}
                  />
                </label>

                <div className="custom-production-panel__checks">
                  <label className="checkbox-field">
                    <input
                      name="sentToFactory"
                      type="checkbox"
                      defaultChecked={order.sentToFactory}
                      disabled={isSavingCurrentOrder}
                    />
                    <span>נשלח למפעל</span>
                  </label>
                  <span className="custom-production-panel__readonly">
                    תאריך שליחה: {formatDate(order.sentToFactoryDate)}
                  </span>

                  <label className="checkbox-field">
                    <input
                      name="readyAtFactory"
                      type="checkbox"
                      defaultChecked={order.readyAtFactory}
                      disabled={isSavingCurrentOrder}
                    />
                    <span>מוכן במפעל</span>
                  </label>
                  <span className="custom-production-panel__readonly">
                    תאריך מוכן: {formatDate(order.readyAtFactoryDate)}
                  </span>
                </div>

                <div className="custom-production-panel__files">
                  <span className="filter-label">שרטוטים למפעל</span>
                  {order.factoryDrawings.length > 0 ? (
                    <div>
                      {order.factoryDrawings.map((attachment) => (
                        <a
                          href={attachment.url}
                          key={attachment.id}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {attachment.filename}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p>אין שרטוטים מצורפים.</p>
                  )}
                </div>
              </div>

              <div className="task-assignment-editor__actions">
                <button
                  className="primary-action"
                  type="submit"
                  disabled={isSavingCurrentOrder}
                >
                  {isSavingCurrentOrder ? "שומר..." : "שמור ייצור אישי"}
                </button>
              </div>
            </form>
          </div>
        </td>
      </tr>
    );
  };

  const filteredOrders = orders.filter((order) =>
    productionFilterMatches(order, productionFilter),
  );

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

      <div className="filters-bar orders-filters" aria-label="סינון הזמנות">
        <label className="filter-field">
          <span className="filter-label">View</span>
          <select
            className="filter-select"
            value={productionFilter}
            onChange={(event) =>
              setProductionFilter(event.target.value as ProductionFilter)
            }
          >
            {productionFilters.map((filter) => (
              <option value={filter} key={filter}>
                {filter}
              </option>
            ))}
          </select>
        </label>
        <p className="table-summary">
          מציג {filteredOrders.length} מתוך {orders.length}
        </p>
      </div>

      <table className="data-table orders-table">
        <thead>
          <tr>
            <th>פעולה</th>
            <th>מספר הזמנה</th>
            <th>שם לקוח</th>
            <th>טלפון</th>
            <th>סוג הזמנה</th>
            <th>תיאור מוצר</th>
            <th>סטטוס</th>
            <th>תאריך יצירה</th>
            <th>מחיר כולל</th>
            <th>תשלום</th>
            <th>הערות קצרות</th>
            <th>מסמך EasyCount</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => {
            const initialPaymentStage = firstPaymentStage(order);
            const showFinalInvoice = initialPaymentStage === "advance_60";
            const linkedTaskCount = order.taskIds.length;
            const productionLabel = productionBadgeLabel(order);

            return (
            <Fragment key={order.id}>
              <tr>
                <td>
                  <div className="task-row-actions">
                    {linkedTaskCount > 0 ? (
                      <>
                        <a
                          className="task-row-actions__secondary"
                          href={`/tasks?orderId=${encodeURIComponent(order.id)}`}
                        >
                          {linkedTaskCount === 1 ? "פתח משימה" : "פתח משימות"}
                        </a>
                        <span className="badge badge--success">
                          {linkedTaskCount === 1
                            ? "כבר קיימת משימה"
                            : `קיימות ${linkedTaskCount} משימות`}
                        </span>
                        {isCustomProductionOrder(order) ? (
                          <button
                            className="task-row-actions__secondary"
                            type="button"
                            onClick={() => {
                              setFeedback(null);
                              setOpenTaskFormOrderId((current) =>
                                current === order.id ? null : order.id,
                              );
                            }}
                            disabled={isPending && savingOrderId !== order.id}
                          >
                            צור משימה נוספת
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <button
                        className="task-row-actions__secondary"
                        type="button"
                        onClick={() => {
                          setFeedback(null);
                          setOpenTaskFormOrderId((current) =>
                            current === order.id ? null : order.id,
                          );
                        }}
                        disabled={isPending && savingOrderId !== order.id}
                      >
                        צור משימה להזמנה
                      </button>
                    )}
                    {isCustomProductionOrder(order) ? (
                      <button
                        className="task-row-actions__secondary"
                        type="button"
                        onClick={() => {
                          setFeedback(null);
                          setExpandedOrderId((current) =>
                            current === order.id ? null : order.id,
                          );
                        }}
                      >
                        ייצור אישי
                      </button>
                    ) : null}
                  </div>
                </td>
                <td>{order.orderNumber || "-"}</td>
                <td>{order.customerName || "-"}</td>
                <td><PhoneText value={order.phone} /></td>
                <td>
                  <div className="orders-table__type-cell">
                    <span>{order.orderType}</span>
                    {productionLabel ? (
                      <span className={productionBadgeClass(order)}>
                        {productionLabel}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td>
                  {order.productDescription ? (
                    <div style={{ whiteSpace: "pre-line" }}>{order.productDescription}</div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{order.status || "-"}</td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{formatCurrency(order.totalPrice)}</td>
                <td>
                  <div className="order-payment-summary">
                    <span>{order.paymentMode || "-"}</span>
                    <span>מקדמה: {formatOptionalCurrency(order.advancePaymentAmount)}</span>
                    <span>יתרה: {formatOptionalCurrency(order.remainingPaymentAmount)}</span>
                  </div>
                </td>
                <td>{order.shortNotes ?? "-"}</td>
                <td className="orders-table__invoice-cell">
                  <div className="order-invoice-actions">
                    <div className="order-invoice-actions__item">
                      <div className="order-invoice-actions__meta">
                        <strong>
                          {initialPaymentStage === "full_payment"
                            ? "תשלום מלא"
                            : "מקדמה 60%"}
                        </strong>
                        <span>{formatOptionalCurrency(firstPaymentAmount(order))}</span>
                        {order.easyCountDocumentNumber ? (
                          <span>מסמך {order.easyCountDocumentNumber}</span>
                        ) : null}
                        {order.easyCountStatus ||
                        order.easyCountDocumentNumber ||
                        order.easyCountDocumentUrl ? (
                          <span>{order.easyCountStatus ?? "נשלח"}</span>
                        ) : null}
                        {order.easyCountError ? (
                          <span className="order-invoice-actions__error">
                            שגיאה: {order.easyCountError}
                          </span>
                        ) : null}
                      </div>
                      <CreateInvoiceButton
                        recordId={order.id}
                        orderType={order.orderType}
                        paymentStage={initialPaymentStage}
                        existingDocumentId={order.easyCountDocumentId}
                        existingDocumentUrl={order.easyCountDocumentUrl}
                        createLabel="הפקת חשבונית"
                        loadingLabel="מפיק חשבונית..."
                        existingLabel=""
                      />
                    </div>

                    {showFinalInvoice ? (
                      <div className="order-invoice-actions__item">
                        <div className="order-invoice-actions__meta">
                          <strong>יתרה 40%</strong>
                          <span>{formatOptionalCurrency(order.remainingPaymentAmount)}</span>
                          {order.easyCountFinalDocumentNumber ? (
                          <span>מסמך {order.easyCountFinalDocumentNumber}</span>
                        ) : null}
                          {order.easyCountFinalStatus ||
                          order.easyCountFinalDocumentNumber ||
                          order.easyCountFinalDocumentUrl ? (
                            <span>{order.easyCountFinalStatus ?? "נשלח"}</span>
                          ) : null}
                        {order.easyCountFinalError ? (
                          <span className="order-invoice-actions__error">
                              שגיאה: {order.easyCountFinalError}
                            </span>
                          ) : null}
                        </div>
                        <CreateInvoiceButton
                          recordId={order.id}
                          orderType={order.orderType}
                          paymentStage="final_40"
                          existingDocumentId={order.easyCountFinalDocumentId}
                          existingDocumentUrl={order.easyCountFinalDocumentUrl}
                          createLabel="הפקת יתרה"
                          loadingLabel="מפיק יתרה..."
                          existingLabel=""
                        />
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
              {expandedOrderId === order.id && isCustomProductionOrder(order)
                ? renderCustomProductionDetails(order)
                : null}
              {openTaskFormOrderId === order.id
                ? renderTaskForm(order)
                : null}
            </Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
