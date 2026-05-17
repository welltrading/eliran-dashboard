"use client";

import { useMemo, useState } from "react";
import type { Task, TaskStatus } from "@/lib/types";

type DateFilter = "הכל" | "היום" | "מחר" | "השבוע" | "ללא תאריך";
type ScheduleSentFilter = "הכל" | "נשלח" | "לא נשלח" | "שגיאה";
type StatusFilter = "הכל" | TaskStatus;

type TasksTableClientProps = {
  tasks: Task[];
  airtableTasksTableUrl: string;
};

const timeWindowOrder = new Map([
  ["10-13", 1],
  ["13-16", 2],
  ["16-19", 3],
]);

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

function dateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(value: Date) {
  const next = new Date(value);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  return dateKey(next);
}

function endOfWeek(value: Date) {
  const next = new Date(value);
  const day = next.getDay();
  next.setDate(next.getDate() + (6 - day));
  return dateKey(next);
}

function taskDateKey(task: Task) {
  return task.executionDate?.slice(0, 10) ?? null;
}

function compareTaskSchedule(a: Task, b: Task) {
  const aDate = taskDateKey(a);
  const bDate = taskDateKey(b);

  if (!aDate && !bDate) {
    return a.title.localeCompare(b.title, "he");
  }

  if (!aDate) {
    return 1;
  }

  if (!bDate) {
    return -1;
  }

  if (aDate !== bDate) {
    return aDate.localeCompare(bDate);
  }

  const aWindow = timeWindowOrder.get(a.timeWindow ?? "") ?? 99;
  const bWindow = timeWindowOrder.get(b.timeWindow ?? "") ?? 99;

  if (aWindow !== bWindow) {
    return aWindow - bWindow;
  }

  return a.title.localeCompare(b.title, "he");
}

function scheduleSentMatches(task: Task, filter: ScheduleSentFilter) {
  if (filter === "הכל") {
    return true;
  }

  if (filter === "שגיאה") {
    return Boolean(task.scheduleSendError) || task.scheduleSendStatus === "שגיאה";
  }

  if (filter === "נשלח") {
    return task.scheduleSentToInstaller;
  }

  return !task.scheduleSentToInstaller;
}

function dateMatches(task: Task, filter: DateFilter) {
  const currentTaskDate = taskDateKey(task);
  const today = dateKey(new Date());

  if (filter === "הכל") {
    return true;
  }

  if (filter === "ללא תאריך") {
    return !currentTaskDate;
  }

  if (!currentTaskDate) {
    return false;
  }

  if (filter === "היום") {
    return currentTaskDate === today;
  }

  if (filter === "מחר") {
    return currentTaskDate === dateKey(addDays(new Date(), 1));
  }

  return currentTaskDate >= startOfWeek(new Date()) && currentTaskDate <= endOfWeek(new Date());
}

function statusClass(task: Task) {
  if (task.status === "בוטל") {
    return "data-table__row--muted";
  }

  if (!task.executionDate || task.installerIds.length === 0 || task.scheduleSendError) {
    return "data-table__row--warning";
  }

  return "";
}

function scheduleBadgeClass(task: Task) {
  if (task.scheduleSendError) {
    return "badge badge--danger";
  }

  if (task.scheduleSentToInstaller) {
    return "badge badge--success";
  }

  return "badge badge--warning";
}

function scheduleLabel(task: Task) {
  if (task.scheduleSendError) {
    return task.scheduleSendStatus ?? "שגיאה";
  }

  if (task.scheduleSentToInstaller) {
    return task.scheduleSendStatus ?? "נשלח";
  }

  return task.scheduleSendStatus ?? "לא נשלח";
}

