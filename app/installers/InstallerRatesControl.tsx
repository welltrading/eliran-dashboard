import type { InstallerRate, TaskWithoutRate } from "@/lib/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

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

export function TasksWithoutRateTable({ tasks }: { tasks: TaskWithoutRate[] }) {
  if (tasks.length === 0) {
    return (
      <div className="card__body placeholder">
        <div>
          <h2>אין משימות ללא תעריף</h2>
          <p>כל המשימות עם מתקין או ביצוע בפועל כוללות מחיר מתוך טבלת התעריפים.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card__body pending-approvals__header">
        <div>
          <h2>משימות ללא תעריף</h2>
          <p>{tasks.length} משימות עם מתקין או ביצוע בפועל ללא מחיר תקין.</p>
        </div>
      </div>

      <div className="table-wrap pending-approvals">
        <table className="data-table installer-rates__missing-table">
          <thead>
            <tr>
              <th>לקוח</th>
              <th>מספר הזמנה</th>
              <th>סוג משימה</th>
              <th>מתקין</th>
              <th>תאריך ביצוע</th>
              <th>סטטוס תעריף</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr className="data-table__row--warning" key={task.id}>
                <td>{task.customerName ?? "-"}</td>
                <td>{task.orderNumber ?? "-"}</td>
                <td>{task.taskType ?? "-"}</td>
                <td>{task.installerName ?? "-"}</td>
                <td>{formatDate(task.executionDate)}</td>
                <td>
                  <span className="badge badge--warning">חסר תעריף</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function InstallerRatesTable({ rates }: { rates: InstallerRate[] }) {
  return (
    <>
      <div className="card__body pending-approvals__header">
        <div>
          <h2>בקרת תעריפי מתקינים</h2>
          <p>{rates.length} תעריפים מתוך טבלת תעריפים.</p>
        </div>
      </div>

      <div className="table-wrap pending-approvals">
        {rates.length > 0 ? (
          <table className="data-table installer-rates__table">
            <thead>
              <tr>
                <th>סוג משימה</th>
                <th>מחיר בשקלים</th>
                <th>פעיל</th>
                <th>מספר משימות מקושרות</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr
                  className={rate.active ? undefined : "data-table__row--muted"}
                  key={rate.id}
                >
                  <td>{rate.taskType}</td>
                  <td>{formatCurrency(rate.price)}</td>
                  <td>
                    <span
                      className={
                        rate.active ? "badge badge--success" : "badge badge--warning"
                      }
                    >
                      {rate.active ? "פעיל" : "לא פעיל"}
                    </span>
                  </td>
                  <td>{rate.linkedTaskCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card__body placeholder">
            <div>
              <h2>אין תעריפים להצגה</h2>
              <p>לא נמצאו רשומות בטבלת תעריפים.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
