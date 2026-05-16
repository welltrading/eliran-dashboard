import { getInventoryByLocation } from "@/lib/airtable/services/inventory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { InventoryTableClient, type InventoryTableItem } from "./InventoryTableClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await getInventoryByLocation();
  const tableItems: InventoryTableItem[] = items.map((item) => ({
    productName: item.productName,
    location: item.location,
    availableQuantity: item.availableQuantity,
    status: item.status,
    updatedAt: item.updatedAt,
  }));

  return (
    <div className="page">
      <PageHeader title="מלאי לפי מיקום" description="כמויות זמינות לפי מחסן, רכב או אתר." />
      <Card>
        <InventoryTableClient items={tableItems} />
      </Card>
    </div>
  );
}
