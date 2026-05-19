"use client";

import { useState } from "react";

type CreateQuoteButtonProps = {
  recordId: string;
  quoteType: string;
  ezDocUrl?: string | null;
};

type RequestState = "idle" | "loading" | "success" | "error";

export function CreateQuoteButton({
  recordId,
  quoteType,
  ezDocUrl,
}: CreateQuoteButtonProps) {
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const trimmedRecordId = recordId.trim();
  const trimmedQuoteType = quoteType.trim();

  if (ezDocUrl) {
    return (
      <div className="quote-action">
        <a href={ezDocUrl} target="_blank" rel="noreferrer">
          פתיחת PDF
        </a>
        <span className="quote-action__message">כבר נוצרה הצעת מחיר</span>
      </div>
    );
  }

  async function handleClick() {
    if (!trimmedRecordId) {
      setState("error");
      setMessage("חסר מזהה רשומה להצעת המחיר.");
      return;
    }

    if (!trimmedQuoteType) {
      setState("error");
      setMessage("חסר סוג הצעת מחיר.");
      return;
    }

    setState("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/easycount/create-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_id: trimmedRecordId,
          quote_type: trimmedQuoteType,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        details?: unknown;
      };

      if (!response.ok || !data.success) {
        const details =
          typeof data.details === "string" && data.details
            ? ` ${data.details}`
            : "";
        throw new Error(data.error ? `${data.error}.${details}` : "השליחה נכשלה.");
      }

      setState("success");
      setMessage("הבקשה נשלחה לאיזיקאונט. הקישור יתעדכן אחרי ש־Make יסיים.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? `שגיאה ביצירת הצעת מחיר: ${error.message}`
          : "שגיאה ביצירת הצעת מחיר.",
      );
    }
  }

  return (
    <div className="quote-action">
      <button
        className="quote-action__button"
        type="button"
        onClick={handleClick}
        disabled={state === "loading"}
      >
        {state === "loading" ? "יוצר הצעת מחיר..." : "יצירת הצעת מחיר"}
      </button>
      {message ? (
        <span
          className={`quote-action__message quote-action__message--${state}`}
          role={state === "error" ? "alert" : "status"}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
