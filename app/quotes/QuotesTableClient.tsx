"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { PhoneText } from "@/components/ui/PhoneText";
import type { Product, Quote, QuoteType } from "@/lib/types";
import {
  createOrderCreationRequestFromQuoteAction,
  createQuoteWithDocumentLinesAction,
} from "./actions";
import { CreateQuoteButton } from "./CreateQuoteButton";

type QuoteTypeFilter = "הכל" | QuoteType | "מעורב";
type StatusFilter = "הכל" | "נשלח" | "ממתין" | "ריק";
type DocumentLineDraftType = "סטנדרטי" | "ייצור אישי" | "מדידה";

type DocumentLineDraft = {
  id: string;
  lineType: DocumentLineDraftType;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

type OrderCreationRequestDraft = {
  paymentType: "תשלום מלא" | "מקדמה 60%";
  paymentMethod: string;
  source: string;
  standardExitLocation: string;
  notes: string;
};

type QuotesTableClientProps = {
  quotes: Quote[];
  products: Product[];
};

function newLineDraft(lineType: DocumentLineDraftType = "סטנדרטי"): DocumentLineDraft {
  return {
    id: crypto.randomUUID(),
    lineType,
    productId: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
    discountPercent: "",
  };
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

function displayQuoteType(quote: Quote) {
  // LEGACY_DISPLAY_FALLBACK_ONLY: use the old quote type only when no document lines exist yet.
  return quote.quoteTypeFromDocumentLines ?? quote.quoteType;
}

function displayQuoteTotal(quote: Quote) {
  if (quote.documentLines.length > 0) {
    return quote.totalFromDocumentLines;
  }

  // LEGACY_DISPLAY_FALLBACK_ONLY: temporary display fallback for unmigrated quote records.
  return quote.totalPrice;
}

function formatLineTypes(lineTypes: string[]) {
  return lineTypes.length > 0 ? lineTypes.join(", ") : "-";
}

function documentLineLabel(quote: Quote) {
  if (quote.documentLines.length === 0) {
    return "אין שורות מסמך";
  }

  return `${quote.documentLines.length} שורות`;
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

function numericFormValue(value: string) {
  const normalized = value.trim();
  return normalized ? Number(normalized) : 0;
}

function hasStandardDocumentLine(quote: Quote) {
  return quote.documentLines.some((line) => line.lineType === "סטנדרטי");
}

function hasActiveOrderCreationRequestError(quote: Quote) {
  return Boolean(quote.orderCreationRequestError);
}

function canCreateOrderCreationRequest(quote: Quote) {
  return (
    quote.documentLines.length > 0 &&
    !quote.hasOpenOrderCreationRequest &&
    quote.createdOrderIds.length === 0 &&
    !hasActiveOrderCreationRequestError(quote)
  );
}

function orderCreationRequestActionLabel(quote: Quote) {
  if (quote.createdOrderIds.length > 0) {
    return "כבר נוצרה הזמנה";
  }

  if (quote.hasOpenOrderCreationRequest) {
    return "בקשת הזמנה ממתינה";
  }

  if (hasActiveOrderCreationRequestError(quote)) {
    return "שגיאה דורשת טיפול";
  }

  if (quote.documentLines.length === 0) {
    return "אין שורות מסמך";
  }

  return "צור בקשת הזמנה";
}

function newOrderCreationRequestDraft(quote: Quote): OrderCreationRequestDraft {
  return {
    paymentType: "מקדמה 60%",
    paymentMethod: "",
    source: quote.leadSource ?? "",
    standardExitLocation: "",
    notes: "",
  };
}

export function QuotesTableClient({ quotes, products }: QuotesTableClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [quoteTypeFilter, setQuoteTypeFilter] = useState<QuoteTypeFilter>("הכל");
  const [status, setStatus] = useState<StatusFilter>("הכל");
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [lineDrafts, setLineDrafts] = useState<DocumentLineDraft[]>([
    newLineDraft(),
  ]);
  const [createFeedback, setCreateFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [requestingQuoteId, setRequestingQuoteId] = useState<string | null>(null);
  const [submittingRequestQuoteId, setSubmittingRequestQuoteId] =
    useState<string | null>(null);
  const [requestDrafts, setRequestDrafts] = useState<
    Record<string, OrderCreationRequestDraft>
  >({});

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
        quoteTypeFilter === "הכל" || displayQuoteType(quote) === quoteTypeFilter;
      const statusMatches = matchesStatus(quote.status, status);

      return searchMatches && typeMatches && statusMatches;
    });
  }, [quotes, quoteTypeFilter, search, status]);

  function updateLineDraft(id: string, patch: Partial<DocumentLineDraft>) {
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

  function toggleOrderCreationRequest(quote: Quote) {
    if (!canCreateOrderCreationRequest(quote)) {
      return;
    }

    setRequestFeedback(null);
    setRequestingQuoteId((currentQuoteId) =>
      currentQuoteId === quote.id ? null : quote.id,
    );
    setRequestDrafts((currentDrafts) => ({
      ...currentDrafts,
      [quote.id]: currentDrafts[quote.id] ?? newOrderCreationRequestDraft(quote),
    }));
  }

  function updateOrderCreationRequestDraft(
    quoteId: string,
    patch: Partial<OrderCreationRequestDraft>,
  ) {
    setRequestDrafts((currentDrafts) => ({
      ...currentDrafts,
      [quoteId]: {
        ...(currentDrafts[quoteId] ?? {
          paymentType: "מקדמה 60%",
          paymentMethod: "",
          source: "",
          standardExitLocation: "",
          notes: "",
        }),
        ...patch,
      },
    }));
  }

  async function handleCreateOrderCreationRequest(quote: Quote) {
    if (submittingRequestQuoteId) {
      return;
    }

    const draft = requestDrafts[quote.id] ?? newOrderCreationRequestDraft(quote);
    setRequestFeedback(null);
    setSubmittingRequestQuoteId(quote.id);

    try {
      const result = await createOrderCreationRequestFromQuoteAction({
        quoteId: quote.id,
        paymentType: draft.paymentType,
        paymentMethod: draft.paymentMethod as
          | "העברה בנקאית"
          | "אשראי"
          | "מזומן"
          | "ביט"
          | "פייבוקס",
        source: draft.source as
          | "מדרג"
          | "מקצוענים"
          | "גוגל"
          | "המלצה"
          | "מהאתר"
          | "אחר",
        standardExitLocation: hasStandardDocumentLine(quote)
          ? (draft.standardExitLocation as "חנות" | "מחסן")
          : null,
        notes: draft.notes || null,
      });

      if (result.ok) {
        setRequestFeedback({ kind: "success", message: result.message });
        setRequestingQuoteId(null);
        router.refresh();
        return;
      }

      setRequestFeedback({
        kind: "error",
        message: [result.message, ...result.errors].filter(Boolean).join(" "),
      });
    } catch {
      setRequestFeedback({
        kind: "error",
        message: "שגיאה ביצירת בקשת הזמנה. נסו שוב.",
      });
    } finally {
      setSubmittingRequestQuoteId(null);
    }
  }

  async function handleCreateQuote(form: HTMLFormElement) {
    if (isCreatingQuote) {
      return;
    }

    const formData = new FormData(form);
    setCreateFeedback(null);
    setIsCreatingQuote(true);

    try {
      const result = await createQuoteWithDocumentLinesAction({
        customerName: String(formData.get("customerName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? "") || null,
        leadSource: String(formData.get("leadSource") ?? "") || null,
        notes: String(formData.get("notes") ?? "") || null,
        lines: lineDrafts.map((line) => ({
          lineType: line.lineType,
          productId: line.lineType === "סטנדרטי" ? line.productId : null,
          description: line.description || null,
          quantity: numericFormValue(line.quantity),
          unitPrice: numericFormValue(line.unitPrice),
          discountPercent:
            line.discountPercent.trim() === ""
              ? null
              : numericFormValue(line.discountPercent),
        })),
      });

      if (result.ok) {
        setCreateFeedback({ kind: "success", message: result.message });
        form.reset();
        setLineDrafts([newLineDraft()]);
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
            <p>יצירה במודל החדש: הצעת מחיר עם שורות מסמך.</p>
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

        {requestFeedback ? (
          <div
            className={
              requestFeedback.kind === "success"
                ? "task-update-success"
                : "task-update-error"
            }
            role={requestFeedback.kind === "success" ? "status" : "alert"}
            aria-live="polite"
          >
            {requestFeedback.message}
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

            <div className="task-assignment-editor">
              <div className="task-assignment-editor__heading">
                <div>
                  <strong>שורות מסמך</strong>
                  <span>כל שורה תיווצר ברשומה נפרדת בטבלת שורות מסמך.</span>
                </div>
              </div>

              <div className="task-assignment-editor__fields standalone-task-creator__fields">
                {lineDrafts.map((line, index) => (
                  <div className="task-assignment-editor__fields" key={line.id}>
                    <label className="filter-field">
                      <span className="filter-label">סוג שורה</span>
                      <select
                        className="filter-select"
                        value={line.lineType}
                        disabled={isCreatingQuote}
                        onChange={(event) =>
                          updateLineDraft(line.id, {
                            lineType: event.target.value as DocumentLineDraftType,
                          })
                        }
                      >
                        <option value="סטנדרטי">סטנדרטי</option>
                        <option value="ייצור אישי">ייצור אישי</option>
                        <option value="מדידה">מדידה</option>
                      </select>
                    </label>

                    {line.lineType === "סטנדרטי" ? (
                      <label className="filter-field standalone-task-creator__notes">
                        <span className="filter-label">מוצר</span>
                        <select
                          className="filter-select"
                          value={line.productId}
                          required
                          disabled={isCreatingQuote}
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
                      <label className="filter-field standalone-task-creator__notes">
                        <span className="filter-label">תיאור שורה</span>
                        <textarea
                          className="filter-input"
                          rows={2}
                          value={line.description}
                          required
                          disabled={isCreatingQuote}
                          onChange={(event) =>
                            updateLineDraft(line.id, {
                              description: event.target.value,
                            })
                          }
                        />
                      </label>
                    )}

                    {line.lineType === "סטנדרטי" ? (
                      <label className="filter-field standalone-task-creator__notes">
                        <span className="filter-label">תיאור לתצוגה</span>
                        <input
                          className="filter-input"
                          value={line.description}
                          disabled={isCreatingQuote}
                          onChange={(event) =>
                            updateLineDraft(line.id, {
                              description: event.target.value,
                            })
                          }
                        />
                      </label>
                    ) : null}

                    <label className="filter-field">
                      <span className="filter-label">כמות</span>
                      <input
                        className="filter-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        required
                        disabled={isCreatingQuote}
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
                        disabled={isCreatingQuote}
                        onChange={(event) =>
                          updateLineDraft(line.id, {
                            unitPrice: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="filter-field">
                      <span className="filter-label">הנחה %</span>
                      <input
                        className="filter-input"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={line.discountPercent}
                        disabled={isCreatingQuote}
                        onChange={(event) =>
                          updateLineDraft(line.id, {
                            discountPercent: event.target.value,
                          })
                        }
                      />
                    </label>

                    <div className="task-assignment-editor__actions">
                      <span className="muted-text">שורה {index + 1}</span>
                      <button
                        className="task-row-actions__secondary"
                        type="button"
                        disabled={isCreatingQuote || lineDrafts.length === 1}
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
                  disabled={isCreatingQuote}
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
            <option value="מעורב">מעורב</option>
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
                <th>בקשת הזמנה</th>
                <th>הצעת EasyCount</th>
                <th>הזמנה</th>
                <th>שם לקוח</th>
                <th>טלפון</th>
                <th>סוג הצעה</th>
                <th>שורות מסמך</th>
                <th>סוגים לפי שורות</th>
                <th>סטטוס</th>
                <th>תאריך יצירה</th>
                <th>סה"כ לפי שורות</th>
                <th>מקור הגעה</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => {
                const hasCreatedOrder = quote.createdOrderIds.length > 0;
                const hasDocumentLines = quote.documentLines.length > 0;
                const canCreateRequest = canCreateOrderCreationRequest(quote);
                const actionLabel = orderCreationRequestActionLabel(quote);

                return (
                  <Fragment key={quote.id}>
                  <tr>
                    <td>{quote.quoteNumber || "-"}</td>
                    <td>
                      {canCreateRequest ? (
                        <button
                          className="task-row-actions__secondary"
                          type="button"
                          onClick={() => toggleOrderCreationRequest(quote)}
                          disabled={submittingRequestQuoteId === quote.id}
                        >
                          {actionLabel}
                        </button>
                      ) : (
                        <button
                          className="task-row-actions__secondary"
                          type="button"
                          disabled
                        >
                          {actionLabel}
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="order-payment-summary">
                        <span>{quote.orderCreationRequestStatusForDisplay}</span>
                        {quote.createdOrderId ? (
                          <span className="badge badge--success">
                            {quote.createdOrderId}
                          </span>
                        ) : null}
                        {quote.orderCreationRequestError ? (
                          <span className="badge badge--danger">
                            {quote.orderCreationRequestError}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <CreateQuoteButton
                        recordId={quote.id}
                        hasDocumentLines={hasDocumentLines}
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
                    <td>{displayQuoteType(quote)}</td>
                    <td>
                      <div className="order-payment-summary">
                        <span>{documentLineLabel(quote)}</span>
                        {!hasDocumentLines ? (
                          <span className="badge badge--warning">אין שורות מסמך</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{formatLineTypes(quote.lineTypesFromDocumentLines)}</td>
                    <td>{quote.status || "-"}</td>
                    <td>{formatDate(quote.createdAt)}</td>
                    <td>{formatCurrency(displayQuoteTotal(quote))}</td>
                    <td>{quote.leadSource ?? "-"}</td>
                  </tr>
                  {requestingQuoteId === quote.id ? (
                    <tr className="tasks-table__assignment-row">
                      <td colSpan={14}>
                        <div className="task-assignment-editor">
                          <div className="task-assignment-editor__heading">
                            <div>
                              <strong>בקשת יצירת הזמנה</strong>
                              <span>
                                ההזמנה תיווצר על ידי האוטומציה ב-Airtable.
                              </span>
                            </div>
                          </div>
                          <div className="task-assignment-editor__fields">
                            <label className="filter-field">
                              <span className="filter-label">תשלום מלא/מקדמה</span>
                              <select
                                className="filter-select"
                                value={
                                  requestDrafts[quote.id]?.paymentType ??
                                  "מקדמה 60%"
                                }
                                disabled={submittingRequestQuoteId === quote.id}
                                onChange={(event) =>
                                  updateOrderCreationRequestDraft(quote.id, {
                                    paymentType: event.target.value as
                                      | "תשלום מלא"
                                      | "מקדמה 60%",
                                  })
                                }
                              >
                                <option value="מקדמה 60%">מקדמה 60%</option>
                                <option value="תשלום מלא">תשלום מלא</option>
                              </select>
                            </label>

                            <label className="filter-field">
                              <span className="filter-label">אמצעי תשלום</span>
                              <select
                                className="filter-select"
                                value={requestDrafts[quote.id]?.paymentMethod ?? ""}
                                required
                                disabled={submittingRequestQuoteId === quote.id}
                                onChange={(event) =>
                                  updateOrderCreationRequestDraft(quote.id, {
                                    paymentMethod: event.target.value,
                                  })
                                }
                              >
                                <option value="">בחר</option>
                                <option value="העברה בנקאית">העברה בנקאית</option>
                                <option value="אשראי">אשראי</option>
                                <option value="מזומן">מזומן</option>
                                <option value="ביט">ביט</option>
                                <option value="פייבוקס">פייבוקס</option>
                              </select>
                            </label>

                            <label className="filter-field">
                              <span className="filter-label">מקור הגעה</span>
                              <select
                                className="filter-select"
                                value={requestDrafts[quote.id]?.source ?? ""}
                                required
                                disabled={submittingRequestQuoteId === quote.id}
                                onChange={(event) =>
                                  updateOrderCreationRequestDraft(quote.id, {
                                    source: event.target.value,
                                  })
                                }
                              >
                                <option value="">בחר</option>
                                <option value="מדרג">מדרג</option>
                                <option value="מקצוענים">מקצוענים</option>
                                <option value="גוגל">גוגל</option>
                                <option value="המלצה">המלצה</option>
                                <option value="מהאתר">מהאתר</option>
                                <option value="אחר">אחר</option>
                              </select>
                            </label>

                            {hasStandardDocumentLine(quote) ? (
                              <label className="filter-field">
                                <span className="filter-label">
                                  מיקום יציאה לפריטים סטנדרטיים
                                </span>
                                <select
                                  className="filter-select"
                                  value={
                                    requestDrafts[quote.id]
                                      ?.standardExitLocation ?? ""
                                  }
                                  required
                                  disabled={submittingRequestQuoteId === quote.id}
                                  onChange={(event) =>
                                    updateOrderCreationRequestDraft(quote.id, {
                                      standardExitLocation: event.target.value,
                                    })
                                  }
                                >
                                  <option value="">בחר</option>
                                  <option value="חנות">חנות</option>
                                  <option value="מחסן">מחסן</option>
                                </select>
                              </label>
                            ) : null}

                            <label className="filter-field standalone-task-creator__notes">
                              <span className="filter-label">הערות</span>
                              <textarea
                                className="filter-input"
                                rows={3}
                                value={requestDrafts[quote.id]?.notes ?? ""}
                                disabled={submittingRequestQuoteId === quote.id}
                                onChange={(event) =>
                                  updateOrderCreationRequestDraft(quote.id, {
                                    notes: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>

                          <div className="task-assignment-editor__actions">
                            <button
                              className="primary-action"
                              type="button"
                              disabled={submittingRequestQuoteId === quote.id}
                              onClick={() =>
                                handleCreateOrderCreationRequest(quote)
                              }
                            >
                              {submittingRequestQuoteId === quote.id
                                ? "שולח בקשה..."
                                : "שלח בקשת יצירת הזמנה"}
                            </button>
                            <button
                              className="task-row-actions__secondary"
                              type="button"
                              disabled={submittingRequestQuoteId === quote.id}
                              onClick={() => setRequestingQuoteId(null)}
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
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
