import { getInventoryMovements } from "@/lib/airtable/services/inventory-movements";
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

export default async function InventoryMovementsPage() {
  const [movements, inventory] = await Promise.all([
    getInventoryMovements(),
    getInventoryByLocation(),
  ]);
  const validation = buildInventoryValidation(inventory, movements);
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
    relatedOrder: movement.relatedOrder,
  }));

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
      <Card>
        <InventoryMovementsTableClient movements={tableMovements} />
      </Card>
    </div>
  );
}
