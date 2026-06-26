"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOrderInvoiceAction } from "./actions";

type OrderInvoiceTriggerStage = "first" | "final_40";

type CreateInvoiceButtonProps = {
  recordId: string;
  invoiceStage: OrderInvoiceTriggerStage;
  existingDocumentId?: string | null;
  existingDocumentNumber?: string | null;
  existingDocumentUrl?: string | null;
  requested?: boolean;
  createLabel: string;
  loadingLabel: string;
  existingLabel: string;
  pendingLabel: string;
};

type RequestState = "idle" | "loading" | "success" | "error";

export function CreateInvoiceButton({
  recordId,
  invoiceStage,
  existingDocumentId,
  existingDocumentNumber,
  existingDocumentUrl,
  requested = false,
  createLabel,
  loadingLabel,
  existingLabel,
  pendingLabel,
}: CreateInvoiceButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmedRecordId = recordId.trim();

  if (existingDocumentUrl || existingDocumentId || existingDocumentNumber) {
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

  if (requested) {
    return (
      <div className="quote-action">
        <button className="quote-action__button" type="button" disabled>
          {createLabel}
        </button>
        <span className="quote-action__message" role="status">
          {pendingLabel}
        </span>
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

    startTransition(async () => {
      try {
        const result = await requestOrderInvoiceAction({
          orderId: trimmedRecordId,
          invoiceStage,
        });

        if (!result.ok) {
          throw new Error(
            [result.message, ...(result.errors ?? [])].filter(Boolean).join(" "),
          );
        }

        setState("success");
        setMessage("בקשת החשבונית נשלחה לאוטומציית Airtable.");
        router.refresh();
      } catch (error) {
        setState("error");
        setMessage(
          error instanceof Error
            ? `שגיאה בהפקת חשבונית: ${error.message}`
            : "שגיאה בהפקת חשבונית.",
        );
      }
    });
  }

  return (
    <div className="quote-action">
      <button
        className="quote-action__button"
        type="button"
        onClick={handleClick}
        disabled={state === "loading" || isPending}
      >
        {state === "loading" || isPending ? loadingLabel : createLabel}
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
