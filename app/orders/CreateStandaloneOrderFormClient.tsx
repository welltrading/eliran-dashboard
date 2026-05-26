"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OrderStatus, OrderType } from "@/lib/types";
import { createStandaloneOrderAction } from "./actions";

type CreateOrderState = {
  kind: "success" | "error";
  message: string;
  errors?: string[];
} | null;

const orderTypes: OrderType[] = ["סטנדרטי", "ייצור אישי"];
const orderStatuses: OrderStatus[] = [
  "חדשה",
  "בהכנה",
  "ממתינה לתשלום",
  "מוכנה להתקנה",
];
const glassTypes = [
  "גרניט",
  "זכוכית שקופה",
  "פסים",
  "שקופה",
  "ברונזה",
  "מושחר",
  "גלינה",
];
const hardwareColors = ["גרפיט", "לבן", "ניקל", "שחור", "זהב"];
const paymentMethods = ["העברה בנקאית", "אשראי", "מזומן", "ביט", "פייבוקס"];
const paymentModes = ["מקדמה 60%", "תשלום מלא"];

function numericInputValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculatedPayment(totalPrice: string, paymentMode: string) {
  const price = numericInputValue(totalPrice);

  if (paymentMode === "תשלום מלא") {
    return {
      paymentAmount: price,
      remainingAmount: 0,
    };
  }

  return {
    paymentAmount: price * 0.6,
    remainingAmount: price * 0.4,
  };
}

