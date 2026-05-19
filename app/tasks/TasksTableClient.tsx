"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import { markTaskDoneAction, updateTaskAssignmentAction } from "./actions";

type DateFilter = "הכל" | "היום" | "מחר" | "השבוע" | "ללא תאריך";
type ScheduleSentFilter = "הכל" | "נשלח" | "לא נשלח" | "שגיאה";
type ScheduleView = "היום" | "מחר" | "השבוע" | "ללא תאריך";
type CalendarSlot = "10-13" | "13-16" | "16-19" | "ללא חלון זמן";
type CalendarSelection = {
  dayKey: string;
  slot: CalendarSlot;
};
type StatusFilter = "הכל" | TaskStatus;
type TaskInstallerOption = {
  id: string;
  name: string;
};

type TasksTableClientProps = {
  tasks: Task[];
  installerOptions: TaskInstallerOption[];
  airtableTasksTableUrl: string;
};

const timeWindowOrder = new Map([
  ["10-13", 1],
  ["13-16", 2],
  ["16-19", 3],
]);

const scheduleViews: ScheduleView[] = ["היום", "מחר", "השבוע", "ללא תאריך"];
const assignmentTimeWindows = ["10-13", "13-16", "16-19"] as const;
const weekDays = [
  { label: "ראשון", offset: 0 },
  { label: "שני", offset: 1 },
  { label: "שלישי", offset: 2 },
  { label: "רביעי", offset: 3 },
  { label: "חמישי", offset: 4 },
  { label: "שישי", offset: 5 },
  { label: "שבת", offset: 6 },
];
const calendarSlots: CalendarSlot[] = ["10-13", "13-16", "16-19", "ללא חלון זמן"];

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

function formatScheduleDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
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

