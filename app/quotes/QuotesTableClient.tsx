"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PhoneText } from "@/components/ui/PhoneText";
import type { Product, Quote, QuoteType } from "@/lib/types";
import { createQuoteAction } from "./actions";
import { CreateQuoteButton } from "./CreateQuoteButton";

type QuoteTypeFilter = "הכל" | QuoteType;
type StatusFilter = "הכל" | "נשלח" | "ממתין" | "ריק";

type QuotesTableClientProps = {
  quotes: Quote[];
  products: Product[];
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

function matchesStatus(status: string, filter: StatusFilter) {
  const normalized = status.trim();

  if (filter === "הכל") {
    return true;
  }

  if (filter === "ריק") {
    return normalized.length === 0;
  }

  return normalized.includes(filter);
}

export function QuotesTableClient({ quotes, products }: QuotesTableClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [quoteType, setQuoteType] = useState<QuoteTypeFilter>("הכל");
  const [status, setStatus] = useState<StatusFilter>("הכל");
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [isCreatingQuote, startCreateQuote] = useTransition();

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return quotes.filter((quote) => {
      const searchableText = [
        quote.quoteNumber,
        quote.customerName,
        quote.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const searchMatches =
        !normalizedSearch || searchableText.includes(normalizedSearch);
      const typeMatches = quoteType === "הכל" || quote.quoteType === quoteType;
      const statusMatches = matchesStatus(quote.status, status);

      return searchMatches && typeMatches && statusMatches;
    });
  }, [quotes, quoteType, search, status]);

  function handleCreateQuote(formData: FormData) {
    if (isCreatingQuote) {
      return;
    }

    setCreateFeedback(null);

    startCreateQuote(async () => {
      const rawQuantity = String(formData.get("quantity") ?? "").trim();
      const result = await createQuoteAction({
        customerName: String(formData.get("customerName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
        productId: String(formData.get("productId") ?? ""),
        totalPrice: Number(formData.get("totalPrice") ?? 0),
        quantity: rawQuantity ? Number(rawQuantity) : 0,
        leadSource: String(formData.get("leadSource") ?? "") || null,
        notes: String(formData.get("notes") ?? "") || null,
      });

      if (result.ok) {
        setCreateFeedback({ kind: "success", message: result.message });
        setIsCreatePanelOpen(false);
        router.refresh();
        return;
      }

      setCreateFeedback({
        kind: "error",
        message: [result.message, ...result.errors].filter(Boolean).join(" "),
      });
    });
  }

  return (
    <>
      <section className="standalone-task-creator" aria-label="יצירת הצעת מחיר">
        <div className="standalone-task-creator__header">
          <div>
            <h2>הצעת מחיר חדשה</h2>
            <p>יצירת הצעת מחיר סטנדרטית עם מוצר מקושר.</p>
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setCreateFeedback(null);
              setIsCreatePanelOpen((current) => !current);
            }}
            disabled={isCreatingQuote}
          >
            + צור הצעת מחיר חדשה
          </button>
        </div>

        {createFeedback ? (
          <div
            className={
              createFeedback.kind === "success"
                ? "task-update-success"
                : "task-update-error"
            }
            role={createFeedback.kind === "success" ? "status" : "alert"}
            aria-live="polite"
          >
            {createFeedback.message}
          </div>
        ) : null}

        {isCreatePanelOpen ? (
          <form
            className="standalone-task-creator__form"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateQuote(new FormData(event.currentTarget));
            }}
          >
            <div className="task-assignment-editor__fields standalone-task-creator__fields">
              <label className="filter-field">
                <span className="filter-label">שם לקוח</span>
                <input
                  className="filter-input"
                  name="customerName"
                  required
                  disabled={isCreatingQuote}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">טלפון</span>
                <input
                  className="filter-input"
                  name="phone"
                  required
                  disabled={isCreatingQuote}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">כתובת</span>
                <input
                  className="filter-input"
                  name="address"
                  required
                  disabled={isCreatingQuote}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">סוג הצעה</span>
                <span className="badge badge--success">סטנדרטי</span>
              </label>

              <label className="filter-field standalone-task-creator__notes">
                <span className="filter-label">מוצר</span>
                <select
                  className="filter-select"
                  name="productId"
                  defaultValue=""
                  required
                  disabled={isCreatingQuote}
                >
                  <option value="">בחר מוצר</option>
                  {products.map((product) => (
                    <option value={product.id} key={product.id}>
                      {product.selectLabel}
                    </option>
                  ))}
                </select>
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
                  disabled={isCreatingQuote}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">מחיר בשקלים</span>
                <input
                  className="filter-input"
                  name="totalPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  disabled={isCreatingQuote}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">מקור הגעה</span>
                <select className="filter-select" name="leadSource" defaultValue="" disabled={isCreatingQuote}>
                  <option value="">ללא מקור</option>
                  <option value="מדרג">מדרג</option>
                  <option value="מקצוענים">מקצוענים</option>
                  <option value="גוגל">גוגל</option>
                  <option value="המלצה">המלצה</option>
                  <option value="אחר">אחר</option>
                </select>
              </label>

              <label className="filter-field standalone-task-creator__notes">
                <span className="filter-label">הערות</span>
                <textarea
                  className="filter-input"
                  name="notes"
                  rows={3}
                  disabled={isCreatingQuote}
                />
              </label>
            </div>

            <div className="task-assignment-editor__actions">
              <button
                className="primary-action"
                type="submit"
                disabled={isCreatingQuote}
              >
                {isCreatingQuote ? "יוצר הצעה..." : "צור הצעת מחיר"}
              </button>
              <button
                className="task-row-actions__secondary"
                type="button"
                disabled={isCreatingQuote}
                onClick={() => setIsCreatePanelOpen(false)}
              >
                ביטול
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <div className="filters-bar" aria-label="סינון הצעות מחיר">
        <label className="filter-field filter-field--search">
          <span className="filter-label">חיפוש</span>
          <input
            className="filter-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי מספר הצעה, לקוח או טלפון"
          />
        </label>

        <label className="filter-field">
          <span className="filter-label">סוג הצעה</span>
          <select
            className="filter-select"
            value={quoteType}
            onChange={(event) => setQuoteType(event.target.value as QuoteTypeFilter)}
          >
            <option value="הכל">הכל</option>
            <option value="סטנדרטי">סטנדרטי</option>
            <option value="ייצור אישי">ייצור אישי</option>
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">סטטוס</span>
          <select
            className="filter-select"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="הכל">הכל</option>
            <option value="נשלח">נשלח</option>
            <option value="ממתין">ממתין</option>
            <option value="ריק">ריק</option>
          </select>
        </label>

        <p className="table-summary">
          מציג {filteredQuotes.length} מתוך {quotes.length}
        </p>

        <button
          className="refresh-button"
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={isRefreshing}
        >
          {isRefreshing ? "מרענן..." : "רענון נתונים"}
        </button>
      </div>

      <div className="table-wrap">
        {filteredQuotes.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>מספר הצעה</th>
                <th>פעולה</th>
                <th>הצעת EasyCount</th>
                <th>הזמנה</th>
                <th>שם לקוח</th>
                <th>טלפון</th>
                <th>סוג הצעה</th>
                <th>סטטוס</th>
                <th>תאריך יצירה</th>
                <th>מחיר כולל</th>
                <th>מקור הגעה</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => {
                const hasCreatedOrder = quote.createdOrderIds.length > 0;

                return (
                  <tr key={quote.id}>
                    <td>{quote.quoteNumber || "-"}</td>
                    <td>
                      {hasCreatedOrder ? (
                        <span className="muted-text">כבר נוצרה הזמנה</span>
                      ) : (
                        <Link href={`/quotes/${quote.id}/create-order`}>
                          יצירת הזמנה
                        </Link>
                      )}
                    </td>
                    <td>
                      <CreateQuoteButton
                        recordId={quote.id}
                        quoteType={quote.quoteType}
                        ezDocUrl={quote.ezDocUrl}
                      />
                    </td>
                    <td>
                      {hasCreatedOrder ? (
                        <span className="badge badge--success">נוצרה הזמנה</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{quote.customerName || "-"}</td>
                    <td><PhoneText value={quote.phone} /></td>
                    <td>{quote.quoteType}</td>
                    <td>{quote.status || "-"}</td>
                    <td>{formatDate(quote.createdAt)}</td>
                    <td>{formatCurrency(quote.totalPrice)}</td>
                    <td>{quote.leadSource ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="card__body placeholder">
            <div>
              <h2>אין הצעות מחיר להצגה</h2>
              <p>לא נמצאו הצעות מחיר שתואמות לחיפוש או לסינון הנוכחי.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
