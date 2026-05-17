import { getInventoryMovements } from "@/lib/airtable/services/inventory-movements";
import {
  buildInventoryValidation,
  getInventoryByLocation,
} from "@/lib/airtable/services/inventory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { InventoryTableClient, type InventoryTableItem } from "./InventoryTableClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [items, movements] = await Promise.all([getInventoryByLocation(), getInventoryMovements()]);
  const validation = buildInventoryValidation(items, movements);
  const tableItems: InventoryTableItem[] = items.map((item) => ({
    productName: item.productName,
    productSku: item.productSku,
    location: item.location,
    availableQuantity: item.availableQuantity,
    status: item.status,
    displayForMoran: item.displayForMoran,
  }));
  const statusCounts = {
    ok: items.filter((item) => item.status === "ok").length,
    low: validation.inventoryLowCount,
    out: validation.inventoryOutCount,
    negative: validation.inventoryNegativeCount,
  };

  return (
    <div className="page">
      <PageHeader title="מלאי לפי מיקום" description="כמויות זמינות לפי מחסן, רכב או אתר." />
      <div className="grid stats-grid inventory-summary">
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">סה"כ רשומות מלאי</p>
            <p className="stat-card__value">{items.length}</p>
            <p className="stat-card__note">קריאה בלבד מ-Airtable</p>
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
            <p className="stat-card__label">מלאי נמוך</p>
            <p className="stat-card__value">{statusCounts.low}</p>
            <p className="stat-card__note">כמות 1 עד 3</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">אזל</p>
            <p className="stat-card__value">{statusCounts.out}</p>
            <p className="stat-card__note">כמות 0</p>
          </div>
        </Card>
        <Card className="validation-card validation-card--danger">
          <div className="card__body stat-card">
            <p className="stat-card__label">מלאי שלילי</p>
            <p className="stat-card__value">{statusCounts.negative}</p>
            <p className="stat-card__note">מלאי שלילי: {statusCounts.negative}</p>
          </div>
        </Card>
      </div>
      <Card className="validation-card">
        <div className="card__body validation-list">
          <h2>Validation</h2>
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
      <Card>
        <InventoryTableClient items={tableItems} />
      </Card>
    </div>
  );
}
