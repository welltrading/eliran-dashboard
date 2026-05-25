"use client";

import { useState } from "react";
import type { OrderType, PaymentStage } from "@/lib/types";

type CreateInvoiceButtonProps = {
  recordId: string;
  orderType: OrderType;
  paymentStage: PaymentStage;
  existingDocumentId?: string | null;
  existingDocumentUrl?: string | null;
  createLabel: string;
  loadingLabel: string;
  existingLabel: string;
};

type RequestState = "idle" | "loading" | "success" | "error";

export function CreateInvoiceButton({
  recordId,
  orderType,
  paymentStage,
  existingDocumentId,
  existingDocumentUrl,
  createLabel,
  loadingLabel,
  existingLabel,
}: CreateInvoiceButtonProps) {
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const trimmedRecordId = recordId.trim();

  if (existingDocumentUrl || existingDocumentId) {
    return (
      <div className="quote-action">
        {existingDocumentUrl ? (
          <a href={existingDocumentUrl} target="_blank" rel="noreferrer">
            פתיחה
          </a>
        ) : null}
        {existingLabel ? (
          <span className="quote-action__message">{existingLabel}</span>
        ) : null}
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
          payment_stage: paymentStage,
          invoice_stage: paymentStage,
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
        {state === "loading" ? loadingLabel : createLabel}
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