function formatCalculatedAmount(amount: number) {
  return amount.toLocaleString("he-IL", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

export function CreateStandaloneOrderFormClient() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("סטנדרטי");
  const [totalPrice, setTotalPrice] = useState("");
  const [paymentMode, setPaymentMode] = useState("מקדמה 60%");
  const [result, setResult] = useState<CreateOrderState>(null);
  const [isPending, startTransition] = useTransition();
  const paymentCalculation = calculatedPayment(totalPrice, paymentMode);

  function closeForm() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setResult(null);
  }

  function handleSubmit(formData: FormData, form: HTMLFormElement) {
    if (isPending) {
      return;
    }

    setResult(null);
    startTransition(async () => {
      const response = await createStandaloneOrderAction({
        customerName: String(formData.get("customerName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
        orderType: String(formData.get("orderType") ?? "סטנדרטי") as OrderType,
        orderStatus: String(formData.get("orderStatus") ?? "חדשה") as OrderStatus,
        productDescription: String(formData.get("productDescription") ?? "") || null,
        quantity: String(formData.get("quantity") ?? "") || null,
        width: String(formData.get("width") ?? "") || null,
        depth: String(formData.get("depth") ?? "") || null,
        height: String(formData.get("height") ?? "") || null,
        totalPrice: String(formData.get("totalPrice") ?? "") || null,
        paymentMode: String(formData.get("paymentMode") ?? "") || null,
        measurementRequired:
          String(formData.get("measurementRequired") ?? "") || null,
        dismantlingOption: String(formData.get("dismantlingOption") ?? "") || null,
        glassType: String(formData.get("glassType") ?? "") || null,
        hardwareColor: String(formData.get("hardwareColor") ?? "") || null,
        paymentMethod: String(formData.get("paymentMethod") ?? "") || null,
        paymentApproved: formData.get("paymentApproved") === "on",
        notes: String(formData.get("notes") ?? "") || null,
      });

      if (response.ok) {
        form.reset();
        setOrderType("סטנדרטי");
        setTotalPrice("");
        setPaymentMode("מקדמה 60%");
        setIsOpen(false);
        setResult({ kind: "success", message: response.message });
        router.refresh();
        return;
      }

      setResult({
        kind: "error",
        message: response.message,
        errors: response.errors,
      });
    });
  }

  return (
    <section className="standalone-task-creator" aria-label="יצירת הזמנה">
      <div className="standalone-task-creator__header">
        <div>
          <h2>הזמנות</h2>
          <p>יצירת הזמנה חדשה ללא הצעת מחיר וללא שורות הזמנה בשלב הזה.</p>
        </div>
        <div className="page-actions">
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setResult(null);
              setIsOpen((current) => !current);
            }}
            disabled={isPending}
          >
            צור הזמנה חדשה
          </button>
        </div>
      </div>

      {result ? (
        <div
          className={`result-panel result-panel--${result.kind === "success" ? "success" : "error"}`}
          role={result.kind === "success" ? "status" : "alert"}
        >
          <p>{result.message}</p>
          {result.errors && result.errors.length > 0 ? (
            <ul>
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {isOpen ? (
        <form
          className="standalone-task-creator__form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(new FormData(event.currentTarget), event.currentTarget);
          }}
        >
          <div className="task-assignment-editor__fields standalone-task-creator__fields">
            <label className="filter-field">
              <span className="filter-label">שם לקוח</span>
              <input
                className="filter-input"
                name="customerName"
                required
                disabled={isPending}
              />
            </label>

            <label className="filter-field">
              <span className="filter-label">טלפון</span>
              <input
                className="filter-input"
                name="phone"
                type="tel"
                required
                disabled={isPending}
              />
            </label>

            <label className="filter-field">
              <span className="filter-label">כתובת</span>
              <input
                className="filter-input"
                name="address"
                required
                disabled={isPending}
              />
            </label>

            <label className="filter-field">
              <span className="filter-label">סוג הזמנה</span>
              <select
                className="filter-select"
                name="orderType"
                value={orderType}
                onChange={(event) => setOrderType(event.target.value as OrderType)}
                disabled={isPending}
              >
                {orderTypes.map((orderType) => (
                  <option value={orderType} key={orderType}>
                    {orderType}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span className="filter-label">סטטוס התחלתי</span>
              <select
                className="filter-select"
                name="orderStatus"
                defaultValue="חדשה"
                disabled={isPending}
              >
                {orderStatuses.map((orderStatus) => (
                  <option value={orderStatus} key={orderStatus}>
                    {orderStatus}
                  </option>
                ))}
              </select>
            </label>

            {orderType === "ייצור אישי" ? (
              <>
                <label className="filter-field standalone-task-creator__notes">
                  <span className="filter-label">תיאור מוצר</span>
                  <textarea
                    className="filter-input"
                    name="productDescription"
                    rows={3}
                    required
                    disabled={isPending}
                  />
                </label>

                <label className="filter-field">
                  <span className="filter-label">כמות</span>
                  <input
                    className="filter-input"
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue="1"
                    required
                    disabled={isPending}
                  />
                </label>

                <label className="filter-field">
                  <span className="filter-label">מידות לקוח רוחב</span>
                  <input
                    className="filter-input"
                    name="width"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    disabled={isPending}
                  />
                </label>

                <label className="filter-field">
                  <span className="filter-label">מידות לקוח עומק</span>
                  <input
                    className="filter-input"
                    name="depth"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    disabled={isPending}
                  />
                </label>

                <label className="filter-field">
                  <span className="filter-label">גובה מקלחון</span>
                  <input
                    className="filter-input"
                    name="height"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    disabled={isPending}
                  />
                </label>

                <label className="filter-field">
                  <span className="filter-label">נדרשת מדידה?</span>
                  <select
                    className="filter-select"
                    name="measurementRequired"
                    defaultValue=""
                    required
                    disabled={isPending}
                  >
                    <option value="">בחר</option>
                    <option value="כן">כן</option>
                    <option value="לא">לא</option>
                  </select>
                </label>

                <label className="filter-field">
                  <span className="filter-label">אפשרות פירוק</span>
                  <select
                    className="filter-select"
                    name="dismantlingOption"
                    defaultValue=""
                    required
                    disabled={isPending}
                  >
                    <option value="">בחר</option>
                    <option value="נדרש פירוק">כן</option>
                    <option value="לא נדרש פירוק">לא</option>
                  </select>
                </label>

                <label className="filter-field">
                  <span className="filter-label">סוג זכוכית</span>
                  <select
                    className="filter-select"
                    name="glassType"
                    defaultValue=""
                    required
                    disabled={isPending}
                  >
                    <option value="">בחר זכוכית</option>
                    {glassTypes.map((glassType) => (
                      <option value={glassType} key={glassType}>
                        {glassType}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span className="filter-label">צבע פרזול</span>
                  <select
                    className="filter-select"
                    name="hardwareColor"
                    defaultValue=""
                    required
                    disabled={isPending}
                  >
                    <option value="">בחר צבע</option>
                    {hardwareColors.map((hardwareColor) => (
                      <option value={hardwareColor} key={hardwareColor}>
                        {hardwareColor}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <label className="filter-field">
              <span className="filter-label">מחיר בשקלים</span>
              <input
                className="filter-input"
                name="totalPrice"
                type="number"
                min="0"
                step="0.01"
                value={totalPrice}
                onChange={(event) => setTotalPrice(event.target.value)}
                required={orderType === "ייצור אישי"}
                disabled={isPending}
              />
            </label>

            <label className="filter-field">
              <span className="filter-label">תשלום מלא / מקדמה 60%</span>
              <select
                className="filter-select"
                name="paymentMode"
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value)}
                disabled={isPending}
              >
                {paymentModes.map((mode) => (
                  <option value={mode} key={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <div className="filter-field" aria-live="polite">
              <span className="filter-label">
                {paymentMode === "תשלום מלא"
                  ? "סכום לתשלום"
                  : "סכום מקדמה 60%"}
              </span>
              <div className="filter-input filter-input--readonly">
                ₪{formatCalculatedAmount(paymentCalculation.paymentAmount)}
              </div>
            </div>

            <div className="filter-field" aria-live="polite">
              <span className="filter-label">יתרת תשלום</span>
              <div className="filter-input filter-input--readonly">
                ₪{formatCalculatedAmount(paymentCalculation.remainingAmount)}
              </div>
            </div>

            <label className="filter-field">
              <span className="filter-label">אמצעי תשלום</span>
              <select
                className="filter-select"
                name="paymentMethod"
                defaultValue=""
                disabled={isPending}
              >
                <option value="">ללא אמצעי תשלום</option>
                {paymentMethods.map((paymentMethod) => (
                  <option value={paymentMethod} key={paymentMethod}>
                    {paymentMethod}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkbox-field">
              <input
                name="paymentApproved"
                type="checkbox"
                disabled={isPending}
              />
              <span>אישור תשלום התקבל</span>
            </label>

            <label className="filter-field standalone-task-creator__notes">
              <span className="filter-label">הערות</span>
              <textarea
                className="filter-input"
                name="notes"
                rows={3}
                disabled={isPending}
              />
            </label>
          </div>

          <div className="task-assignment-editor__actions">
            <button className="primary-action" type="submit" disabled={isPending}>
              {isPending ? "יוצר הזמנה..." : "שמור הזמנה"}
            </button>
            <button
              className="task-row-actions__secondary"
              type="button"
              disabled={isPending}
              onClick={closeForm}
            >
              ביטול
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
