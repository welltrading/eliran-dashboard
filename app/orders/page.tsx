import { getOrders } from "@/lib/airtable/services/orders";
import {
  getTaskInstallerOptions,
  getTaskTypeOptions,
} from "@/lib/airtable/services/tasks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { OrdersTableClient } from "./OrdersTableClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, installerOptions, taskTypeOptions] = await Promise.all([
    getOrders(),
    getTaskInstallerOptions(),
    getTaskTypeOptions(),
  ]);

  return (
    <div className="page">
      <PageHeader title="הזמנות" description="רשימת הזמנות וסטטוס טיפול." />
      <Card>
        <div className="table-wrap">
          {orders.length > 0 ? (
            <OrdersTableClient
              orders={orders}
              installerOptions={installerOptions}
              taskTypeOptions={taskTypeOptions}
            />
          ) : (
            <div className="card__body placeholder">
              <div>
                <h2>אין הזמנות להצגה</h2>
                <p>כאשר יהיו רשומות בטבלת ההזמנות ב-Airtable, הן יוצגו כאן לקריאה בלבד.</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
