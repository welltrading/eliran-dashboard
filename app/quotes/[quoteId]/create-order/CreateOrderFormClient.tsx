"use client";

import { useMemo, useState, useTransition } from "react";
import type { OrderStatus, OrderType, Product, Quote } from "@/lib/types";
import { createOrderFromQuoteAction } from "./actions";

type DraftLine = {
  productId: string;
  description: string;
  width: string;
  depth: string;
  height: string;
  glassType: string;
  hardwareColor: string;
  dismantlingOption: string;
  measurementRequired: string;
  quantity: number;
  priceBeforeVat: number;
  totalPrice: number;
  location: string;
  affectsStock: boolean;
  notes: string;
};

type CreateOrderFormClientProps = {
  quote: Quote;
  products: Product[];
};

type SubmitResult = Awaited<ReturnType<typeof createOrderFromQuoteAction>> | null;

const orderStatuses: OrderStatus[] = [
  "חדשה",
  "בהכנה",
  "ממתינה לתשלום",
  "מוכנה להתקנה",
  "הושלמה",
  "בוטלה",
];

function positiveNumberOrDefault(value: number | null, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function validNonNegativeNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

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

function isPersistableLine(line: DraftLine, orderType: OrderType) {
  const hasRequiredIdentity =
    orderType === "סטנדרטי"
      ? line.productId.trim().length > 0
      : line.description.trim().length > 0;

  return (
    hasRequiredIdentity &&
    Number.isFinite(line.quantity) &&
    line.quantity > 0 &&
    Number.isFinite(line.totalPrice) &&
    line.totalPrice >= 0
  );
}

function initialLineFromQuote(quote: Quote, orderType: OrderType): DraftLine {
  const isCustom = orderType === "ייצור אישי";
  const description =
    quote.customSpecDescription ?? quote.customProductDescription ?? "";

  return {
    productId: orderType === "סטנדרטי" ? quote.productIds[0] ?? "" : "",
    description: isCustom ? description : "",
    width: isCustom ? quote.width ?? "" : "",
    depth: isCustom ? quote.depth ?? "" : "",
    height: isCustom ? quote.height ?? "" : "",
    glassType: isCustom ? quote.glassType ?? "" : "",
    hardwareColor: isCustom ? quote.hardwareColor ?? "" : "",
    dismantlingOption: isCustom ? quote.dismantlingOption ?? "" : "",
    measurementRequired: isCustom ? quote.measurementRequired ?? "" : "",
    quantity: positiveNumberOrDefault(quote.quantity, 1),
    priceBeforeVat: 0,
    totalPrice: validNonNegativeNumber(quote.totalPrice) ? quote.totalPrice : 0,
    location: "",
    affectsStock: false,
    notes: isCustom ? quote.quoteNotes ?? "" : "",
  };
}

export function CreateOrderFormClient({ quote, products }: CreateOrderFormClientProps) {
  const [isPending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState(quote.customerName);
  const [phone, setPhone] = useState(quote.phone ?? "");
  const [orderType, setOrderType] = useState<OrderType>(quote.quoteType);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("חדשה");
  const [totalPrice, setTotalPrice] = useState(quote.totalPrice);
  const [shortNotes, setShortNotes] = useState(quote.quoteNotes ?? "");
  const [lines, setLines] = useState<DraftLine[]>([
    initialLineFromQuote(quote, quote.quoteType),
  ]);
  const [submitResult, setSubmitResult] = useState<SubmitResult>(null);

  const lineTotal = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.totalPrice || 0), 0),
    [lines],
  );
  const productLabelById = useMemo(
    () => new Map(products.map((product) => [product.id, product.selectLabel])),
    [products],
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!customerName.trim()) {
      errors.push("שם לקוח הוא שדה חובה.");
    }

    if (!phone.trim()) {
      errors.push("טלפון הוא שדה חובה.");
    }

    if (!orderType) {
      errors.push("סוג הזמנה הוא שדה חובה.");
    }

    if (!orderStatus) {
      errors.push("סטטוס הזמנה הוא שדה חובה.");
    }

    if (lines.length === 0) {
      errors.push("נדרשת לפחות שורת הזמנה אחת.");
    }

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (orderType === "סטנדרטי" && !line.productId.trim()) {
        errors.push(`שורה ${lineNumber}: מוצר מהמלאי הוא שדה חובה בהזמנה סטנדרטית.`);
      }

      if (orderType === "ייצור אישי" && !line.description.trim()) {
        errors.push(`שורה ${lineNumber}: תיאור הוא שדה חובה.`);
      }

      if (line.quantity <= 0) {
        errors.push(`שורה ${lineNumber}: כמות חייבת להיות גדולה מ-0.`);
      }

      if (line.priceBeforeVat < 0 || line.totalPrice < 0) {
        errors.push(`שורה ${lineNumber}: מחירים חייבים להיות 0 או יותר.`);
      }

      if (orderType === "סטנדרטי" && !line.location) {
        errors.push(`שורה ${lineNumber}: מיקום יציאה נדרש בהזמנה סטנדרטית.`);
      }
    });

    if (totalPrice < 0) {
      errors.push("מחיר כולל חייב להיות 0 או יותר.");
    }

    return errors;
  }, [customerName, lines, orderStatus, orderType, phone, totalPrice]);

  const hasTotalWarning = Math.abs(lineTotal - totalPrice) > 0.01;
  const totalDifference = lineTotal - totalPrice;

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((currentLines) =>
      currentLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  function handleOrderTypeChange(nextOrderType: OrderType) {
    setOrderType(nextOrderType);
    setLines([initialLineFromQuote(quote, nextOrderType)]);
    setSubmitResult(null);
  }

  function handleSubmit() {
    setSubmitResult(null);

    if (validationErrors.length > 0 || isPending) {
      return;
    }

    startTransition(async () => {
      const persistableLines = lines.filter((line) =>
        isPersistableLine(line, orderType),
      );
      const result = await createOrderFromQuoteAction({
        quoteId: quote.id,
        customerName,
        phone,
        orderType,
        orderStatus,
        shortNotes,
        lines: persistableLines.map((line) => ({
          productId: orderType === "סטנדרטי" ? line.productId : null,
          description: line.description.trim(),
          width: orderType === "ייצור אישי" ? line.width : undefined,
          depth: orderType === "ייצור אישי" ? line.depth : undefined,
          height: orderType === "ייצור אישי" ? line.height : undefined,
          glassType: orderType === "ייצור אישי" ? line.glassType : undefined,
          hardwareColor: orderType === "ייצור אישי" ? line.hardwareColor : undefined,
          dismantlingOption:
            orderType === "ייצור אישי" ? line.dismantlingOption : undefined,
          measurementRequired:
            orderType === "ייצור אישי" ? line.measurementRequired : undefined,
          quantity: line.quantity,
          totalPrice: line.totalPrice,
          location: line.location || null,
        })),
      });

      setSubmitResult(result);
    });
  }

  return (
    <div className="form-layout">
      <section className="form-section">
        <div className="section-heading">
          <div>
            <h2>פרטי הצעת מחיר</h2>
            <p>נתונים אלה נטענים לקריאה בלבד מהצעת המחיר.</p>
          </div>
        </div>

        <div className="readonly-grid">
          <div>
            <span>מספר הצעה</span>
            <strong>{quote.quoteNumber || "-"}</strong>
          </div>
          <div>
            <span>סטטוס הצעה</span>
            <strong>{quote.status || "-"}</strong>
          </div>
          <div>
            <span>מקור הגעה</span>
            <strong>{quote.leadSource ?? "-"}</strong>
          </div>
          <div>
            <span>תאריך יצירת הצעה</span>
            <strong>{formatDate(quote.createdAt)}</strong>
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="section-heading">
          <div>
            <h2>פרטי הזמנה</h2>
            <p>טופס בדיקה בלבד. שמירה ל-Airtable תתווסף בשלב הבא.</p>
          </div>
        </div>

        <div className="form-grid">
          <label className="form-field">
            <span>שם לקוח</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span>טלפון</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>

          <label className="form-field">
            <span>סוג הזמנה</span>
            <select
              value={orderType}
              onChange={(event) => handleOrderTypeChange(event.target.value as OrderType)}
            >
              <option value="סטנדרטי">סטנדרטי</option>
              <option value="ייצור אישי">ייצור אישי</option>
            </select>
          </label>

          <label className="form-field">
            <span>סטטוס הזמנה</span>
            <select
              value={orderStatus}
              onChange={(event) => setOrderStatus(event.target.value as OrderStatus)}
            >
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>מחיר כולל</span>
            <input
              type="number"
              min="0"
              value={totalPrice}
              onChange={(event) => setTotalPrice(Number(event.target.value))}
            />
          </label>

          <label className="form-field form-field--wide">
            <span>הערות קצרות</span>
            <textarea
              value={shortNotes}
              onChange={(event) => setShortNotes(event.target.value)}
              rows={3}
            />
          </label>
        </div>
      </section>

      <section
        className={
          orderType === "סטנדרטי"
            ? "form-section form-section--standard"
            : "form-section form-section--custom"
        }
      >
        <div className="section-heading">
          <div>
            <span
              className={
                orderType === "סטנדרטי"
                  ? "path-badge path-badge--standard"
                  : "path-badge path-badge--custom"
              }
            >
              {orderType === "סטנדרטי" ? "סטנדרטי" : "ייצור אישי"}
            </span>
            <h2>
              {orderType === "סטנדרטי"
                ? "הזמנה סטנדרטית"
                : "הזמנת ייצור אישי"}
            </h2>
            <p>
              {orderType === "סטנדרטי"
                ? "בחירת מוצר קיים מהמלאי"
                : "מפרט לפי מידות ונתוני לקוח"}
            </p>
          </div>
        </div>

        {orderType === "סטנדרטי" && quote.productIds.length > 1 ? (
          <p className="path-warning">
            להצעה זו מקושרים כמה מוצרים. נבחר המוצר הראשון, ניתן לשנות ידנית.
          </p>
        ) : null}

        <div className="draft-lines">
          {lines.map((line, index) => (
            <div
              className={
                orderType === "סטנדרטי"
                  ? "draft-line draft-line--standard"
                  : "draft-line draft-line--custom"
              }
              key={index}
            >
              {orderType === "ייצור אישי" ? (
                <>
                  <label className="form-field form-field--wide">
                    <span>מוצר ייצור אישי / תיאור חופשי</span>
                    <textarea
                      rows={4}
                      value={line.description}
                      onChange={(event) => updateLine(index, { description: event.target.value })}
                      placeholder="לדוגמה: מקלחון בהתאמה אישית, מידות, זכוכית, פרזול"
                    />
                  </label>

                  <label className="form-field">
                    <span>רוחב</span>
                    <input
                      value={line.width}
                      onChange={(event) => updateLine(index, { width: event.target.value })}
                    />
                  </label>

                  <label className="form-field">
                    <span>עומק</span>
                    <input
                      value={line.depth}
                      onChange={(event) => updateLine(index, { depth: event.target.value })}
                    />
                  </label>

                  <label className="form-field">
                    <span>גובה</span>
                    <input
                      value={line.height}
                      onChange={(event) => updateLine(index, { height: event.target.value })}
                    />
                  </label>

                  <label className="form-field">
                    <span>סוג זכוכית</span>
                    <input
                      value={line.glassType}
                      onChange={(event) => updateLine(index, { glassType: event.target.value })}
                    />
                  </label>

                  <label className="form-field">
                    <span>צבע פרזול</span>
                    <input
                      value={line.hardwareColor}
                      onChange={(event) =>
                        updateLine(index, { hardwareColor: event.target.value })
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>אפשרות פירוק</span>
                    <input
                      value={line.dismantlingOption}
                      onChange={(event) =>
                        updateLine(index, { dismantlingOption: event.target.value })
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>נדרשת מדידה?</span>
                    <input
                      value={line.measurementRequired}
                      onChange={(event) =>
                        updateLine(index, { measurementRequired: event.target.value })
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>כמות</span>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, { quantity: Number(event.target.value) })
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>מחיר בשקלים</span>
                    <input
                      type="number"
                      min="0"
                      value={line.totalPrice}
                      onChange={(event) =>
                        updateLine(index, { totalPrice: Number(event.target.value) })
                      }
                    />
                  </label>

                  <label className="form-field form-field--wide">
                    <span>הערות</span>
                    <textarea
                      rows={3}
                      value={line.notes}
                      onChange={(event) => updateLine(index, { notes: event.target.value })}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="form-field form-field--wide">
                    <span>מוצר מהמלאי</span>
                    <select
                      value={line.productId}
                      onChange={(event) =>
                        updateLine(index, { productId: event.target.value })
                      }
                    >
                      <option value="">בחר מוצר</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.selectLabel}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field form-field--wide">
                    <span>מיקום יציאה</span>
                    <select
                      value={line.location}
                      onChange={(event) => updateLine(index, { location: event.target.value })}
                    >
                      <option value="">ללא</option>
                      <option value="חנות">חנות</option>
                      <option value="מחסן">מחסן</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>כמות</span>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, { quantity: Number(event.target.value) })
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>מחיר בשקלים</span>
                    <input
                      type="number"
                      min="0"
                      value={line.totalPrice}
                      onChange={(event) =>
                        updateLine(index, { totalPrice: Number(event.target.value) })
                      }
                    />
                  </label>

                  <label className="form-field form-field--wide">
                    <span>הערות</span>
                    <textarea
                      rows={3}
                      value={line.notes}
                      onChange={(event) => updateLine(index, { notes: event.target.value })}
                    />
                  </label>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="line-summary">
          <div>
            <span>סה״כ שורות</span>
            <strong>{formatCurrency(lineTotal)}</strong>
          </div>
          <div>
            <span>מחיר הזמנה</span>
            <strong>{formatCurrency(totalPrice)}</strong>
          </div>
          <div className={hasTotalWarning ? "line-summary__diff line-summary__diff--warning" : "line-summary__diff"}>
            <span>הפרש</span>
            <strong>{formatCurrency(totalDifference)}</strong>
          </div>
        </div>

        {hasTotalWarning ? (
          <p className="validation-warning">
            מחיר ההזמנה אינו תואם לסכום השורות.
          </p>
        ) : null}
      </section>

      <section className="form-section">
        <div className="section-heading">
          <div>
            <h2>תצוגת השפעה על מלאי</h2>
            <p>לא תיווצר תנועת מלאי בשלב זה.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>מוצר / תיאור</th>
                <th>מיקום</th>
                <th>כמות</th>
                <th>סוג תנועה מתוכנן</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`preview-${index}`}>
                  <td>
                    {orderType === "ייצור אישי"
                      ? line.description || "-"
                      : productLabelById.get(line.productId) ?? "-"}
                  </td>
                  <td>{line.location || "-"}</td>
                  <td>{line.quantity}</td>
                  <td>
                    {orderType === "סטנדרטי" && line.affectsStock
                      ? "יציאה מהמלאי"
                      : "-"}
                  </td>
                  <td>לא יישמר בשלב זה</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="form-section">
        <div className="validation-panel">
          <h2>בדיקות טופס</h2>
          {validationErrors.length > 0 ? (
            <ul>
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
              ) : (
                <p>הטופס תקין לבדיקה. שמירה תתווסף בשלב הבא.</p>
              )}
        </div>

        {submitResult ? (
          <div className={submitResult.ok ? "result-panel result-panel--success" : "result-panel result-panel--error"}>
            <strong>{submitResult.message}</strong>
            {submitResult.ok ? (
              <p>
                נוצרה הזמנה עם {submitResult.orderLineCount} שורות הזמנה.
              </p>
            ) : submitResult.errors.length > 0 ? (
              <ul>
                {submitResult.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <button
          className="primary-action"
          type="button"
          disabled={validationErrors.length > 0 || isPending || submitResult?.ok}
          onClick={handleSubmit}
        >
          {isPending ? "יוצר הזמנה..." : "יצירת הזמנה ושורות"}
        </button>
      </section>
    </div>
  );
}
