import { getDocumentLines } from "@/lib/airtable/services/document-lines";
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
  const documentLines = await getDocumentLines();

  return (
    <div className="page page--wide">
      <PageHeader title="שורות מסמך" description="פירוט פריטים ושירותים מתוך טבלת שורות מסמך." />
      <Card>
        <div className="table-wrap">
          {documentLines.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>סוג מסמך</th>
                  <th>סוג שורה</th>
                  <th>תיאור לתצוגה</th>
                  <th>כמות</th>
                  <th>מחיר יחידה</th>
                  <th>הנחה</th>
                  <th>סה״כ שורה</th>
                  <th>מיקום יציאה</th>
                  <th>סטטוס</th>
                  <th>תאריך יצירה</th>
                </tr>
              </thead>
              <tbody>
                {documentLines.map((line, index) => (
                  <tr key={`${line.id}-${index}`}>
                    <td>{line.documentType ?? "-"}</td>
                    <td>{line.lineType ?? "-"}</td>
                    <td>{line.displayDescription || line.description || "-"}</td>
                    <td>{line.quantity}</td>
                    <td>{formatCurrency(line.unitPrice)}</td>
                    <td>{line.discountPercent ? `${line.discountPercent * 100}%` : "-"}</td>
                    <td>{formatCurrency(line.lineTotal)}</td>
                    <td>{line.exitLocation ?? "-"}</td>
                    <td>{line.status ?? "-"}</td>
                    <td>{formatDate(line.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="card__body placeholder">
              <div>
                <h2>אין שורות מסמך להצגה</h2>
                <p>כאשר יהיו רשומות בטבלת שורות מסמך ב-Airtable, הן יוצגו כאן לקריאה בלבד.</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
