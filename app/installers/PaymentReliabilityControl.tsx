import type {
  DuplicateTaskApprovalIssue,
  PaymentReliabilityControlData,
} from "@/lib/types";
import type { ReactNode } from "react";

type PaymentReliabilityControlProps = {
  data: PaymentReliabilityControlData;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function IssueSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="payment-reliability__section">
      <div className="payment-reliability__section-header">
        <h3>{title}</h3>
        <span className={count > 0 ? "badge badge--warning" : "badge badge--success"}>
          {count > 0 ? `${count} חריגות` : "תקין"}
        </span>
      </div>
      {children}
    </section>
  );
}

function ApprovalStatuses({ issue }: { issue: DuplicateTaskApprovalIssue }) {
  const statuses = issue.statuses.length > 0 ? issue.statuses.join(", ") : "-";

  return (
    <>
      {statuses}
      {issue.validApprovalCount > 1 ? (
        <span className="badge badge--danger">יותר מאישור תקף אחד</span>
      ) : null}
    </>
  );
}

export function PaymentReliabilityControl({
  data,
}: PaymentReliabilityControlProps) {
  return (
    <>
      <div className="card__body pending-approvals__header">
        <div>
          <h2>בקרת אמינות תשלומים</h2>
          <p>{data.totalIssueCount} חריגות שמשפיעות על אמינות דוח התשלומים.</p>
        </div>
      </div>

      <div className="payment-reliability">
        <div className="payment-reliability__summary" aria-label="סיכום חריגות">
          <div>
            <strong>{data.missingAmountApprovals.length}</strong>
            <span>אישורים תקפים ללא סכום</span>
          </div>
          <div>
            <strong>{data.duplicateTaskApprovals.length}</strong>
            <span>כפילויות אישורים</span>
          </div>
          <div>
            <strong>{data.pendingApprovalTasks.length}</strong>
            <span>משימות ממתינות לאישור</span>
          </div>
          <div>
            <strong>{data.tasksWithoutRate.length}</strong>
            <span>משימות ללא תעריף</span>
          </div>
        </div>

        <IssueSection
          title="אישורים תקפים ללא סכום / סכום 0"
          count={data.missingAmountApprovals.length}
        >
          {data.missingAmountApprovals.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table payment-reliability__table">
                <thead>
                  <tr>
                    <th>אישור</th>
                    <th>מתקין</th>
                    <th>תאריך התקנה</th>
                    <th>משימה</th>
                    <th>הזמנה</th>
                    <th>סכום</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {data.missingAmountApprovals.map((issue) => (
                    <tr className="data-table__row--warning" key={issue.id}>
                      <td>{issue.approvalId}</td>
                      <td>{issue.installerName ?? "-"}</td>
                      <td>{formatDate(issue.installationDate)}</td>
                      <td>{issue.taskId ?? "-"}</td>
                      <td>{issue.orderNumber ?? "-"}</td>
                      <td>{formatCurrency(issue.amount)}</td>
                      <td>{issue.approvalStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="payment-reliability__ok">אין אישורים תקפים עם סכום חסר.</p>
          )}
        </IssueSection>

        <IssueSection
          title="כפילויות אישורי ביצוע לאותה משימה"
          count={data.duplicateTaskApprovals.length}
        >
          {data.duplicateTaskApprovals.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table payment-reliability__table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>מספר אישורים</th>
                    <th>סטטוסים</th>
                    <th>אישורים תקפים</th>
                    <th>Approval IDs</th>
                  </tr>
                </thead>
                <tbody>
                  {data.duplicateTaskApprovals.map((issue) => (
                    <tr
                      className={
                        issue.validApprovalCount > 1
                          ? "data-table__row--danger"
                          : "data-table__row--warning"
                      }
                      key={issue.taskId}
                    >
                      <td>{issue.taskId}</td>
                      <td>{issue.approvalCount}</td>
                      <td>
                        <ApprovalStatuses issue={issue} />
                      </td>
                      <td>{issue.validApprovalCount}</td>
                      <td>{issue.approvalIds.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="payment-reliability__ok">לא נמצאו כפילויות אישורים למשימה.</p>
          )}
        </IssueSection>

        <IssueSection
          title="משימות שבוצעו וממתינות לאישור"
          count={data.pendingApprovalTasks.length}
        >
          {data.pendingApprovalTasks.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table payment-reliability__table">
                <thead>
                  <tr>
                    <th>תאריך ביצוע</th>
                    <th>לקוח</th>
                    <th>הזמנה</th>
                    <th>סוג משימה</th>
                    <th>מתקין</th>
                    <th>סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pendingApprovalTasks.map((task) => (
                    <tr className="data-table__row--warning" key={task.id}>
                      <td>{formatDate(task.executionDate)}</td>
                      <td>{task.customerName ?? "-"}</td>
                      <td>{task.orderNumber ?? "-"}</td>
                      <td>{task.taskType ?? "-"}</td>
                      <td>{task.installerName}</td>
                      <td>
                        {task.paymentAmount ? (
                          formatCurrency(task.paymentAmount)
                        ) : (
                          <span className="badge badge--warning">חסר סכום</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="payment-reliability__ok">אין משימות שבוצעו וממתינות לאישור.</p>
          )}
        </IssueSection>

        <IssueSection title="משימות ללא תעריף" count={data.tasksWithoutRate.length}>
          {data.tasksWithoutRate.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table payment-reliability__table">
                <thead>
                  <tr>
                    <th>לקוח</th>
                    <th>הזמנה</th>
                    <th>סוג משימה</th>
                    <th>מתקין</th>
                    <th>תאריך ביצוע</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tasksWithoutRate.map((task) => (
                    <tr className="data-table__row--warning" key={task.id}>
                      <td>{task.customerName ?? "-"}</td>
                      <td>{task.orderNumber ?? "-"}</td>
                      <td>{task.taskType ?? "-"}</td>
                      <td>{task.installerName ?? "-"}</td>
                      <td>{formatDate(task.executionDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="payment-reliability__ok">אין משימות ללא תעריף.</p>
          )}
        </IssueSection>
      </div>
    </>
  );
}
