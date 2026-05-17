"use client";

import { useMemo, useState } from "react";

export type InventoryMovementTableItem = {
  movementNumber: string | null;
  date: string | null;
  productName: string | null;
  productRecordIds: string[];
  location: string | null;
  movementType: string;
  quantity: number;
  calculatedQuantity: number;
  status: string | null;
  orderLineIds: string[];
  relatedOrder: string | null;
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
  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          movements
            .map((movement) => movement.location)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [movements],
  );
  const [productSearch, setProductSearch] = useState("");
  const [location, setLocation] = useState("הכל");
  const [movementType, setMovementType] = useState("הכל");

  const filteredMovements = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    return movements.filter((movement) => {
      const productLabel = movement.productName || movement.productRecordIds.join(", ");
      const matchesProduct =
        !normalizedSearch || productLabel.toLowerCase().includes(normalizedSearch);
      const matchesLocation = location === "הכל" || movement.location === location;
      const matchesType = movementType === "הכל" || movement.movementType === movementType;

      return matchesProduct && matchesLocation && matchesType;
    });
  }, [location, movements, movementType, productSearch]);

  return (
    <>
      <div className="filters-bar" aria-label="סינון תנועות מלאי">
        <label className="filter-field filter-field--search">
          <span className="filter-label">מוצר</span>
          <input
            className="filter-input"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="שם מוצר או מזהה מוצר"
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
            {locations.map((movementLocation) => (
              <option key={movementLocation} value={movementLocation}>
                {movementLocation}
              </option>
            ))}
          </select>
        </label>

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
                <th>מספר תנועה</th>
                <th>תאריך</th>
                <th>מוצר</th>
                <th>מיקום</th>
                <th>סוג תנועה</th>
                <th>כמות</th>
                <th>כמות מחושבת</th>
                <th>סטטוס</th>
                <th>שורת הזמנה</th>
                <th>הזמנה</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement, index) => (
                <tr
                  key={`${movement.movementNumber ?? movement.date ?? "movement"}-${
                    movement.productName || movement.productRecordIds.join("-") || "product"
                  }-${index}`}
                >
                  <td>{movement.movementNumber ?? "-"}</td>
                  <td>{formatDate(movement.date)}</td>
                  <td>{movement.productName || movement.productRecordIds.join(", ") || "-"}</td>
                  <td>{movement.location ?? "-"}</td>
                  <td>{movement.movementType || "-"}</td>
                  <td>{movement.quantity}</td>
                  <td>{movement.calculatedQuantity}</td>
                  <td>{movement.status ?? "-"}</td>
                  <td>{movement.orderLineIds.join(", ") || "-"}</td>
                  <td>{movement.relatedOrder ?? "-"}</td>
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
