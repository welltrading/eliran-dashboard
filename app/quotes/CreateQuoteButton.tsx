"use client";

import { useState } from "react";

type CreateQuoteButtonProps = {
  recordId: string;
  hasDocumentLines: boolean;
  ezDocUrl?: string | null;
};

type RequestState = "idle" | "loading" | "success" | "error";

export function CreateQuoteButton({
  recordId,
  hasDocumentLines,
  ezDocUrl,
}: CreateQuoteButtonProps) {
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const trimmedRecordId = recordId.trim();

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
          source: "document_lines",
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

  if (!hasDocumentLines) {
    return (
      <div className="quote-action">
        <button className="quote-action__button" type="button" disabled>
          יצירת הצעת מחיר
        </button>
        <span className="quote-action__message">
          נדרשות שורות מסמך לפני הפקת הצעת EasyCount
        </span>
      </div>
    );
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
