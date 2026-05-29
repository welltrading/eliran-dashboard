"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  const [quoteTypeFilter, setQuoteTypeFilter] = useState<QuoteTypeFilter>("הכל");
  const [status, setStatus] = useState<StatusFilter>("הכל");
  const [createQuoteType, setCreateQuoteType] = useState<QuoteType>("סטנדרטי");
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);

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
      const typeMatches =
        quoteTypeFilter === "הכל" || quote.quoteType === quoteTypeFilter;
      const statusMatches = matchesStatus(quote.status, status);

      return searchMatches && typeMatches && statusMatches;
    });
  }, [quotes, quoteTypeFilter, search, status]);

  async function handleCreateQuote(form: HTMLFormElement) {
    if (isCreatingQuote) {
      return;
    }

    const formData = new FormData(form);
    setCreateFeedback(null);
    setIsCreatingQuote(true);

    try {
      const rawQuantity = String(formData.get("quantity") ?? "").trim();
      const commonFields = {
        customerName: String(formData.get("customerName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
        totalPrice: Number(formData.get("totalPrice") ?? 0),
        quantity: rawQuantity ? Number(rawQuantity) : 0,
        leadSource: String(formData.get("leadSource") ?? "") || null,
        notes: String(formData.get("notes") ?? "") || null,
      };
      const rawFixedPricePerSqm = String(
        formData.get("fixedPricePerSqm") ?? "",
      ).trim();
      const result =
        createQuoteType === "ייצור אישי"
          ? await createQuoteAction({
              ...commonFields,
              quoteType: "ייצור אישי",
              customProductDescription: String(
                formData.get("customProductDescription") ?? "",
              ),
              measurementRequired: String(
                formData.get("measurementRequired") ?? "",
              ),
              dismantlingOption: String(
                formData.get("dismantlingOption") ?? "",
              ),
              fixedPricePerSqm: rawFixedPricePerSqm
                ? Number(rawFixedPricePerSqm)
                : null,
              widthCm: Number(formData.get("widthCm") ?? 0),
              depthCm: Number(formData.get("depthCm") ?? 0),
              heightM: Number(formData.get("heightM") ?? 0),
              glassType: String(formData.get("glassType") ?? ""),
              hardwareColor: String(formData.get("hardwareColor") ?? ""),
            })
          : await createQuoteAction({
              ...commonFields,
              quoteType: "סטנדרטי",
              productId: String(formData.get("productId") ?? ""),
            });

      if (result.ok) {
        setCreateFeedback({ kind: "success", message: result.message });
        form.reset();
        setCreateQuoteType("סטנדרטי");
        setIsCreatePanelOpen(false);
        router.refresh();
        return;
      }

      setCreateFeedback({
        kind: "error",
        message: [result.message, ...result.errors].filter(Boolean).join(" "),
      });
    } catch {
      setCreateFeedback({
        kind: "error",
        message: "שגיאה ביצירת הצעת מחיר. נסו שוב.",
      });
    } finally {
      setIsCreatingQuote(false);
    }
  }

  return (
    <>
      <section className="standalone-task-creator" aria-label="יצירת הצעת מחיר">
        <div className="standalone-task-creator__header">
          <div>
            <h2>הצעת מחיר חדשה</h2>
            <p>
              {createQuoteType === "סטנדרטי"
                ? "יצירת הצעת מחיר סטנדרטית עם מוצר מקושר."
                : "יצירת הצעת מחיר ייצור אישי לפי פרטי לקוח ומידות."}
            </p>
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
              handleCreateQuote(event.currentTarget);
            }}
          >
            <div className="task-assignment-editor__fields standalone-task-creator__fields">
              <label className="filter-field">
                <span className="filter-label">
                  {createQuoteType === "ייצור אישי" ? "שם הלקוח" : "שם לקוח"}
                </span>
                <input
                  className="filter-input"
                  name="customerName"
                  required
                  disabled={isCreatingQuote}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">
                  {createQuoteType === "ייצור אישי" ? "נייד" : "טלפון"}
                </span>
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
                <select
                  className="filter-select"
                  name="quoteType"
                  value={createQuoteType}
                  onChange={(event) =>
                    setCreateQuoteType(event.target.value as QuoteType)
                  }
                  disabled={isCreatingQuote}
                >
                  <option value="סטנדרטי">סטנדרטי</option>
                  <option value="ייצור אישי">ייצור אישי</option>
                </select>
              </label>

              {createQuoteType === "סטנדרטי" ? (
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
              ) : (
                <>
                  <label className="filter-field standalone-task-creator__notes">
                    <span className="filter-label">תיאור מוצר</span>
                    <textarea
                      className="filter-input"
                      name="customProductDescription"
                      rows={3}
                      required
                      disabled={isCreatingQuote}
                    />
                  </label>

                  <label className="filter-field">
                    <span className="filter-label">נדרשת מדידה?</span>
                    <select
                      className="filter-select"
                      name="measurementRequired"
                      defaultValue=""
                      required
                      disabled={isCreatingQuote}
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
                      disabled={isCreatingQuote}
                    >
                      <option value="">בחר</option>
                      <option value="נדרש פירוק">נדרש פירוק</option>
                      <option value="לא נדרש פירוק">לא נדרש פירוק</option>
                    </select>
                  </label>

                  <label className="filter-field">
                    <span className="filter-label">מחיר קבוע למ"ר</span>
                    <input
                      className="filter-input"
                      name="fixedPricePerSqm"
                      type="number"
                      min="0.01"
                      step="0.01"
                      disabled={isCreatingQuote}
                    />
                  </label>

                  <label className="filter-field">
                    <span className="filter-label">מידות לקוח רוחב (ס"מ)</span>
                    <input
                      className="filter-input"
                      name="widthCm"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      disabled={isCreatingQuote}
                    />
                  </label>

                  <label className="filter-field">
                    <span className="filter-label">מידות לקוח עומק (ס"מ)</span>
                    <input
                      className="filter-input"
                      name="depthCm"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      disabled={isCreatingQuote}
                    />
                  </label>

                  <label className="filter-field">
                    <span className="filter-label">גובה מקלחון (מטר)</span>
                    <input
                      className="filter-input"
                      name="heightM"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      disabled={isCreatingQuote}
                    />
                  </label>

                  <label className="filter-field">
                    <span className="filter-label">זכוכית</span>
                    <select
                      className="filter-select"
                      name="glassType"
                      defaultValue=""
                      required
                      disabled={isCreatingQuote}
                    >
                      <option value="">בחר זכוכית</option>
                      <option value="גרניט">גרניט</option>
                      <option value="שקופה">שקופה</option>
                      <option value="פסים">פסים</option>
                      <option value="ברונזה">ברונזה</option>
                      <option value="מושחר">מושחר</option>
                      <option value="גלינה">גלינה</option>
                    </select>
                  </label>

                  <label className="filter-field">
                    <span className="filter-label">צבע פרזול</span>
                    <select
                      className="filter-select"
                      name="hardwareColor"
                      defaultValue=""
                      required
                      disabled={isCreatingQuote}
                    >
                      <option value="">בחר צבע</option>
                      <option value="גרפיט">גרפיט</option>
                      <option value="לבן">לבן</option>
                      <option value="ניקל">ניקל</option>
                      <option value="שחור">שחור</option>
                      <option value="זהב">זהב</option>
                      <option value="מוברש">מוברש</option>
                      <option value="ברונזה">ברונזה</option>
                    </select>
                  </label>
                </>
              )}

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
                <span className="filter-label">
                  {createQuoteType === "ייצור אישי"
                    ? "מחיר כולל ייצור אישי"
                    : "מחיר בשקלים"}
                </span>
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
                <select
                  className="filter-select"
                  name="leadSource"
                  defaultValue=""
                  disabled={isCreatingQuote}
                >
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
            value={quoteTypeFilter}
            onChange={(event) =>
              setQuoteTypeFilter(event.target.value as QuoteTypeFilter)
            }
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
