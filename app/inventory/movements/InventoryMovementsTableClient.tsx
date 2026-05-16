"use client";

import { useMemo, useState } from "react";

export type InventoryMovementTableItem = {
  date: string | null;
  productName: string;
  location: string | null;
  movementType: string;
  quantity: number;
  relatedOrder: string | null;
  notes: string | null;
};

type InventoryMovementsTableClientProps = {
  movements: InventoryMovementTableItem[];
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

export function InventoryMovementsTableClient({
  movements,
}: InventoryMovementsTableClientProps) {
  const movementTypes = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.movementType).filter(Boolean))),
    [movements],
  );
  const [movementType, setMovementType] = useState("הכל");

  const filteredMovements = useMemo(() => {
    if (movementType === "הכל") {
      return movements;
    }

    return movements.filter((movement) => movement.movementType === movementType);
  }, [movements, movementType]);

  return (
    <>
      <div className="filters-bar" aria-label="סינון תנועות מלאי">
        <label className="filter-field">
          <span className="filter-label">סוג תנועה</span>
          <select
            className="filter-select"
            value={movementType}
            onChange={(event) => setMovementType(event.target.value)}
          >
            <option value="הכל">הכל</option>
            {movementTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <p className="table-summary">
          מציג {filteredMovements.length} מתוך {movements.length}
        </p>
      </div>

      <div className="table-wrap">
        {filteredMovements.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>תאריך</th>
                <th>מוצר</th>
                <th>מיקום</th>
                <th>סוג תנועה</th>
                <th>כמות</th>
                <th>הזמנה קשורה אם קיימת</th>
                <th>הערות אם קיימות</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement, index) => (
                <tr key={`${movement.date ?? "movement"}-${movement.productName || "product"}-${index}`}>
                  <td>{formatDate(movement.date)}</td>
                  <td>{movement.productName || "-"}</td>
                  <td>{movement.location ?? "-"}</td>
                  <td>{movement.movementType || "-"}</td>
                  <td>{movement.quantity}</td>
                  <td>{movement.relatedOrder ?? "-"}</td>
                  <td>{movement.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card__body placeholder">
            <div>
              <h2>אין תנועות מלאי להצגה</h2>
              <p>לא נמצאו תנועות מלאי שתואמות לסינון הנוכחי.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
