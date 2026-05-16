import { getInventoryMovements } from "@/lib/airtable/services/inventory-movements";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  InventoryMovementsTableClient,
  type InventoryMovementTableItem,
} from "./InventoryMovementsTableClient";

export const dynamic = "force-dynamic";

export default async function InventoryMovementsPage() {
  const movements = await getInventoryMovements();
  const tableMovements: InventoryMovementTableItem[] = movements.map((movement) => ({
    date: movement.date,
    productName: movement.productName,
    location: movement.location,
    movementType: movement.movementType,
    quantity: movement.quantity,
    relatedOrder: movement.relatedOrder,
    notes: movement.notes,
  }));

  return (
    <div className="page">
      <PageHeader title="תנועות מלאי" description="כניסות, יציאות, העברות והתאמות מלאי." />
      <Card>
        <InventoryMovementsTableClient movements={tableMovements} />
      </Card>
    </div>
  );
}