export function TasksTableClient({
  tasks,
  airtableTasksTableUrl,
}: TasksTableClientProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("הכל");
  const [installer, setInstaller] = useState("הכל");
  const [dateFilter, setDateFilter] = useState<DateFilter>("הכל");
  const [scheduleSent, setScheduleSent] = useState<ScheduleSentFilter>("הכל");

  const statuses = useMemo(() => {
    return Array.from(new Set(tasks.map((task) => task.status))).sort((a, b) =>
      a.localeCompare(b, "he"),
    );
  }, [tasks]);

  const installers = useMemo(() => {
    return Array.from(
      new Set(tasks.map((task) => task.installerName).filter((value): value is string => Boolean(value))),
    ).sort((a, b) => a.localeCompare(b, "he"));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const searchableText = [
          task.title,
          task.orderNumber ?? "",
          task.customerName ?? "",
          task.phone ?? "",
          task.address ?? "",
          task.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();
        const searchMatches =
          !normalizedSearch || searchableText.includes(normalizedSearch);
        const statusMatches = status === "הכל" || task.status === status;
        const installerMatches =
          installer === "הכל" || task.installerName === installer;

        return (
          searchMatches &&
          statusMatches &&
          installerMatches &&
          dateMatches(task, dateFilter) &&
          scheduleSentMatches(task, scheduleSent)
        );
      })
      .sort(compareTaskSchedule);
  }, [dateFilter, installer, scheduleSent, search, status, tasks]);

  const scheduledTasks = filteredTasks.filter((task) => task.executionDate);
  const unscheduledTasks = filteredTasks.filter((task) => !task.executionDate);

  const renderRows = (rows: Task[]) =>
    rows.map((task) => (
      <tr className={statusClass(task)} key={task.id}>
        <td>
          <a
            href={`${airtableTasksTableUrl}/${task.id}`}
            target="_blank"
            rel="noreferrer"
          >
            פתח משימה
          </a>
        </td>
        <td>{formatDate(task.executionDate)}</td>
        <td>{task.timeWindow ?? "-"}</td>
        <td>{task.title || "-"}</td>
        <td>
          <span className={task.status === "בוטל" ? "badge" : "badge badge--success"}>
            {task.status}
          </span>
        </td>
        <td>{task.taskType ?? "-"}</td>
        <td>
          {task.installerName ? (
            task.installerName
          ) : (
            <span className="badge badge--warning">ללא מתקין</span>
          )}
        </td>
        <td>{task.orderNumber ?? "-"}</td>
        <td>{task.customerName ?? "-"}</td>
        <td>{task.phone ?? "-"}</td>
        <td>{task.address ?? "-"}</td>
        <td>
          <span className={scheduleBadgeClass(task)}>{scheduleLabel(task)}</span>
        </td>
        <td>{task.actuallyDone ? "כן" : "לא"}</td>
        <td className="task-notes">{task.notes ?? task.scheduleSendError ?? "-"}</td>
      </tr>
    ));

  return (
    <>
      <div className="filters-bar tasks-filters" aria-label="סינון משימות">
        <label className="filter-field filter-field--search">
          <span className="filter-label">חיפוש</span>
          <input
            className="filter-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי לקוח, הזמנה, משימה או טלפון"
          />
        </label>

        <label className="filter-field">
          <span className="filter-label">סטטוס</span>
          <select
            className="filter-select"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="הכל">הכל</option>
            {statuses.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">מתקין</span>
          <select
            className="filter-select"
            value={installer}
            onChange={(event) => setInstaller(event.target.value)}
          >
            <option value="הכל">הכל</option>
            {installers.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">תאריך ביצוע</span>
          <select
            className="filter-select"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as DateFilter)}
          >
            <option value="הכל">הכל</option>
            <option value="היום">היום</option>
            <option value="מחר">מחר</option>
            <option value="השבוע">השבוע</option>
            <option value="ללא תאריך">ללא תאריך</option>
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">סידור נשלח</span>
          <select
            className="filter-select"
            value={scheduleSent}
            onChange={(event) =>
              setScheduleSent(event.target.value as ScheduleSentFilter)
            }
          >
            <option value="הכל">הכל</option>
            <option value="נשלח">נשלח</option>
            <option value="לא נשלח">לא נשלח</option>
            <option value="שגיאה">שגיאה</option>
          </select>
        </label>

        <p className="table-summary">
          מציג {filteredTasks.length} מתוך {tasks.length}
        </p>
      </div>

      <div className="table-wrap">
        {filteredTasks.length > 0 ? (
          <table className="data-table tasks-table">
            <thead>
              <tr>
                <th>פעולה</th>
                <th>תאריך ביצוע</th>
                <th>חלון זמן</th>
                <th>משימה</th>
                <th>סטטוס</th>
                <th>סוג</th>
                <th>מתקין</th>
                <th>מספר הזמנה</th>
                <th>לקוח</th>
                <th>טלפון</th>
                <th>כתובת</th>
                <th>סידור נשלח</th>
                <th>בוצע בפועל</th>
                <th>הערות</th>
              </tr>
            </thead>
            <tbody>
              {renderRows(scheduledTasks)}
              {unscheduledTasks.length > 0 && (
                <tr className="tasks-table__section-row">
                  <td colSpan={14}>משימות ללא תאריך ביצוע</td>
                </tr>
              )}
              {renderRows(unscheduledTasks)}
            </tbody>
          </table>
        ) : (
          <div className="card__body placeholder">
            <div>
              <h2>אין משימות להצגה</h2>
              <p>לא נמצאו משימות שתואמות לחיפוש או לסינון הנוכחי.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
