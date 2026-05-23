"use client";

import { useState } from "react";
import type { OrderType } from "@/lib/types";

type CreateInvoiceButtonProps = {
  recordId: string;
  orderType: OrderType;
  easyCountDocumentUrl?: string | null;
};

type RequestState = "idle" | "loading" | "success" | "error";

export function CreateInvoiceButton({
  recordId,
  orderType,
  easyCountDocumentUrl,
}: CreateInvoiceButtonProps) {
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const trimmedRecordId = recordId.trim();

  if (easyCountDocumentUrl) {
    return (
      <div className="quote-action">
        <a href={easyCountDocumentUrl} target="_blank" rel="noreferrer">
          פתיחת מסמך
        </a>
        <span className="quote-action__message">כבר נוצרה חשבונית מס קבלה</span>
      </div>
    );
  }

  async function handleClick() {
    if (!trimmedRecordId) {
      setState("error");
      setMessage("חסר מזהה רשומה להזמנה.");
      return;
    }

    setState("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/easycount/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_id: trimmedRecordId,
          doc_type: "invoice_receipt",
          order_type: orderType,
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
      setMessage("הבקשה נשלחה לאיזיקאונט. הקישור יתעדכן אחרי ש-Make יסיים.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? `שגיאה בהפקת חשבונית מס קבלה: ${error.message}`
          : "שגיאה בהפקת חשבונית מס קבלה.",
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
        {state === "loading" ? "מפיק חשבונית..." : "הפקת חשבונית מס קבלה"}
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
