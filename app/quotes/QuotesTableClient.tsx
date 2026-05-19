"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Quote, QuoteType } from "@/lib/types";
import { CreateQuoteButton } from "./CreateQuoteButton";

type QuoteTypeFilter = "הכל" | QuoteType;
type StatusFilter = "הכל" | "נשלח" | "ממתין" | "ריק";

type QuotesTableClientProps = {
  quotes: Quote[];
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

export function QuotesTableClient({ quotes }: QuotesTableClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [quoteType, setQuoteType] = useState<QuoteTypeFilter>("הכל");
  const [status, setStatus] = useState<StatusFilter>("הכל");
  const [isRefreshing, startRefresh] = useTransition();

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

  return (
    <>
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
                    <td>{quote.phone ?? "-"}</td>
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
