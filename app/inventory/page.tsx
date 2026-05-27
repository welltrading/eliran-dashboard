import { getInventoryMovements } from "@/lib/airtable/services/inventory-movements";
import {
  buildInventoryValidation,
  getInventoryByLocation,
} from "@/lib/airtable/services/inventory";
import { getProducts } from "@/lib/airtable/services/products";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  InventoryTableClient,
  type InventoryLocationSummary,
  type InventoryProductOption,
  type InventoryTableItem,
} from "./InventoryTableClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [items, movements, products] = await Promise.all([
    getInventoryByLocation(),
    getInventoryMovements(),
    getProducts(),
  ]);
  const validation = buildInventoryValidation(items, movements);
  const tableItems: InventoryTableItem[] = items.map((item) => ({
    id: item.id,
    productName: item.productName,
    productSku: item.productSku,
    productRecordId: item.productRecordId,
    location: item.location,
    availableQuantity: item.availableQuantity,
    status: item.status,
    displayForMoran: item.displayForMoran,
  }));
  const productOptions: InventoryProductOption[] = products
    .map((product) => ({
      id: product.id,
      label: product.selectLabel,
      model: product.baseModel,
      stockDisplay: product.stockDisplay,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "he"));
  const locationSummaryByName = new Map<string, InventoryLocationSummary>();

  items.forEach((item) => {
    const location = item.location || "ללא מיקום";
    const current = locationSummaryByName.get(location) ?? {
      location,
      totalQuantity: 0,
      itemCount: 0,
      lowCount: 0,
      outCount: 0,
      negativeCount: 0,
    };

    current.totalQuantity += item.availableQuantity;
    current.itemCount += 1;

    if (item.status === "low") {
      current.lowCount += 1;
    }

    if (item.status === "out") {
      current.outCount += 1;
    }

    if (item.status === "negative") {
      current.negativeCount += 1;
    }

    locationSummaryByName.set(location, current);
  });

  const locationSummaries = Array.from(locationSummaryByName.values()).sort((a, b) =>
    a.location.localeCompare(b.location, "he"),
  );
  const locations = locationSummaries.map((summary) => summary.location).filter(Boolean);
  const statusCounts = {
    ok: items.filter((item) => item.status === "ok").length,
    low: validation.inventoryLowCount,
    out: validation.inventoryOutCount,
    negative: validation.inventoryNegativeCount,
  };
  const negativeItems = items.filter((item) => item.status === "negative");

  return (
    <div className="page page--wide">
      <PageHeader
        title="ניהול מלאי"
        description="דגמים, מיקומים, חריגות ועדכוני כניסה ויציאה מהמלאי."
      />
      <div className="grid stats-grid inventory-summary">
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">סה"כ רשומות מלאי</p>
            <p className="stat-card__value">{items.length}</p>
            <p className="stat-card__note">לפי מוצר ומיקום</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">מיקומים פעילים</p>
            <p className="stat-card__value">{locationSummaries.length}</p>
            <p className="stat-card__note">מחסן, חנות, רכב או אתר</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">מלאי תקין</p>
            <p className="stat-card__value">{statusCounts.ok}</p>
            <p className="stat-card__note">כמות מעל 3</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">מלאי נמוך / אזל</p>
            <p className="stat-card__value">{statusCounts.low + statusCounts.out}</p>
            <p className="stat-card__note">
              נמוך {statusCounts.low} | אזל {statusCounts.out}
            </p>
          </div>
        </Card>
        <Card className="validation-card validation-card--danger">
          <div className="card__body stat-card">
            <p className="stat-card__label">מלאי שלילי</p>
            <p className="stat-card__value">{statusCounts.negative}</p>
            <p className="stat-card__note">דורש בדיקה לפני מכירה</p>
          </div>
        </Card>
      </div>
      <Card className="validation-card">
        <div className="card__body validation-list">
          <h2>בדיקות תקינות</h2>
          <div className="validation-grid">
            <span>מלאי שלילי: {validation.inventoryNegativeCount}</span>
            <span>אזל: {validation.inventoryOutCount}</span>
            <span>מלאי נמוך: {validation.inventoryLowCount}</span>
            <span>תנועות ללא מוצר: {validation.movementsMissingProduct}</span>
            <span>תנועות ללא מיקום: {validation.movementsMissingLocation}</span>
            <span>תנועות ללא כמות: {validation.movementsMissingQuantity}</span>
            <span>תנועות ללא מלאי לפי מיקום: {validation.movementsMissingStockLocation}</span>
          </div>
        </div>
      </Card>
      {negativeItems.length > 0 ? (
        <Card className="exception-card exception-card--danger">
          <div className="card__body exception-panel">
            <div className="exception-panel__header">
              <div>
                <h2>חריגות מלאי</h2>
                <p>פריטים עם מלאי שלילי שדורשים בדיקה.</p>
              </div>
              <span className="badge badge--danger">{negativeItems.length} פריטים</span>
            </div>
            <div className="exception-list">
              {negativeItems.map((item) => (
                <div className="exception-item" key={item.id}>
                  <strong>{item.productName || item.productSku || "מוצר ללא שם"}</strong>
                  <span>{item.productSku ?? "ללא מקט"}</span>
                  <span>{item.location || "ללא מיקום"}</span>
                  <span className="exception-item__quantity">{item.availableQuantity}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}
      <Card>
        <InventoryTableClient
          items={tableItems}
          locations={locations}
          locationSummaries={locationSummaries}
          productOptions={productOptions}
        />
      </Card>
    </div>
  );
}