function dateFromKey(value: string) {
  return new Date(`${value}T00:00:00`);
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

function isKnownTimeWindow(value: string | null) {
  return Boolean(value && timeWindowOrder.has(value));
}

function shortAddress(value: string | null) {
  if (!value) {
    return "-";
  }

  return value.split(",")[0]?.trim() || value;
}

function taskMatchesCalendarSlot(task: Task, dayKey: string, slot: CalendarSlot) {
  const sameDay = taskDateKey(task) === dayKey;

  if (!sameDay) {
    return false;
  }

  if (slot === "ללא חלון זמן") {
    return !isKnownTimeWindow(task.timeWindow);
  }

  return task.timeWindow === slot;
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

  const aInstallerOrCustomer = a.installerName ?? a.customerName ?? "";
  const bInstallerOrCustomer = b.installerName ?? b.customerName ?? "";

  if (aInstallerOrCustomer !== bInstallerOrCustomer) {
    return aInstallerOrCustomer.localeCompare(bInstallerOrCustomer, "he");
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

function scheduleViewMatches(task: Task, view: ScheduleView) {
  const currentTaskDate = taskDateKey(task);
  const today = dateKey(new Date());

  if (view === "ללא תאריך") {
    return !currentTaskDate;
  }

  if (!currentTaskDate) {
    return false;
  }

  if (view === "היום") {
    return currentTaskDate === today;
  }

  if (view === "מחר") {
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

function scheduleCardClass(task: Task, view: ScheduleView) {
  const classes = ["daily-schedule__task"];

  if (view === "ללא תאריך" || !task.installerName || !task.timeWindow) {
    classes.push("daily-schedule__task--warning");
  }

  if (task.status === "בוטל") {
    classes.push("daily-schedule__task--muted");
  }

  return classes.join(" ");
}

function weeklyTaskClass(task: Task) {
  const classes = ["weekly-calendar__detail-card"];

  if (!task.installerName || !isKnownTimeWindow(task.timeWindow)) {
    classes.push("weekly-calendar__detail-card--warning");
  }

  if (task.status === "בוטל") {
    classes.push("weekly-calendar__detail-card--muted");
  }

  return classes.join(" ");
}

function weeklyCompactTaskClass(task: Task) {
  const classes = ["weekly-calendar__compact-task"];

  if (!task.installerName || !isKnownTimeWindow(task.timeWindow)) {
    classes.push("weekly-calendar__compact-task--warning");
  }

  if (task.status === "בוטל") {
    classes.push("weekly-calendar__compact-task--muted");
  }

  return classes.join(" ");
}

export function TasksTableClient({
  tasks,
  installerOptions,
  airtableTasksTableUrl,
}: TasksTableClientProps) {
  const router = useRouter();
  const [isMarkingDone, startMarkingDoneTransition] = useTransition();
  const [isSavingAssignment, startAssignmentTransition] = useTransition();
  const [scheduleView, setScheduleView] = useState<ScheduleView>("היום");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("הכל");
  const [installer, setInstaller] = useState("הכל");
  const [dateFilter, setDateFilter] = useState<DateFilter>("הכל");
  const [scheduleSent, setScheduleSent] = useState<ScheduleSentFilter>("הכל");
  const [selectedCalendarSlot, setSelectedCalendarSlot] =
    useState<CalendarSelection | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [assignmentSavingTaskId, setAssignmentSavingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskUpdateError, setTaskUpdateError] = useState<string | null>(null);

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

  const scheduleTasks = useMemo(() => {
    return tasks
      .filter((task) => scheduleViewMatches(task, scheduleView))
      .sort(compareTaskSchedule);
  }, [scheduleView, tasks]);

  const scheduleGroups = useMemo(() => {
    if (scheduleView !== "השבוע") {
      return [
        {
          label: scheduleView,
          tasks: scheduleTasks,
          warning: scheduleView === "ללא תאריך",
        },
      ];
    }

    const grouped = new Map<string, Task[]>();

    scheduleTasks.forEach((task) => {
      const key = taskDateKey(task) ?? "ללא תאריך";
      grouped.set(key, [...(grouped.get(key) ?? []), task]);
    });

    return Array.from(grouped, ([key, groupTasks]) => ({
      label: key === "ללא תאריך" ? key : formatScheduleDate(key),
      tasks: groupTasks,
      warning: false,
    }));
  }, [scheduleTasks, scheduleView]);

  const currentWeekDays = useMemo(() => {
    const currentWeekStart = startOfWeek(new Date());
    const startDate = dateFromKey(currentWeekStart);

    return weekDays.map((day) => ({
      ...day,
      dateKey: dateKey(addDays(startDate, day.offset)),
    }));
  }, []);

  const weeklyTasks = useMemo(() => {
    const currentWeekStart = startOfWeek(new Date());
    const currentWeekEnd = endOfWeek(new Date());

    return tasks
      .filter((task) => {
        const currentTaskDate = taskDateKey(task);
        return (
          Boolean(currentTaskDate) &&
          currentTaskDate! >= currentWeekStart &&
          currentTaskDate! <= currentWeekEnd
        );
      })
      .sort(compareTaskSchedule);
  }, [tasks]);

  const firstNonEmptyCalendarSlot = useMemo<CalendarSelection | null>(() => {
    for (const day of currentWeekDays) {
      for (const slot of calendarSlots) {
        if (weeklyTasks.some((task) => taskMatchesCalendarSlot(task, day.dateKey, slot))) {
          return { dayKey: day.dateKey, slot };
        }
      }
    }

    return null;
  }, [currentWeekDays, weeklyTasks]);

  const activeCalendarSlot = selectedCalendarSlot ?? firstNonEmptyCalendarSlot;
  const activeCalendarDay = activeCalendarSlot
    ? currentWeekDays.find((day) => day.dateKey === activeCalendarSlot.dayKey)
    : null;
  const activeCalendarTasks = activeCalendarSlot
    ? weeklyTasks.filter((task) =>
        taskMatchesCalendarSlot(task, activeCalendarSlot.dayKey, activeCalendarSlot.slot),
      )
    : [];

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

  function handleMarkDone(task: Task) {
    if (task.actuallyDone || task.status === "בוצע" || isMarkingDone) {
      return;
    }

    setTaskUpdateError(null);
    setUpdatingTaskId(task.id);

    startMarkingDoneTransition(async () => {
      const result = await markTaskDoneAction(task.id);

      if (result.ok) {
        router.refresh();
        setUpdatingTaskId(null);
        return;
      }

      setTaskUpdateError(
        [result.message, ...(result.errors ?? [])].filter(Boolean).join(" "),
      );
      setUpdatingTaskId(null);
    });
  }

  function openAssignmentEditor(task: Task) {
    const currentTimeWindow = assignmentTimeWindows.includes(
      task.timeWindow as (typeof assignmentTimeWindows)[number],
    )
      ? task.timeWindow ?? ""
      : "";

    setTaskUpdateError(null);
    setEditingTaskId(task.id);
  }

  function closeAssignmentEditor() {
    if (isSavingAssignment) {
      return;
    }

    setEditingTaskId(null);
  }

  function handleSaveAssignment(task: Task, formData: FormData) {
    if (isSavingAssignment) {
      return;
    }

    setTaskUpdateError(null);
    setAssignmentSavingTaskId(task.id);

    startAssignmentTransition(async () => {
      const result = await updateTaskAssignmentAction({
        taskId: task.id,
        executionDate: String(formData.get("executionDate") ?? "") || null,
        timeWindow: String(formData.get("timeWindow") ?? "") || null,
        installerId: String(formData.get("installerId") ?? "") || null,
      });

      if (result.ok) {
        setEditingTaskId(null);
        setAssignmentSavingTaskId(null);
        router.refresh();
        return;
      }

      setTaskUpdateError(
        [result.message, ...(result.errors ?? [])].filter(Boolean).join(" "),
      );
      setAssignmentSavingTaskId(null);
    });
  }

  const renderAssignmentEditor = (task: Task) => {
    const isSavingCurrentTask = assignmentSavingTaskId === task.id;
    const currentTimeWindow = assignmentTimeWindows.includes(
      task.timeWindow as (typeof assignmentTimeWindows)[number],
    )
      ? task.timeWindow ?? ""
      : "";

    return (
      <tr className="tasks-table__assignment-row">
        <td colSpan={14}>
          <form
            className="task-assignment-editor"
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveAssignment(task, new FormData(event.currentTarget));
            }}
          >
            <div className="task-assignment-editor__heading">
              <div>
                <strong>עריכת שיבוץ</strong>
                <span>{task.title || "משימה ללא תיאור"}</span>
              </div>
            </div>

            <div className="task-assignment-editor__fields">
              <label className="filter-field">
                <span className="filter-label">תאריך ביצוע</span>
                <input
                  className="filter-input"
                  type="date"
                  name="executionDate"
                  defaultValue={task.executionDate?.slice(0, 10) ?? ""}
                  disabled={isSavingCurrentTask}
                />
              </label>

              <label className="filter-field">
                <span className="filter-label">חלון זמן</span>
                <select
                  className="filter-select"
                  name="timeWindow"
                  defaultValue={currentTimeWindow}
                  disabled={isSavingCurrentTask}
                >
                  <option value="">ללא חלון זמן</option>
                  {assignmentTimeWindows.map((timeWindow) => (
                    <option value={timeWindow} key={timeWindow}>
                      {timeWindow}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span className="filter-label">מתקין</span>
                <select
                  className="filter-select"
                  name="installerId"
                  defaultValue={task.installerIds[0] ?? ""}
                  disabled={isSavingCurrentTask}
                >
                  <option value="">ללא מתקין</option>
                  {installerOptions.map((installerOption) => (
                    <option value={installerOption.id} key={installerOption.id}>
                      {installerOption.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="task-assignment-editor__actions">
              <button
                className="primary-action"
                type="submit"
                disabled={isSavingCurrentTask}
              >
                {isSavingCurrentTask ? "שומר שיבוץ..." : "שמור שיבוץ"}
              </button>
              <button
                className="task-row-actions__secondary"
                type="button"
                disabled={isSavingCurrentTask}
                onClick={closeAssignmentEditor}
              >
                ביטול
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  };

  const renderRows = (rows: Task[]) =>
    rows.map((task) => (
      <Fragment key={task.id}>
        <tr className={statusClass(task)}>
          <td>
            <div className="task-row-actions">
              <button
                className="task-row-actions__done"
                type="button"
                disabled={task.actuallyDone || task.status === "בוצע" || updatingTaskId === task.id}
                onClick={() => handleMarkDone(task)}
              >
                {updatingTaskId === task.id ? "מעדכן..." : "סמן כבוצע"}
              </button>
              <button
                className="task-row-actions__secondary"
                type="button"
                disabled={assignmentSavingTaskId === task.id}
                onClick={() => openAssignmentEditor(task)}
              >
                ערוך שיבוץ
              </button>
              <a
                href={`${airtableTasksTableUrl}/${task.id}`}
                target="_blank"
                rel="noreferrer"
              >
                פתח משימה
              </a>
            </div>
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
        {editingTaskId === task.id ? renderAssignmentEditor(task) : null}
      </Fragment>
    ));

  const renderScheduleTask = (task: Task) => (
    <article className={scheduleCardClass(task, scheduleView)} key={task.id}>
      <div className="daily-schedule__time">
        {task.timeWindow ? (
          <strong>{task.timeWindow}</strong>
        ) : (
          <span className="badge badge--warning">ללא חלון זמן</span>
        )}
      </div>

      <div className="daily-schedule__main">
        <div>
          <h3>{task.title || "-"}</h3>
          <p>{task.taskType ?? "ללא סוג משימה"}</p>
        </div>
        <div className="daily-schedule__badges">
          <span className={task.status === "בוטל" ? "badge" : "badge badge--success"}>
            {task.status}
          </span>
          <span className={scheduleBadgeClass(task)}>{scheduleLabel(task)}</span>
          {!task.installerName && <span className="badge badge--warning">ללא מתקין</span>}
        </div>
      </div>

      <div className="daily-schedule__details">
        <span>{task.installerName ?? "ללא מתקין"}</span>
        <span>{task.customerName ?? "-"}</span>
        <span>{task.phone ?? "-"}</span>
        <span>{task.address ?? "-"}</span>
      </div>
    </article>
  );

  const renderWeeklyCompactTask = (task: Task) => (
    <div className={weeklyCompactTaskClass(task)} key={task.id}>
      <strong>{task.customerName ?? "-"}</strong>
      <span>{shortAddress(task.address)}</span>
      <span>{task.installerName ?? "ללא מתקין"}</span>
    </div>
  );

  const renderWeeklyDetailTask = (task: Task) => (
    <article className={weeklyTaskClass(task)} key={task.id}>
      <div className="weekly-calendar__detail-main">
        <h3>{task.customerName ?? "-"}</h3>
        <p>{task.title || "-"}</p>
        <span>{task.taskType ?? "ללא סוג משימה"}</span>
      </div>

      <div className="weekly-calendar__detail-grid">
        <span>{task.installerName ?? "ללא מתקין"}</span>
        <span>{task.address ?? "-"}</span>
      </div>

      <div className="weekly-calendar__detail-badges">
        <span className={task.status === "בוטל" ? "badge" : "badge badge--success"}>
          {task.status}
        </span>
        <span className={scheduleBadgeClass(task)}>{scheduleLabel(task)}</span>
      </div>

      {(!task.installerName || !isKnownTimeWindow(task.timeWindow)) && (
        <div className="weekly-calendar__detail-warnings">
          {!task.installerName && <span className="badge badge--warning">ללא מתקין</span>}
          {!isKnownTimeWindow(task.timeWindow) && (
            <span className="badge badge--warning">ללא חלון זמן</span>
          )}
        </div>
      )}

      <a
        href={`${airtableTasksTableUrl}/${task.id}`}
        target="_blank"
        rel="noreferrer"
      >
        פתח משימה
      </a>
    </article>
  );

  const tasksForCalendarCell = (dayKey: string, slot: CalendarSlot) => {
    return weeklyTasks.filter((task) => taskMatchesCalendarSlot(task, dayKey, slot));
  };

  return (
    <>
      <section className="daily-schedule" aria-label="לו״ז יומי">
        <div className="daily-schedule__header">
          <div>
            <h2>לו״ז יומי</h2>
            <p>{scheduleTasks.length} משימות</p>
          </div>
          <div className="daily-schedule__tabs" role="tablist" aria-label="טווח לו״ז">
            {scheduleViews.map((view) => (
              <button
                className={`daily-schedule__tab${
                  scheduleView === view ? " daily-schedule__tab--active" : ""
                }`}
                key={view}
                type="button"
                onClick={() => setScheduleView(view)}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {scheduleTasks.length > 0 ? (
          <div className="daily-schedule__groups">
            {scheduleGroups.map((group) => (
              <div
                className={`daily-schedule__group${
                  group.warning ? " daily-schedule__group--warning" : ""
                }`}
                key={group.label}
              >
                <h3>{group.label}</h3>
                <div className="daily-schedule__list">
                  {group.tasks.map(renderScheduleTask)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="daily-schedule__empty">אין משימות להצגה בטווח הזה.</div>
        )}
      </section>

      <section className="weekly-calendar" aria-label="יומן שבועי">
        <div className="weekly-calendar__header">
          <div>
            <h2>יומן שבועי</h2>
            <p>{weeklyTasks.length} משימות השבוע</p>
          </div>
        </div>

        <div className="weekly-calendar__scroller">
          <div className="weekly-calendar__grid">
            <div className="weekly-calendar__row weekly-calendar__row--head">
              <div className="weekly-calendar__corner">חלון זמן</div>
              {currentWeekDays.map((day) => (
                <div className="weekly-calendar__day" key={day.dateKey}>
                  <strong>{day.label}</strong>
                  <span>{formatScheduleDate(day.dateKey)}</span>
                </div>
              ))}
            </div>

            {calendarSlots.map((slot) => (
              <div className="weekly-calendar__row" key={slot}>
                <div
                  className={`weekly-calendar__slot${
                    slot === "ללא חלון זמן" ? " weekly-calendar__slot--warning" : ""
                  }`}
                >
                  {slot}
                </div>
                {currentWeekDays.map((day) => {
                  const cellTasks = tasksForCalendarCell(day.dateKey, slot);
                  const isSelected =
                    activeCalendarSlot?.dayKey === day.dateKey &&
                    activeCalendarSlot.slot === slot;
                  const visibleTasks = cellTasks.slice(0, 2);
                  const hiddenTasksCount = cellTasks.length - visibleTasks.length;

                  return (
                    <div
                      className={`weekly-calendar__cell${
                        slot === "ללא חלון זמן" ? " weekly-calendar__cell--warning" : ""
                      }${isSelected ? " weekly-calendar__cell--selected" : ""
                      }`}
                      key={`${day.dateKey}-${slot}`}
                    >
                      {cellTasks.length > 0 ? (
                        <button
                          className="weekly-calendar__cell-button"
                          type="button"
                          onClick={() => setSelectedCalendarSlot({ dayKey: day.dateKey, slot })}
                          aria-pressed={isSelected}
                          aria-label={`${day.label}, ${formatScheduleDate(day.dateKey)}, ${slot}, ${cellTasks.length} משימות`}
                        >
                          <div className="weekly-calendar__compact-list">
                            {visibleTasks.map(renderWeeklyCompactTask)}
                          </div>
                          {hiddenTasksCount > 0 && (
                            <span className="weekly-calendar__more">
                              +{hiddenTasksCount} נוספות
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="weekly-calendar__empty">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="weekly-calendar__details-panel" aria-live="polite">
          <div className="weekly-calendar__details-header">
            <div>
              <h3>פרטי חלון זמן</h3>
              {activeCalendarSlot && activeCalendarDay ? (
                <p>
                  {activeCalendarDay.label} · {formatScheduleDate(activeCalendarSlot.dayKey)} ·{" "}
                  {activeCalendarSlot.slot}
                </p>
              ) : (
                <p>אין משבצת שבועית נבחרת.</p>
              )}
            </div>
            <span className="badge">{activeCalendarTasks.length} משימות</span>
          </div>

          {activeCalendarTasks.length > 0 ? (
            <div className="weekly-calendar__details-list">
              {activeCalendarTasks.map(renderWeeklyDetailTask)}
            </div>
          ) : (
            <div className="weekly-calendar__details-empty">
              בחרו חלון זמן עם משימות כדי לראות פרטים מלאים.
            </div>
          )}
        </div>
      </section>

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
        {taskUpdateError ? (
          <div className="task-update-error" role="alert" aria-live="assertive">
            {taskUpdateError}
          </div>
        ) : null}

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
