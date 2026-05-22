"use client";

import { useMemo, useState } from "react";
import { PhoneText } from "@/components/ui/PhoneText";
import type { Installer } from "@/lib/types";

type PaidFilter = "הכל" | "שולם" | "לא שולם";

type InstallersTableClientProps = {
  installers: Installer[];
  airtableTableUrl: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusTone(value: boolean) {
  return value ? "badge badge--success" : "badge badge--warning";
}

export function InstallersTableClient({
  installers,
  airtableTableUrl,
}: InstallersTableClientProps) {
  const [search, setSearch] = useState("");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("הכל");
  const [capability, setCapability] = useState("הכל");

  const capabilities = useMemo(() => {
    return Array.from(
      new Set(installers.flatMap((installer) => installer.capabilities)),
    ).sort((a, b) => a.localeCompare(b, "he"));
  }, [installers]);

  const filteredInstallers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return installers.filter((installer) => {
      const searchableText = [
        installer.name,
        installer.firstName ?? "",
        installer.phone ?? "",
        installer.mobile ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const searchMatches =
        !normalizedSearch || searchableText.includes(normalizedSearch);
      const paidMatches =
        paidFilter === "הכל" ||
        (paidFilter === "שולם" && installer.paidThisMonth) ||
        (paidFilter === "לא שולם" && !installer.paidThisMonth);
      const capabilityMatches =
        capability === "הכל" || installer.capabilities.includes(capability);

      return searchMatches && paidMatches && capabilityMatches;
    });
  }, [capability, installers, paidFilter, search]);

  return (
    <>
      <div className="filters-bar" aria-label="סינון מתקינים">
        <label className="filter-field filter-field--search">
          <span className="filter-label">חיפוש</span>
          <input
            className="filter-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי שם מתקין או טלפון"
          />
        </label>

        <label className="filter-field">
          <span className="filter-label">שולם החודש</span>
          <select
            className="filter-select"
            value={paidFilter}
            onChange={(event) => setPaidFilter(event.target.value as PaidFilter)}
          >
            <option value="הכל">הכל</option>
            <option value="שולם">שולם</option>
            <option value="לא שולם">לא שולם</option>
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">יכולת</span>
          <select
            className="filter-select"
            value={capability}
            onChange={(event) => setCapability(event.target.value)}
          >
            <option value="הכל">הכל</option>
            {capabilities.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <p className="table-summary">
          מציג {filteredInstallers.length} מתוך {installers.length}
        </p>
      </div>

      <div className="table-wrap">
        {filteredInstallers.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>פעולה</th>
                <th>שם מתקין</th>
                <th>טלפון</th>
                <th>נייד</th>
                <th>יכולות</th>
                <th>שולם החודש</th>
                <th>סכום לתשלום</th>
                <th>משימות פתוחות</th>
                <th>משימות שהושלמו</th>
                <th>אישורים מאושרים</th>
              </tr>
            </thead>
            <tbody>
              {filteredInstallers.map((installer) => (
                <tr key={installer.id}>
                  <td>
                    <a
                      href={`${airtableTableUrl}/${installer.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      פתח מתקין
                    </a>
                  </td>
                  <td>{installer.name || installer.firstName || "-"}</td>
                  <td><PhoneText value={installer.phone} /></td>
                  <td><PhoneText value={installer.mobile} /></td>
                  <td>
                    {installer.capabilities.length > 0
                      ? installer.capabilities.join(", ")
                      : "-"}
                  </td>
                  <td>
                    <span className={statusTone(installer.paidThisMonth)}>
                      {installer.paidThisMonth ? "שולם" : "לא שולם"}
                    </span>
                  </td>
                  <td>{formatCurrency(installer.approvedAmountToPay)}</td>
                  <td>{installer.openTaskCount}</td>
                  <td>{installer.completedTaskCount}</td>
                  <td>{formatCurrency(installer.approvedPaymentAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card__body placeholder">
            <div>
              <h2>אין מתקינים להצגה</h2>
              <p>לא נמצאו מתקינים שתואמים לחיפוש או לסינון הנוכחי.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
