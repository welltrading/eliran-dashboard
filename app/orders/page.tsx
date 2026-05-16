import { getOrders } from "@/lib/airtable/services/orders";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="page">
      <PageHeader title="הזמנות" description="רשימת הזמנות וסטטוס טיפול." />
      <Card>
        <div className="table-wrap">
          {orders.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>מספר הזמנה</th>
                  <th>שם לקוח</th>
                  <th>טלפון</th>
                  <th>סוג הזמנה</th>
                  <th>סטטוס</th>
                  <th>תאריך יצירה</th>
                  <th>מחיר כולל</th>
                  <th>מסמך EasyCount</th>
                  <th>הערות קצרות</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber || "-"}</td>
                    <td>{order.customerName || "-"}</td>
                    <td>{order.phone ?? "-"}</td>
                    <td>{order.orderType}</td>
                    <td>{order.status || "-"}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{formatCurrency(order.totalPrice)}</td>
                    <td>
                      {order.easyCountDocumentNumber ? <div>{order.easyCountDocumentNumber}</div> : null}
                      {order.easyCountDocumentUrl ? (
                        <a href={order.easyCountDocumentUrl} target="_blank" rel="noreferrer">
                          פתיחת מסמך
                        </a>
                      ) : null}
                      {!order.easyCountDocumentNumber && !order.easyCountDocumentUrl ? "-" : null}
                    </td>
                    <td>{order.shortNotes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
