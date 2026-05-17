"use client";

import { useMemo, useState } from "react";
import type { StockStatus } from "@/lib/types";

export type InventoryTableItem = {
  productName: string;
  productSku: string | null;
  location: string;
  availableQuantity: number;
  status: StockStatus;
  displayForMoran: string | null;
};

type InventoryTableClientProps = {
  items: InventoryTableItem[];
};

const statusLabels: Record<StockStatus, string> = {
  ok: "תקין",
  low: "מלאי נמוך",
  out: "אזל",
  negative: "מלאי שלילי",
};

function statusClass(status: StockStatus) {
  if (status === "negative" || status === "out") {
    return "badge badge--danger";
  }

  if (status === "low") {
    return "badge badge--warning";
  }

  return "badge badge--success";
}

export function InventoryTableClient({ items }: InventoryTableClientProps) {
  const locations = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.location).filter((value) => value.length > 0))),
    [items],
  );
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("הכל");
  const [status, setStatus] = useState<StockStatus | "הכל">("הכל");

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.productName.toLowerCase().includes(normalizedSearch) ||
        (item.productSku ?? "").toLowerCase().includes(normalizedSearch);
      const matchesLocation = location === "הכל" || item.location === location;
      const matchesStatus = status === "הכל" || item.status === status;

      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [items, location, search, status]);

  return (
    <>
      <div className="filters-bar" aria-label="סינון מלאי לפי מיקום">
        <label className="filter-field filter-field--search">
          <span className="filter-label">חיפוש מוצר</span>
          <input
            className="filter-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="שם מוצר או מקט"
          />
        </label>

        <label className="filter-field">
          <span className="filter-label">מיקום</span>
          <select
            className="filter-select"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          >
            <option value="הכל">הכל</option>
            {locations.map((itemLocation) => (
              <option key={itemLocation} value={itemLocation}>
                {itemLocation}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">סטטוס מלאי</span>
          <select
            className="filter-select"
            value={status}
            onChange={(event) => setStatus(event.target.value as StockStatus | "הכל")}
          >
            <option value="הכל">הכל</option>
            <option value="ok">תקין</option>
            <option value="low">מלאי נמוך</option>
            <option value="out">אזל</option>
            <option value="negative">מלאי שלילי</option>
          </select>
        </label>

        <p className="table-summary">
          מציג {filteredItems.length} מתוך {items.length}
        </p>
      </div>

      <div className="table-wrap">
        {filteredItems.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>מוצר</th>
                <th>מקט/דגם</th>
                <th>מיקום</th>
                <th>כמות</th>
                <th>סטטוס מלאי</th>
                <th>תצוגה למורן</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr key={`${item.productName || "item"}-${item.location || "location"}-${index}`}>
                  <td>{item.productName || "-"}</td>
                  <td>{item.productSku ?? "-"}</td>
                  <td>{item.location || "-"}</td>
                  <td>{item.availableQuantity}</td>
                  <td>
                    <span className={statusClass(item.status)}>{statusLabels[item.status]}</span>
                  </td>
                  <td>{item.displayForMoran ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card__body placeholder">
            <div>
              <h2>אין פריטי מלאי להצגה</h2>
              <p>לא נמצאו פריטי מלאי שתואמים לסינון הנוכחי.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
