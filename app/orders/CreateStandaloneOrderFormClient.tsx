"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Product } from "@/lib/types";
import type {
  CreateStandaloneOrderLineInput,
  StandaloneOrderLineType,
} from "@/lib/airtable/services/orders";
import { createStandaloneOrderAction } from "./actions";

type CreateOrderState = {
  kind: "success" | "error";
  message: string;
  errors?: string[];
} | null;

type LineDraft = {
  id: string;
  lineType: StandaloneOrderLineType;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  exitLocation: string;
};

type CreateStandaloneOrderFormClientProps = {
  products: Product[];
};

const orderStatuses = [
  "חדש",
  "ממתין למדידה",
  "אחרי מדידה",
  "ממתין לאישור",
  "ממתין לתשלום",
  "הוזמן מהמפעל-ביצור",
  "מוכן להתקנה",
  "הותקן",
  "סגור",
  "לתיאום התקנה",
  "הומרה להזמנה",
  "בוטל",
  "ממתין לשרטוטים",
  "שרטוטים מוכנים",
];
const paymentMethods = ["העברה בנקאית", "אשראי", "מזומן", "ביט", "פייבוקס"];
const paymentModes = ["מקדמה 60%", "תשלום מלא"];
const lineTypes: StandaloneOrderLineType[] = [
  "סטנדרטי",
  "ייצור אישי",
  "מדידה",
  "עבודה / התקנה",
  "פירוק",
  "תוספת",
];

function newLineDraft(lineType: StandaloneOrderLineType = "סטנדרטי"): LineDraft {
  return {
    id: crypto.randomUUID(),
    lineType,
    productId: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
    exitLocation: "",
  };
}

function numericFormValue(value: string) {
  const normalized = value.trim();
  return normalized ? Number(normalized) : 0;
}

