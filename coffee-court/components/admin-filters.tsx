"use client";
import { Search, SlidersHorizontal, RotateCcw } from "lucide-react";
import { emptyFilters, type AdminFilters } from "../lib/admin-filters";
import { todayIST, type State } from "../lib/domain";
export default function WorkspaceFilters({
  data,
  view,
  value,
  update,
}: {
  data: State;
  view: string;
  value: AdminFilters;
  update: (value: AdminFilters) => void;
}) {
  const set = (key: keyof AdminFilters, next: string) =>
    update({ ...value, [key]: next });
  const dates = [
    "payments",
    "accounting",
    "partners",
    "reports",
    "settings",
  ].includes(view);
  const search = !["partners", "payments"].includes(view); // Payments already has reference search beside its mode/status filters.
  const categories =
    view === "campaigns"
      ? [
          ...new Set(
            data.documents
              .filter((d) => d.type === "campaign")
              .map((d) => d.data.channel),
          ),
        ]
      : view === "settings"
        ? [...new Set(data.auditLogs.map((a) => a.action))]
        : view === "accounting"
          ? [
              ...new Set(
                data.journals.flatMap((j) => j.lines.map((l) => l.account)),
              ),
            ]
          : [];
  const categoryLabel =
    view === "campaigns"
      ? "Channel"
      : view === "settings"
        ? "Audit action"
        : "Account";
  const source = ["kitchen", "payments", "reports"].includes(view);
  const statuses =
    view === "campaigns"
      ? ["Active", "Paused"]
      : view === "whatsapp"
        ? [
            "Pending",
            "Waiting for SMTP",
            "Waiting for WhatsApp",
            "Queued",
            "Sending",
            "Sent",
            "Failed",
            "Unknown",
          ]
        : view === "reports"
          ? [
              "Received",
              "Preparing",
              "Ready",
              "Completed",
              "Confirmed",
              "Checked in",
              "Cancelled",
            ]
          : [];
  const active = Object.values(value).some(Boolean);
  const preset =
    !value.from && !value.to
      ? "all"
      : value.from === todayIST() && value.to === todayIST()
        ? "today"
        : value.to === todayIST() &&
            value.from === todayIST(new Date(Date.now() - 6 * 86400000))
          ? "7"
          : value.to === todayIST() &&
              value.from === todayIST(new Date(Date.now() - 29 * 86400000))
            ? "30"
            : "custom";
  return (
    <section className="workspace-filter-panel" aria-label={`${view} filters`}>
      <div className="filter-panel-title">
        <SlidersHorizontal size={16} />
        <b>{view === "settings" ? "Audit log filters" : "Filter records"}</b>
        <button
          type="button"
          className="text-btn"
          disabled={!active}
          onClick={() => update({ ...emptyFilters })}
        >
          <RotateCcw size={13} />
          Reset filters
        </button>
      </div>
      <div className="workspace-filter-fields">
        {search && (
          <label className="search-input">
            <Search size={16} />
            <input
              aria-label={`Search ${view}`}
              placeholder={
                view === "kitchen"
                  ? "Order, customer or item…"
                  : view === "settings"
                    ? "Search audit changes…"
                    : "Search records…"
              }
              value={value.query}
              onChange={(e) => set("query", e.target.value)}
            />
          </label>
        )}
        {dates && (
          <>
            <label>
              Period
              <select
                aria-label={`${view} period`}
                value={preset}
                onChange={(e) => {
                  const days =
                    e.target.value === "7"
                      ? 6
                      : e.target.value === "30"
                        ? 29
                        : 0;
                  const from =
                    e.target.value === "all"
                      ? ""
                      : todayIST(new Date(Date.now() - days * 86400000));
                  update({
                    ...value,
                    from,
                    to: e.target.value === "all" ? "" : todayIST(),
                  });
                }}
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="custom" disabled>
                  Custom range
                </option>
              </select>
            </label>
            <label>
              From
              <input
                aria-label={`${view} from date`}
                type="date"
                value={value.from}
                max={value.to || undefined}
                onChange={(e) => set("from", e.target.value)}
              />
            </label>
            <label>
              To
              <input
                aria-label={`${view} to date`}
                type="date"
                value={value.to}
                min={value.from || undefined}
                onChange={(e) => set("to", e.target.value)}
              />
            </label>
          </>
        )}
        {source && (
          <label>
            Source
            <select
              aria-label={`${view} source`}
              value={value.source}
              onChange={(e) => set("source", e.target.value)}
            >
              <option value="">All sources</option>
              <option>Counter</option>
              <option>Online</option>
              {view !== "kitchen" && <option>Court</option>}
            </select>
          </label>
        )}
        {!!statuses.length && (
          <label>
            Status
            <select
              aria-label={`${view} record status`}
              value={value.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        {!!categories.length && (
          <label>
            {categoryLabel}
            <select
              aria-label={`${view} ${categoryLabel.toLowerCase()}`}
              value={value.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">All {categoryLabel.toLowerCase()}s</option>
              {categories.sort().map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {dates && (
        <p className="filter-scope">
          {value.from || "All dates"}
          {value.from || value.to ? ` — ${value.to || "latest"}` : ""} ·{" "}
          {view === "reports"
            ? "Café records use the order date; courts use the play date. Date and search apply to every export; source and status apply to sales registers."
            : view === "settings"
              ? "These filters apply to the audit log tab."
              : "Totals and records follow the selected filters."}
        </p>
      )}
    </section>
  );
}
