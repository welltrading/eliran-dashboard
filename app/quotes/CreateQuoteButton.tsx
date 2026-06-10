"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateQuoteButtonProps = {
  recordId: string;
  hasDocumentLines: boolean;
  ezDocUrl?: string | null;
  ezDocNumber?: string | null;
  ezDocStatus?: string | null;
  ezDocError?: string | null;
};

type RequestState = "idle" | "loading" | "success" | "error";

type QuotePollingResponse = {
  success?: boolean;
  quote?: {
    ezDocUrl?: string | null;
    ezDocNumber?: string | null;
    ezDocStatus?: string | null;
    ezDocError?: string | null;
  };
  error?: string;
};

const pollingIntervalMs = 2000;
const pollingTimeoutMs = 20000;

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isUsableUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function CreateQuoteButton({
  recordId,
  hasDocumentLines,
  ezDocUrl,
  ezDocNumber,
  ezDocStatus,
  ezDocError,
}: CreateQuoteButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const trimmedRecordId = recordId.trim();
  const hasEasyCountDocument = isUsableUrl(ezDocUrl) || Boolean(ezDocNumber);

  async function readQuoteStatus() {
    const response = await fetch(
      `/api/quotes/${encodeURIComponent(trimmedRecordId)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as QuotePollingResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.error || "קריאת מצב ההצעה נכשלה.");
    }

    return data.quote ?? null;
  }

  async function pollForEasyCountResult() {
    const startedAt = Date.now();

    while (Date.now() - startedAt < pollingTimeoutMs) {
      await delay(pollingIntervalMs);
      const quote = await readQuoteStatus();

      if (!quote) {
        continue;
      }

      if (quote.ezDocError) {
        router.refresh();
        setState("error");
        setMessage(`שגיאה בהפקת EasyCount: ${quote.ezDocError}`);
        return;
      }

      if (isUsableUrl(quote.ezDocUrl) || quote.ezDocNumber) {
        const parts = [
          quote.ezDocNumber ? `מספר מסמך ${quote.ezDocNumber}` : null,
          quote.ezDocStatus ? `סטטוס: ${quote.ezDocStatus}` : null,
        ].filter(Boolean);
        router.refresh();
        setState("success");
        setMessage(
          parts.length > 0
            ? `הצעת המחיר הופקה. ${parts.join(" · ")}`
            : "הצעת המחיר הופקה והנתונים עודכנו.",
        );
        return;
      }
    }

    router.refresh();
    setState("success");
    setMessage(
      "המסמך נשלח להפקה, אך הקישור עדיין לא חזר מאיזיקאונט. לחץ ריענון נתונים.",
    );
  }

  if (hasEasyCountDocument) {
    return (
      <div className="quote-action">
        <span className="quote-action__message">
          {[
            "כבר הופקה הצעת מחיר",
            ezDocNumber ? `מספר ${ezDocNumber}` : null,
            ezDocStatus ? `סטטוס: ${ezDocStatus}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
    );
  }

  async function handleClick() {
    if (!trimmedRecordId) {
      setState("error");
      setMessage("חסרים פרטי הצעת המחיר.");
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

      setMessage("הבקשה נשלחה להפקת הצעת המחיר. ממתין לעדכון EasyCount...");
      await pollForEasyCountResult();
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
        <span className="quote-action__message">
          נדרשים פריטים בהצעה לפני הפקה
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
      {ezDocError && state !== "error" ? (
        <span className="quote-action__message quote-action__message--error">
          שגיאת EasyCount: {ezDocError}
        </span>
      ) : null}
    </div>
  );
}
