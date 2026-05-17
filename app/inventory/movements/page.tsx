import { getInventoryMovements } from "@/lib/airtable/services/inventory-movements";
import { getOrderLines } from "@/lib/airtable/services/order-lines";
import {
  buildInventoryValidation,
  getInventoryByLocation,
} from "@/lib/airtable/services/inventory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  InventoryMovementsTableClient,
  type InventoryMovementTableItem,
} from "./InventoryMovementsTableClient";

export const dynamic = "force-dynamic";

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

export default async function InventoryMovementsPage() {
  const [movements, inventory, orderLines] = await Promise.all([
    getInventoryMovements(),
    getInventoryByLocation(),
    getOrderLines(),
  ]);
  const validation = buildInventoryValidation(inventory, movements);
  const orderLineLabelById = new Map(
    orderLines.map((line) => [
      line.id,
      line.linkedOrderNumber ? String(line.linkedOrderNumber) : "שורת הזמנה",
    ]),
  );
  const tableMovements: InventoryMovementTableItem[] = movements.map((movement) => ({
    movementNumber: movement.movementNumber,
    date: movement.date,
    productName: movement.productName,
    productRecordIds: movement.productRecordIds,
    location: movement.location,
    movementType: movement.movementType,
    quantity: movement.quantity,
    calculatedQuantity: movement.calculatedQuantity,
    status: movement.status,
    orderLineIds: movement.orderLineIds,
    orderLineLabels: movement.orderLineIds.map(
      (orderLineId) => orderLineLabelById.get(orderLineId) ?? "שורת הזמנה",
    ),
    relatedOrder: movement.relatedOrder,
  }));
  const missingProductMovements = tableMovements.filter(
    (movement) => movement.productRecordIds.length === 0,
  );

  return (
    <div className="page">
      <PageHeader title="תנועות מלאי" description="כניסות, יציאות, העברות והתאמות מלאי." />
      <Card className="validation-card">
        <div className="card__body validation-list">
          <h2>Validation</h2>
          <div className="validation-grid">
            <span>תנועות ללא מוצר: {validation.movementsMissingProduct}</span>
            <span>תנועות ללא מיקום: {validation.movementsMissingLocation}</span>
            <span>תנועות ללא כמות: {validation.movementsMissingQuantity}</span>
            <span>תנועות ללא מלאי לפי מיקום: {validation.movementsMissingStockLocation}</span>
          </div>
        </div>
      </Card>
      {missingProductMovements.length > 0 ? (
        <Card className="exception-card exception-card--danger">
          <div className="card__body exception-panel">
            <div className="exception-panel__header">
              <div>
                <h2>חריגות מלאי</h2>
                <p>תנועות מלאי ללא מוצר מקושר.</p>
              </div>
              <span className="badge badge--danger">
                {missingProductMovements.length} תנועות
              </span>
            </div>
            <div className="exception-list">
              {missingProductMovements.map((movement) => (
                <div className="exception-item" key={movement.movementNumber ?? movement.date}>
                  <strong>תנועה {movement.movementNumber ?? "-"}</strong>
                  <span>{formatDate(movement.date)}</span>
                  <span>{movement.location ?? "ללא מיקום"}</span>
                  <span>כמות {movement.quantity}</span>
                  <span>מחושבת {movement.calculatedQuantity}</span>
                  <span>
                    שורה {movement.orderLineLabels.join(", ") || movement.relatedOrder || "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}
      <Card>
        <InventoryMovementsTableClient movements={tableMovements} />
      </Card>
    </div>
  );
}
