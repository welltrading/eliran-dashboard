"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import type { StockStatus } from "@/lib/types";
import { createInventoryMovementAction } from "./actions";

export type InventoryTableItem = {
  id: string;
  productName: string;
  productSku: string | null;
  productRecordId: string | null;
  location: string;
  availableQuantity: number;
  status: StockStatus;
  displayForMoran: string | null;
};

export type InventoryProductOption = {
  id: string;
  label: string;
  model: string | null;
  stockDisplay: string | null;
};

export type InventoryLocationSummary = {
  location: string;
  totalQuantity: number;
  itemCount: number;
  lowCount: number;
  outCount: number;
  negativeCount: number;
};

type InventoryTableClientProps = {
  items: InventoryTableItem[];
  locations: string[];
  locationSummaries: InventoryLocationSummary[];
  productOptions: InventoryProductOption[];
};

type MovementResult = {
  ok: boolean;
  message: string;
  errors?: string[];
};

const statusLabels: Record<StockStatus, string> = {
  ok: "תקין",
  low: "מלאי נמוך",
  out: "אזל",
  negative: "מלאי שלילי",
};

const movementTypes = [
  { value: "כניסה", label: "הוספת מלאי", icon: ArrowDownToLine },
  { value: "יציאה", label: "הוצאת מלאי", icon: ArrowUpFromLine },
  { value: "התאמה", label: "התאמת מלאי", icon: SlidersHorizontal },
];

function statusClass(status: StockStatus) {
  if (status === "negative" || status === "out") {
    return "badge badge--danger";
  }

  if (status === "low") {
    return "badge badge--warning";
  }

  return "badge badge--success";
}

function statusPriority(status: StockStatus) {
  if (status === "negative") {
    return 0;
  }

  if (status === "out") {
    return 1;
  }

  if (status === "low") {
    return 2;
  }

  return 3;
}

function itemSortValue(item: InventoryTableItem) {
  return statusPriority(item.status);
}

