"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshDataButton() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <button
      className="refresh-button"
      type="button"
      onClick={() => startRefresh(() => router.refresh())}
      disabled={isRefreshing}
    >
      {isRefreshing ? "מרענן..." : "רענון נתונים"}
    </button>
  );
}
