import { getOrderLines } from "@/lib/airtable/services/order-lines";
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

export default async function OrderLinesPage() {
  const orderLines = await getOrderLines();

  return (
    <div className="page page--wide">
      <PageHeader title="שורות הזמנה" description="פירוט פריטים ושירותים בתוך הזמנות." />
      <Card>
        <div className="table-wrap">
          {orderLines.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>מספר הזמנה</th>
                  <th>מוצר / תיאור</th>
                  <th>כמות</th>
                  <th>מחיר כולל</th>
                  <th>מחיר לפני מע״מ</th>
                  <th>סוג תנועת מלאי</th>
                  <th>תאריך יצירה</th>
                </tr>
              </thead>
              <tbody>
                {orderLines.map((line, index) => (
                  <tr key={`${line.linkedOrderNumber ?? "line"}-${index}`}>
                    <td>{line.linkedOrderNumber ?? "-"}</td>
                    <td>{line.productDescription || "-"}</td>
                    <td>{line.quantity}</td>
                    <td>{formatCurrency(line.lineTotalPrice)}</td>
                    <td>{formatCurrency(line.priceBeforeVat)}</td>
                    <td>{line.inventoryMovementType ?? "-"}</td>
                    <td>{formatDate(line.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="card__body placeholder">
              <div>
                <h2>אין שורות הזמנה להצגה</h2>
                <p>כאשר יהיו רשומות בטבלת שורות ההזמנה ב-Airtable, הן יוצגו כאן לקריאה בלבד.</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
