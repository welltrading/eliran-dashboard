import { getOrders } from "@/lib/airtable/services/orders";
import { getProductsForQuoteForm } from "@/lib/airtable/services/products";
import {
  getTaskInstallerOptions,
  getTaskTypeOptions,
} from "@/lib/airtable/services/tasks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { RefreshDataButton } from "@/components/ui/RefreshDataButton";
import { CreateStandaloneOrderFormClient } from "./CreateStandaloneOrderFormClient";
import { OrdersTableClient } from "./OrdersTableClient";

export const dynamic = "force-dynamic";

type OrdersPageProps = {
  searchParams?: Promise<{
    orderId?: string | string[];
  }>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = await searchParams;
  const orderId = Array.isArray(resolvedSearchParams?.orderId)
    ? resolvedSearchParams?.orderId[0]
    : resolvedSearchParams?.orderId;
  const [orders, installerOptions, taskTypeOptions, products] = await Promise.all([
    getOrders(),
    getTaskInstallerOptions(),
    getTaskTypeOptions(),
    getProductsForQuoteForm(),
  ]);
  const displayedOrders = orderId
    ? orders.filter((order) => order.id === orderId)
    : orders;
  const orderNumberForFilter = displayedOrders[0]?.orderNumber ?? orderId;

  return (
    <div className="page page--wide">
      <PageHeader title="הזמנות" description="רשימת הזמנות וסטטוס טיפול." />
      <div className="page-actions">
        <RefreshDataButton />
      </div>
      {orderId ? (
        <Card className="validation-card">
          <div className="card__body task-filter-banner">
            <div>
              <strong>מציג הזמנה {orderNumberForFilter}</strong>
              <p>מוצגת רק ההזמנה שנבחרה ממסך אישורי הביצוע.</p>
            </div>
            <a className="task-row-actions__secondary" href="/orders">
              נקה סינון
            </a>
          </div>
        </Card>
      ) : null}
      <Card>
        <CreateStandaloneOrderFormClient products={products} />
        <div className="table-wrap orders-table-wrapper">
          {displayedOrders.length > 0 ? (
            <OrdersTableClient
              orders={displayedOrders}
              installerOptions={installerOptions}
              taskTypeOptions={taskTypeOptions}
            />
          ) : (
            <div className="card__body placeholder">
              <div>
                <h2>אין הזמנות להצגה</h2>
                <p>כאשר יהיו הזמנות פעילות, הן יוצגו כאן.</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
