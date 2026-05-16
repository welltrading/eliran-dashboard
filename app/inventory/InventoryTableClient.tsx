"use client";

import { useMemo, useState } from "react";
import type { StockStatus } from "@/lib/types";

type LocationFilter = "הכל" | "חנות" | "מחסן";

export type InventoryTableItem = {
  productName: string;
  location: string;
  availableQuantity: number;
  status: StockStatus;
  updatedAt: string | null;
};

type InventoryTableClientProps = {
  items: InventoryTableItem[];
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

function statusClass(status: StockStatus) {
  if (status === "אזל") {
    return "badge badge--danger";
  }

  if (status === "נמוך") {
    return "badge badge--warning";
  }

  return "badge badge--success";
}

export function InventoryTableClient({ items }: InventoryTableClientProps) {
  const [location, setLocation] = useState<LocationFilter>("הכל");

  const filteredItems = useMemo(() => {
    if (location === "הכל") {
      return items;
    }

    return items.filter((item) => item.location === location);
  }, [items, location]);

  return (
    <>
      <div className="filters-bar" aria-label="סינון מלאי לפי מיקום">
        <label className="filter-field">
          <span className="filter-label">מיקום</span>
          <select
            className="filter-select"
            value={location}
            onChange={(event) => setLocation(event.target.value as LocationFilter)}
          >
            <option value="הכל">הכל</option>
            <option value="חנות">חנות</option>
            <option value="מחסן">מחסן</option>
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
                <th>מיקום</th>
                <th>כמות זמינה</th>
                <th>סטטוס מלאי</th>
                <th>עדכון אחרון</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr key={`${item.productName || "item"}-${item.location || "location"}-${index}`}>
                  <td>{item.productName || "-"}</td>
                  <td>{item.location || "-"}</td>
                  <td>{item.availableQuantity}</td>
                  <td>
                    <span className={statusClass(item.status)}>{item.status}</span>
                  </td>
                  <td>{formatDate(item.updatedAt)}</td>
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
