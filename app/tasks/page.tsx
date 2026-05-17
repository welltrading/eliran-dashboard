import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { getTasks, getTaskScheduleSummary } from "@/lib/airtable/services/tasks";
import { TasksTableClient } from "./TasksTableClient";

export const dynamic = "force-dynamic";

const AIRTABLE_TASKS_TABLE_URL =
  "https://airtable.com/app77CdzKEqLlhZ8d/tblsodUowDPPiOcCk";

export default async function TasksPage() {
  const tasks = await getTasks();
  const summary = getTaskScheduleSummary(tasks);

  return (
    <div className="page">
      <PageHeader
        title="משימות / התקנות"
        description="דשבורד קריאה בלבד לתיאום התקנות, מתקינים ולוחות זמנים."
      />

      <Card className="validation-card">
        <div className="card__body exception-panel__header">
          <p className="muted-text">יצירה ועריכת משימות מתבצעת כרגע באירטייבל.</p>
          <a
            className="primary-action"
            href={AIRTABLE_TASKS_TABLE_URL}
            target="_blank"
            rel="noreferrer"
          >
            פתח טבלת משימות באירטייבל
          </a>
        </div>
      </Card>

      <div className="grid stats-grid tasks-summary">
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">סה"כ משימות</p>
            <p className="stat-card__value">{summary.totalTasks}</p>
            <p className="stat-card__note">מתוך טבלת משימות</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">מתוכננות היום</p>
            <p className="stat-card__value">{summary.scheduledToday}</p>
            <p className="stat-card__note">לפי תאריך ביצוע</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">מתוכננות מחר</p>
            <p className="stat-card__value">{summary.scheduledTomorrow}</p>
            <p className="stat-card__note">לפי תאריך ביצוע</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">ללא תאריך</p>
            <p className="stat-card__value">{summary.withoutDate}</p>
            <p className="stat-card__note">דורש תיאום</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">ללא מתקין</p>
            <p className="stat-card__value">{summary.withoutInstaller}</p>
            <p className="stat-card__note">דורש שיוך מתקין</p>
          </div>
        </Card>
        <Card>
          <div className="card__body stat-card">
            <p className="stat-card__label">סידור לא נשלח</p>
            <p className="stat-card__value">{summary.scheduleNotSentToInstaller}</p>
            <p className="stat-card__note">למתקין</p>
          </div>
        </Card>
      </div>

      <Card className="validation-card">
        <div className="card__body task-status-summary">
          <span className="filter-label">משימות לפי סטטוס</span>
          <div>
            {summary.byStatus.length > 0 ? (
              summary.byStatus.map((item) => (
                <span className="badge" key={item.status}>
                  {item.status}: {item.count}
                </span>
              ))
            ) : (
              <span className="muted-text">אין סטטוסים להצגה</span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <TasksTableClient
          tasks={tasks}
          airtableTasksTableUrl={AIRTABLE_TASKS_TABLE_URL}
        />
      </Card>
    </div>
  );
}
