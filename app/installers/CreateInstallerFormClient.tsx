"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createInstallerAction } from "./actions";

type CreateInstallerFormClientProps = {
  airtableTableUrl: string;
};

type CreateInstallerState = {
  kind: "success" | "error";
  message: string;
  errors?: string[];
} | null;

export function CreateInstallerFormClient({
  airtableTableUrl,
}: CreateInstallerFormClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<CreateInstallerState>(null);
  const [isPending, startTransition] = useTransition();

  function closeForm() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setResult(null);
  }

  function handleSubmit(formData: FormData, form: HTMLFormElement) {
    if (isPending) {
      return;
    }

    setResult(null);
    startTransition(async () => {
      const response = await createInstallerAction({
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? "") || null,
        phone: String(formData.get("phone") ?? "") || null,
        mobile: String(formData.get("mobile") ?? "") || null,
        email: String(formData.get("email") ?? "") || null,
      });

      if (response.ok) {
        form.reset();
        setIsOpen(false);
        setResult({ kind: "success", message: response.message });
        router.refresh();
        return;
      }

      setResult({
        kind: "error",
        message: response.message,
        errors: response.errors,
      });
    });
  }

  return (
    <section className="standalone-task-creator" aria-label="יצירת מתקין">
      <div className="standalone-task-creator__header">
        <div>
          <h2>מתקינים</h2>
          <p>הוספה מהירה של מתקין חדש לטבלת המתקינים.</p>
        </div>
        <div className="page-actions">
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setResult(null);
              setIsOpen((current) => !current);
            }}
            disabled={isPending}
          >
            הוסף מתקין חדש
          </button>
          <a
            className="secondary-action"
            href={airtableTableUrl}
            target="_blank"
            rel="noreferrer"
          >
            פתח טבלת מתקינים באירטייבל
          </a>
        </div>
      </div>

      {result ? (
        <div
          className={`result-panel result-panel--${result.kind === "success" ? "success" : "error"}`}
        >
          <p>{result.message}</p>
          {result.errors && result.errors.length > 0 ? (
            <ul>
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {isOpen ? (
        <form
          className="standalone-task-creator__form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(new FormData(event.currentTarget), event.currentTarget);
          }}
        >
          <div className="task-assignment-editor__fields standalone-task-creator__fields">
            <label className="filter-field">
              <span className="filter-label">שם פרטי</span>
              <input
                className="filter-input"
                name="firstName"
                required
                disabled={isPending}
              />
            </label>
            <label className="filter-field">
              <span className="filter-label">שם משפחה</span>
              <input className="filter-input" name="lastName" disabled={isPending} />
            </label>
            <label className="filter-field">
              <span className="filter-label">טלפון</span>
              <input
                className="filter-input"
                name="phone"
                type="tel"
                disabled={isPending}
              />
            </label>
            <label className="filter-field">
              <span className="filter-label">נייד</span>
              <input
                className="filter-input"
                name="mobile"
                type="tel"
                disabled={isPending}
              />
            </label>
            <label className="filter-field">
              <span className="filter-label">אימייל</span>
              <input
                className="filter-input"
                name="email"
                type="email"
                disabled={isPending}
              />
            </label>
          </div>
          <div className="task-assignment-editor__actions">
            <button className="primary-action" type="submit" disabled={isPending}>
              {isPending ? "יוצר..." : "שמור מתקין"}
            </button>
            <button
              className="task-row-actions__secondary"
              type="button"
              disabled={isPending}
              onClick={closeForm}
            >
              ביטול
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