export function CreateStandaloneOrderFormClient({
  products,
}: CreateStandaloneOrderFormClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<CreateOrderState>(null);
  const [isPending, startTransition] = useTransition();
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([newLineDraft()]);

  function updateLineDraft(id: string, patch: Partial<LineDraft>) {
    setLineDrafts((currentLines) =>
      currentLines.map((line) =>
        line.id === id
          ? {
              ...line,
              ...patch,
              productId:
                patch.lineType && patch.lineType !== "סטנדרטי"
                  ? ""
                  : patch.productId ?? line.productId,
              description:
                patch.lineType === "סטנדרטי"
                  ? ""
                  : patch.description ?? line.description,
              exitLocation:
                patch.lineType && patch.lineType !== "סטנדרטי"
                  ? ""
                  : patch.exitLocation ?? line.exitLocation,
            }
          : line,
      ),
    );
  }

  function removeLineDraft(id: string) {
    setLineDrafts((currentLines) =>
      currentLines.length === 1
        ? currentLines
        : currentLines.filter((line) => line.id !== id),
    );
  }

  function closeForm() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setResult(null);
  }

  function linePayload(line: LineDraft): CreateStandaloneOrderLineInput {
    return {
      lineType: line.lineType,
      productId: line.lineType === "סטנדרטי" ? line.productId : null,
      description: line.lineType === "סטנדרטי" ? null : line.description || null,
      quantity: numericFormValue(line.quantity),
      unitPrice: numericFormValue(line.unitPrice),
      exitLocation:
        line.lineType === "סטנדרטי"
          ? (line.exitLocation as "חנות" | "מחסן")
          : null,
    };
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
        orderStatus: String(formData.get("orderStatus") ?? "חדש"),
        paymentMode: String(formData.get("paymentMode") ?? ""),
        paymentMethod: String(formData.get("paymentMethod") ?? ""),
        notes: String(formData.get("notes") ?? "") || null,
        lines: lineDrafts.map(linePayload),
      });

      if (response.ok) {
        form.reset();
        setLineDrafts([newLineDraft()]);
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
    <section className="standalone-task-creator" aria-label="יצירת הזמנה ללא הצעה">
      <div className="standalone-task-creator__header">
        <div>
          <h2>הזמנה ללא הצעה</h2>
          <p>יצירת הזמנה חדשה עם שורות מסמך, ללא הצעת מחיר.</p>
        </div>
        <button
          className="primary-action"
          type="button"
          onClick={() => {
            setResult(null);
            setIsOpen((current) => !current);
          }}
          disabled={isPending}
        >
          + הזמנה ללא הצעה
        </button>
      </div>

      {result ? (
        <div
          className={
            result.kind === "success"
              ? "task-update-success"
              : "task-update-error"
          }
          role={result.kind === "success" ? "status" : "alert"}
          aria-live="polite"
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
              <span className="filter-label">סטטוס</span>
              <select
                className="filter-select"
                name="orderStatus"
                defaultValue="חדש"
                disabled={isPending}
              >
                {orderStatuses.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span className="filter-label">תשלום מלא/מקדמה</span>
              <select
                className="filter-select"
                name="paymentMode"
                defaultValue="מקדמה 60%"
                required
                disabled={isPending}
              >
                {paymentModes.map((mode) => (
                  <option value={mode} key={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span className="filter-label">אמצעי תשלום</span>
              <select
                className="filter-select"
                name="paymentMethod"
                defaultValue=""
                required
                disabled={isPending}
              >
                <option value="">בחר אמצעי תשלום</option>
                {paymentMethods.map((paymentMethod) => (
                  <option value={paymentMethod} key={paymentMethod}>
                    {paymentMethod}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="task-assignment-editor">
            <div className="task-assignment-editor__heading">
              <div>
                <strong>שורות מסמך</strong>
                <span>השורות ייקשרו להזמנה ויפעילו את תהליך המלאי לפי הצורך.</span>
              </div>
            </div>

            <div className="quote-lines-list">
              {lineDrafts.map((line, index) => (
                <div className="quote-line-card" key={line.id}>
                  <div className="quote-line-card__fields">
                    <label className="filter-field">
                      <span className="filter-label">סוג שורה</span>
                      <select
                        className="filter-select"
                        value={line.lineType}
                        disabled={isPending}
                        onChange={(event) =>
                          updateLineDraft(line.id, {
                            lineType: event.target
                              .value as StandaloneOrderLineType,
                          })
                        }
                      >
                        {lineTypes.map((lineType) => (
                          <option value={lineType} key={lineType}>
                            {lineType === "עבודה / התקנה" ? "שירות" : lineType}
                          </option>
                        ))}
                      </select>
                    </label>

                    {line.lineType === "סטנדרטי" ? (
                      <label className="filter-field quote-line-card__main-field">
                        <span className="filter-label">מוצר</span>
                        <select
                          className="filter-select"
                          value={line.productId}
                          required
                          disabled={isPending}
                          onChange={(event) =>
                            updateLineDraft(line.id, {
                              productId: event.target.value,
                            })
                          }
                        >
                          <option value="">בחר מוצר</option>
                          {products.map((product) => (
                            <option value={product.id} key={product.id}>
                              {product.selectLabel}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="filter-field quote-line-card__main-field">
                        <span className="filter-label">תיאור שורה</span>
                        <textarea
                          className="filter-input"
                          rows={2}
                          value={line.description}
                          required
                          disabled={isPending}
                          onChange={(event) =>
                            updateLineDraft(line.id, {
                              description: event.target.value,
                            })
                          }
                        />
                      </label>
                    )}

                    <label className="filter-field">
                      <span className="filter-label">כמות</span>
                      <input
                        className="filter-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        required
                        disabled={isPending}
                        onChange={(event) =>
                          updateLineDraft(line.id, {
                            quantity: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="filter-field">
                      <span className="filter-label">מחיר יחידה</span>
                      <input
                        className="filter-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        required
                        disabled={isPending}
                        onChange={(event) =>
                          updateLineDraft(line.id, {
                            unitPrice: event.target.value,
                          })
                        }
                      />
                    </label>

                    {line.lineType === "סטנדרטי" ? (
                      <label className="filter-field">
                        <span className="filter-label">מיקום יציאה</span>
                        <select
                          className="filter-select"
                          value={line.exitLocation}
                          required
                          disabled={isPending}
                          onChange={(event) =>
                            updateLineDraft(line.id, {
                              exitLocation: event.target.value,
                            })
                          }
                        >
                          <option value="">בחר</option>
                          <option value="חנות">חנות</option>
                          <option value="מחסן">מחסן</option>
                        </select>
                      </label>
                    ) : null}
                  </div>

                  <div className="quote-line-card__actions">
                    <span className="muted-text">שורה {index + 1}</span>
                    <button
                      className="task-row-actions__secondary"
                      type="button"
                      disabled={isPending || lineDrafts.length === 1}
                      onClick={() => removeLineDraft(line.id)}
                    >
                      הסר שורה
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="task-assignment-editor__actions">
              <button
                className="task-row-actions__secondary"
                type="button"
                disabled={isPending}
                onClick={() =>
                  setLineDrafts((currentLines) => [
                    ...currentLines,
                    newLineDraft(),
                  ])
                }
              >
                הוסף שורה
              </button>
            </div>
          </div>

          <label className="filter-field standalone-task-creator__notes">
            <span className="filter-label">הערות</span>
            <textarea
              className="filter-input"
              name="notes"
              rows={3}
              disabled={isPending}
            />
          </label>

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
