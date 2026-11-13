import type { State } from "./domain";
const todayIST = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export type AdminFilters = {
  query: string;
  from: string;
  to: string;
  source: string;
  status: string;
  category: string;
};
export const emptyFilters: AdminFilters = {
  query: "",
  from: "",
  to: "",
  source: "",
  status: "",
  category: "",
};
export function filterNotifications(
  rows: NonNullable<State["notificationLogs"]>,
  filters: AdminFilters,
) {
  const query = filters.query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (!filters.status || row.status === filters.status) &&
      [row.reference, row.recipient, row.channel, row.status, row.detail]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );
}
export const filterViews = [
  "kitchen",
  "payments",
  "accounting",
  "partners",
  "campaigns",
  "whatsapp",
  "reports",
  "settings",
];
export function filterWorkspace(
  data: State,
  view: string,
  f: AdminFilters,
): State {
  if (!filterViews.includes(view)) return data;
  const match = (values: unknown[]) =>
    values.join(" ").toLowerCase().includes(f.query.trim().toLowerCase());
  const dated = (createdAt: string) => {
    const date = todayIST(new Date(createdAt));
    return (!f.from || date >= f.from) && (!f.to || date <= f.to);
  };
  if (view === "kitchen")
    return {
      ...data,
      orders: data.orders.filter(
        (o) =>
          match([o.id, o.customer, o.phone, ...o.items.map((i) => i.name)]) &&
          (!f.source || o.source === f.source),
      ),
    };
  if (view === "payments")
    return {
      ...data,
      payments: data.payments.filter(
        (p) =>
          dated(p.createdAt) &&
          match([p.id, p.reference]) &&
          (!f.source || p.source === f.source),
      ),
    };
  if (view === "accounting" || view === "partners")
    return {
      ...data,
      // Keep full balanced entries when an account/category matches; never trim individual journal lines.
      journals: data.journals.filter(
        (j) =>
          dated(j.createdAt) &&
          match([
            j.reference,
            j.description,
            ...j.lines.map((l) => l.account),
          ]) &&
          (!f.category || j.lines.some((l) => l.account === f.category)),
      ),
      expenses: data.expenses.filter(
        (e) =>
          dated(e.createdAt) &&
          match([e.description, e.category]) &&
          (!f.category || e.category + " expense" === f.category),
      ),
    };
  if (view === "campaigns")
    return {
      ...data,
      documents: data.documents.filter(
        (d) =>
          d.type !== "campaign" ||
          (match([d.data.name, d.data.code, d.data.description]) &&
            (!f.status || Boolean(d.data.active) === (f.status === "Active")) &&
            (!f.category || d.data.channel === f.category)),
      ),
    };
  if (view === "whatsapp")
    return {
      ...data,
      notificationLogs: data.notificationLogs
        ? filterNotifications(data.notificationLogs, f)
        : undefined,
      documents: data.documents.filter(
        (d) =>
          d.type !== "message" ||
          (match([d.data.name, d.data.phone, d.data.message]) &&
            (!f.status || Boolean(d.data.unread) === (f.status === "Unread"))),
      ),
    };
  if (view === "settings")
    return {
      ...data,
      auditLogs: data.auditLogs.filter(
        (a) =>
          dated(a.createdAt) &&
          match([a.action, a.detail]) &&
          (!f.category || a.action === f.category),
      ),
    };
  return {
    ...data,
    orders: data.orders.filter(
      (o) =>
        dated(o.createdAt) &&
        match([o.id, o.customer, o.phone, ...o.items.map((i) => i.name)]) &&
        (!f.source || o.source === f.source) &&
        (!f.status || o.status === f.status),
    ),
    bookings: data.bookings.filter(
      (b) =>
        (!f.from || b.date >= f.from) &&
        (!f.to || b.date <= f.to) &&
        match([b.id, b.customer, b.phone, b.court]) &&
        (!f.source || f.source === "Court") &&
        (!f.status || b.status === f.status),
    ),
    payments: data.payments.filter(
      (p) =>
        dated(p.createdAt) &&
        match([p.id, p.reference]) &&
        (!f.source || p.source === f.source),
    ),
    journals: data.journals.filter(
      (j) =>
        dated(j.createdAt) &&
        match([j.reference, j.description, ...j.lines.map((l) => l.account)]),
    ),
    stockLedger: data.stockLedger.filter(
      (l) =>
        dated(l.createdAt) &&
        match([
          l.reference,
          l.reason,
          data.inventory.find((i) => i.id === l.item)?.name,
        ]),
    ),
    expenses: data.expenses.filter(
      (e) => dated(e.createdAt) && match([e.description, e.category]),
    ),
    auditLogs: data.auditLogs.filter(
      (a) => dated(a.createdAt) && match([a.action, a.detail]),
    ),
  };
}