export function InventoryTableClient({
  items,
  locations,
  locationSummaries,
  productOptions,
}: InventoryTableClientProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("הכל");
  const [status, setStatus] = useState<StockStatus | "הכל">("הכל");
  const [productId, setProductId] = useState(productOptions[0]?.id ?? "");
  const [movementLocation, setMovementLocation] = useState(locations[0] ?? "");
  const [movementType, setMovementType] = useState("כניסה");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<MovementResult | null>(null);
  const isAdjustment = movementType === "התאמה";

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchesSearch =
          !normalizedSearch ||
          item.productName.toLowerCase().includes(normalizedSearch) ||
          (item.productSku ?? "").toLowerCase().includes(normalizedSearch);
        const matchesLocation = location === "הכל" || item.location === location;
        const matchesStatus = status === "הכל" || item.status === status;

        return matchesSearch && matchesLocation && matchesStatus;
      })
      .sort((a, b) => {
        const statusDiff = itemSortValue(a) - itemSortValue(b);

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return a.productName.localeCompare(b.productName, "he");
      });
  }, [items, location, search, status]);

  const productsByStock = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        productName: string;
        productSku: string | null;
        totalQuantity: number;
        locationCount: number;
        locations: string[];
        status: StockStatus;
      }
    >();

    items.forEach((item) => {
      const key = item.productRecordId ?? `${item.productName}-${item.productSku ?? ""}`;
      const current = groups.get(key) ?? {
        key,
        productName: item.productName || "מוצר ללא שם",
        productSku: item.productSku,
        totalQuantity: 0,
        locationCount: 0,
        locations: [],
        status: "ok" as StockStatus,
      };

      current.totalQuantity += item.availableQuantity;
      current.locationCount += 1;
      current.locations.push(`${item.location || "ללא מיקום"}: ${item.availableQuantity}`);

      if (statusPriority(item.status) < statusPriority(current.status)) {
        current.status = item.status;
      }

      groups.set(key, current);
    });

    return Array.from(groups.values())
      .sort((a, b) => {
        const statusDiff = statusPriority(a.status) - statusPriority(b.status);

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return a.productName.localeCompare(b.productName, "he");
      })
      .slice(0, 12);
  }, [items]);

  const selectedInventoryItem = useMemo(
    () =>
      items.find(
        (item) => item.productRecordId === productId && item.location === movementLocation,
      ),
    [items, movementLocation, productId],
  );

  function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const actionResult = await createInventoryMovementAction({
        productId,
        location: movementLocation,
        movementType,
        quantity,
        notes,
      });

      setResult(actionResult);

      if (actionResult.ok) {
        setQuantity("1");
        setNotes("");
      }
    });
  }

  return (
    <div className="inventory-workspace">
      <section className="inventory-control-panel">
        <form className="inventory-movement-form" onSubmit={submitMovement}>
          <div className="inventory-section-heading">
            <h2>עדכון מלאי</h2>
            <p>
              {isAdjustment
                ? "התאמה בטוחה מחשבת פער ורושמת כניסה או יציאה רק על ההפרש."
                : "רישום תנועה חדשה יעדכן את יתרות המלאי דרך מנגנון Airtable הקיים."}
            </p>
          </div>

          <div className="inventory-movement-form__types" aria-label="סוג תנועת מלאי">
            {movementTypes.map((type) => {
              const Icon = type.icon;
              const selected = movementType === type.value;

              return (
                <button
                  className={`inventory-type-button${
                    selected ? " inventory-type-button--active" : ""
                  }`}
                  key={type.value}
                  onClick={() => setMovementType(type.value)}
                  title={type.label}
                  type="button"
                >
                  <Icon aria-hidden="true" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          <div className="inventory-movement-form__grid">
            <label className="form-field form-field--wide">
              <span>מוצר / דגם</span>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                required
              >
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>מיקום</span>
              <select
                value={movementLocation}
                onChange={(event) => setMovementLocation(event.target.value)}
                required
              >
                {locations.map((itemLocation) => (
                  <option key={itemLocation} value={itemLocation}>
                    {itemLocation}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>{isAdjustment ? "כמות בפועל בספירה" : "כמות"}</span>
              <input
                min={isAdjustment ? "0" : "1"}
                step="1"
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </label>

            {isAdjustment ? (
              <div className="inventory-adjustment-preview">
                <span>כמות מערכת</span>
                <strong>{selectedInventoryItem?.availableQuantity ?? 0}</strong>
                <small>
                  תירשם תנועת כניסה או יציאה רק אם הכמות בפועל שונה מהמערכת.
                </small>
              </div>
            ) : null}

            <label className="form-field form-field--wide">
              <span>הערה</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={
                  isAdjustment
                    ? "לדוגמה: ספירת מלאי חודשית, נמצא במחסן"
                    : "לדוגמה: קבלת סחורה, יציאה להתקנה"
                }
              />
            </label>
          </div>

          <div className="inventory-movement-form__actions">
            <button className="primary-action" disabled={isPending} type="submit">
              {isPending
                ? "מעדכן..."
                : isAdjustment
                  ? "רשום התאמה בטוחה"
                  : "רשום תנועת מלאי"}
            </button>
          </div>

          {result ? (
            <div className={`result-panel result-panel--${result.ok ? "success" : "error"}`}>
              <strong>{result.message}</strong>
              {result.errors?.length ? (
                <ul>
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="inventory-location-board">
          <div className="inventory-section-heading">
            <h2>איפה המלאי נמצא</h2>
            <p>תמונה מהירה לפי מיקום, כולל חריגות שצריך לטפל בהן.</p>
          </div>
          <div className="inventory-location-grid">
            {locationSummaries.map((summary) => (
              <button
                className="inventory-location-card"
                key={summary.location}
                onClick={() => setLocation(summary.location)}
                type="button"
              >
                <span>{summary.location}</span>
                <strong>{summary.totalQuantity}</strong>
                <small>
                  {summary.itemCount} דגמים | נמוך {summary.lowCount} | אזל {summary.outCount}
                </small>
                {summary.negativeCount > 0 ? (
                  <em>{summary.negativeCount} שלילי</em>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="inventory-model-board">
        <div className="inventory-section-heading">
          <h2>דגמים במלאי</h2>
          <p>סקירה לפי דגם, כמות כוללת ופיזור מיקומים.</p>
        </div>
        <div className="inventory-model-grid">
          {productsByStock.map((product) => (
            <article className="inventory-model-card" key={product.key}>
              <div className="inventory-model-card__header">
                <div>
                  <h3>{product.productName}</h3>
                  <p>{product.productSku ?? "ללא מקט"}</p>
                </div>
                <span className={statusClass(product.status)}>{statusLabels[product.status]}</span>
              </div>
              <strong>{product.totalQuantity}</strong>
              <div className="inventory-model-card__locations">
                {product.locations.slice(0, 4).map((itemLocation) => (
                  <span key={itemLocation}>{itemLocation}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

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
              {filteredItems.map((item) => (
                <tr
                  className={item.status === "negative" ? "data-table__row--danger" : ""}
                  key={item.id}
                >
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
    </div>
  );
}
