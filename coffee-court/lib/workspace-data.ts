import type { State } from "./domain";
import { defaultPopupCampaign, popupCampaignSchema } from "./popup-campaign.ts";
export type DataKind =
  | "products"
  | "inventory"
  | "orders"
  | "bookings"
  | "payments"
  | "expenses"
  | "partners"
  | "campaigns"
  | "messages"
  | "settings";
export const kindLabels: Record<DataKind, string> = {
  products: "Menu & products",
  inventory: "Stock movements",
  orders: "Orders / counter bills",
  bookings: "Court bookings",
  payments: "Counter payment collections",
  expenses: "Expenses",
  partners: "Partner share allocations",
  campaigns: "Ribbon & popup campaigns",
  messages: "Inbox replies",
  settings: "Business / website settings",
};
export function pageData(view: string, data: State) {
  const docs = (type: string) =>
    data.documents
      .filter((d) => d.type === type)
      .map((d) => ({ id: d.id, ...d.data }));
  const map: Record<string, { kind: DataKind; rows: Record<string, any>[] }> = {
    overview: { kind: "orders", rows: data.orders },
    orders: { kind: "orders", rows: data.orders },
    kitchen: {
      kind: "orders",
      rows: data.orders.filter((o) =>
        ["Received", "Preparing", "Ready"].includes(o.status),
      ),
    },
    pos: {
      kind: "products",
      rows: data.products.filter((p) => p.active && p.showOnPos !== 0),
    },
    courts: { kind: "bookings", rows: data.bookings },
    inventory: { kind: "inventory", rows: data.inventory },
    products: { kind: "products", rows: data.products.filter((p) => p.active) },
    payments: { kind: "payments", rows: data.payments },
    accounting: { kind: "expenses", rows: data.expenses },
    partners: {
      kind: "partners",
      rows: (data.settings.business?.partnerShares || []).map(
        (share: number, index: number) => ({
          partner: index + 1,
          share_percent: share,
        }),
      ),
    },
    campaigns: {
      kind: "campaigns",
      rows: [...docs("heroCampaign"), ...docs("popupCampaign")],
    },
    website: { kind: "settings", rows: [data.settings.business || {}] },
    whatsapp: {
      kind: "messages",
      rows: data.notificationLogs || docs("message"),
    },
    reports: { kind: "orders", rows: data.orders },
    settings: { kind: "settings", rows: [data.settings.business || {}] },
  };
  return map[view] || map.overview;
}
export function csvText(rows: Record<string, any>[]) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const quote = (value: any) => {
    let raw =
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value ?? "");
    if (typeof value === "string" && /^[=+@\-\t\r]/.test(raw)) raw = "'" + raw;
    return '"' + raw.replaceAll('"', '""') + '"';
  };
  return (
    "\ufeff" +
    [
      keys.map(quote).join(","),
      ...rows.map((row) => keys.map((key) => quote(row[key])).join(",")),
    ].join("\r\n")
  );
}
export function parseCSV(text: string): Record<string, string>[] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell.length || closed)
        throw new Error(
          "Unexpected quote in CSV. Use the downloaded template.",
        );
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) records.push(row);
      row = [];
      cell = "";
      closed = false;
    } else {
      if (closed && c.trim())
        throw new Error("Unexpected text after a quoted CSV cell.");
      if (!closed) cell += c;
    }
  }
  if (quoted) throw new Error("The CSV has an unclosed quote.");
  if (cell || row.length) {
    row.push(cell);
    if (row.some((v) => v.trim())) records.push(row);
  }
  const headers = records.shift()?.map((h) => h.trim()) || [];
  if (!headers.length) throw new Error("The file is empty.");
  if (
    new Set(headers).size !== headers.length ||
    headers.some(
      (h) => !h || ["__proto__", "constructor", "prototype"].includes(h),
    )
  )
    throw new Error("CSV column names must be unique and non-empty.");
  return records.map((values, index) => {
    if (values.length !== headers.length)
      throw new Error(
        `Row ${index + 2} has ${values.length} values; expected ${headers.length}.`,
      );
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}
export function readImport(
  text: string,
  json: boolean,
): { kind?: DataKind; rows: Record<string, any>[] } {
  let value: any = json
    ? JSON.parse(text.replace(/^\uFEFF/, ""))
    : parseCSV(text);
  const kind = !Array.isArray(value) ? value.kind : undefined;
  const rows = Array.isArray(value)
    ? value
    : Array.isArray(value.rows)
      ? value.rows
      : [value];
  if (!rows.length) throw new Error("There are no records in this file.");
  if (rows.length > 100) throw new Error("Import up to 100 rows at a time.");
  if (rows.some((r: any) => !r || typeof r !== "object" || Array.isArray(r)))
    throw new Error("Every row must be an object.");
  return { kind, rows };
}
const jsonCell = (value: any, fallback: any) =>
  typeof value === "string"
    ? value.trim()
      ? JSON.parse(value)
      : fallback
    : (value ?? fallback);
const flag = (value: any, defaultValue = true) =>
  value === undefined || value === ""
    ? defaultValue
    : [true, 1, "1", "true", "yes", "Yes"].includes(value);
const required = (value: any, label: string) => {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
};
function integer(value: any, label: string) {
  const n = Number(value);
  if (!Number.isSafeInteger(n))
    throw new Error(`${label} must be a whole number.`);
  return n;
}
export function rupeesToPaise(value: any) {
  const raw = String(value ?? "")
    .trim()
    .replace(/^₹\s*/, "")
    .replaceAll(",", "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw))
    throw new Error("Enter rupee amounts with up to two decimal places.");
  const [whole, fraction = ""] = raw.split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new Error("Amount must be positive.");
  return n;
}
function amount(row: Record<string, any>, prefix: string) {
  if (row[prefix + "_rupees"] !== undefined && row[prefix + "_rupees"] !== "")
    return rupeesToPaise(row[prefix + "_rupees"]);
  return integer(row[prefix + "_paise"] ?? row[prefix], prefix + " paise");
}
export type ImportAction = {
  action: string;
  values: Record<string, any>;
  summary: string;
  row: number;
  skip?: boolean;
};
export function planImport(
  kind: DataKind,
  rows: Record<string, any>[],
  data: State,
): ImportAction[] {
  const plans: ImportAction[] = [];
  if (kind === "settings") {
    if (rows.length !== 1)
      throw new Error("Settings imports contain one configuration object.");
    const row = rows[0];
    const value = { ...data.settings.business, ...row };
    for (const field of ["courts", "partnerShares"])
      value[field] = jsonCell(row[field], data.settings.business[field]);
    for (const field of [
      "slotCapacity",
      "prepMinutes",
      "taxRate",
      "receiptWidth",
    ])
      if (row[field] !== undefined) value[field] = Number(row[field]);
    if (row.paused !== undefined) value.paused = flag(row.paused, false);
    return [
      {
        action: "settings",
        values: { value },
        summary: "Update business / website settings",
        row: 1,
      },
    ];
  }
  if (kind === "partners") {
    if (rows.length !== 3)
      throw new Error("Supply one row for each of the three partners.");
    const shares = [0, 0, 0];
    const seen = new Set<number>();
    rows.forEach((r) => {
      const n = integer(r.partner, "Partner");
      if (n < 1 || n > 3 || seen.has(n))
        throw new Error("Partners must be uniquely numbered 1, 2 and 3.");
      seen.add(n);
      const share = Number(r.share_percent);
      if (!Number.isFinite(share) || share < 0 || share > 100)
        throw new Error("Each share must be from 0 to 100.");
      shares[n - 1] = share;
    });
    if (shares.reduce((a, b) => a + b, 0) !== 100)
      throw new Error("Partner shares must total 100%.");
    return [
      {
        action: "settings",
        values: { value: { ...data.settings.business, partnerShares: shares } },
        summary: `Set partner shares to ${shares.join("% / ")}%`,
        row: 1,
      },
    ];
  }
  rows.forEach((row, index) => {
    const n = index + 1;
    try {
      if (kind === "products") {
        const p = data.products.find((p) => p.id === row.id);
        if (!p && !row.category)
          throw new Error(
            "New products need id, name, category and price_rupees or variants.",
          );
        const variants = jsonCell(
          row.variants,
          p?.variants || [
            {
              label: "Standard",
              price: p?.price || (row.variants ? 0 : amount(row, "price")),
            },
          ],
        );
        if (
          !Array.isArray(variants) ||
          !variants.length ||
          variants.some(
            (v: any) =>
              !v.label || !Number.isSafeInteger(v.price) || v.price <= 0,
          )
        )
          throw new Error(
            "Each menu option needs a name and positive integer paise price.",
          );
        if (row.price_rupees !== undefined || row.price_paise !== undefined)
          variants[0] = { ...variants[0], price: amount(row, "price") };
        const ingredients =
          row.ingredients !== undefined
            ? jsonCell(row.ingredients, [])
            : undefined;
        if (
          ingredients !== undefined &&
          (!Array.isArray(ingredients) ||
            ingredients.length > 30 ||
            ingredients.some(
              (name: any) =>
                typeof name !== "string" ||
                !name.trim() ||
                name.trim().length > 100,
            ))
        )
          throw new Error(
            "Ingredients must be a JSON list of up to 30 names, each 1–100 characters.",
          );
        plans.push({
          action: "product",
          values: {
            id: required(row.id, "Product ID"),
            name: required(row.name || p?.name, "Product name"),
            category: row.category || p?.category,
            description:
              row.description ||
              p?.description ||
              "Prepared fresh at Lost Origin.",
            image: row.image || p?.image || "latte",
            diet: row.diet || p?.diet || "veg",
            section: row.section || p?.section || "Drinks",
            price: variants[0].price,
            variants,
            recipe: jsonCell(row.recipe, p?.recipe || {}),
            ...(ingredients !== undefined ? { ingredients } : {}),
            active: flag(row.active, p ? !!p.active : true) ? 1 : 0,
            showOnPos: flag(
              row.showOnPos ?? row.show_on_pos,
              p?.showOnPos !== 0,
            )
              ? 1
              : 0,
            showOnWebsite: flag(
              row.showOnWebsite ?? row.show_on_website,
              p?.showOnWebsite !== 0,
            )
              ? 1
              : 0,
          },
          summary: `${p ? "Update" : "Create"} ${row.name || p?.name}`,
          row: n,
        });
      } else if (kind === "inventory") {
        const id = required(row.id || row.item_id, "Inventory item ID");
        const item = data.inventory.find((i) => i.id === id);
        if (!item) {
          plans.push({
            action: "inventoryItem",
            values: {
              id,
              name: required(row.name, "Item name"),
              unit: required(row.unit, "Unit"),
              quantity: integer(row.quantity || 0, "Opening quantity"),
              reorder: integer(row.reorder || 0, "Reorder quantity"),
              cost: amount(row, "cost"),
            },
            summary: `Create inventory item ${row.name}`,
            row: n,
          });
          return;
        }
        const absolute = row.delta === undefined || row.delta === "";
        const target = absolute
          ? integer(row.quantity, "Counted quantity")
          : undefined;
        const delta = absolute
          ? target! - item.quantity
          : integer(row.delta, "Movement quantity");
        const reason = absolute
          ? "Physical count"
          : String(row.reason || "Purchase");
        if (!["Purchase", "Wastage", "Physical count"].includes(reason))
          throw new Error(
            "Reason must be Purchase, Wastage or Physical count.",
          );
        if (
          (!absolute && delta === 0) ||
          (reason === "Purchase" && delta < 0) ||
          (reason === "Wastage" && delta > 0) ||
          item.quantity + delta < 0
        )
          throw new Error(
            "The movement has an invalid sign or would make stock negative.",
          );
        plans.push({
          action: "stock",
          values: {
            id,
            ...(absolute ? { targetQuantity: target } : { quantity: delta }),
            reason,
          },
          skip: absolute && delta === 0,
          summary: `${item.name}: ${delta > 0 ? "+" : ""}${delta} ${item.unit} · ${reason}`,
          row: n,
        });
      } else if (kind === "orders") {
        let items = jsonCell(row.items, null);
        if (!items) {
          const p = data.products.find((p) => p.id === row.product_id);
          if (!p)
            throw new Error("A valid product_id or items JSON is required.");
          items = [
            {
              id: p.id,
              variant: row.variant || p.variants?.[0]?.label || "Standard",
              quantity: integer(row.quantity || 1, "Quantity"),
            },
          ];
        }
        if (!Array.isArray(items) || !items.length)
          throw new Error("Items must be a non-empty JSON array.");
        const values = {
          customer:
            row.source === "Online"
              ? required(row.customer, "Customer")
              : row.customer || "Walk-in customer",
          phone:
            row.source === "Online"
              ? required(row.phone, "Mobile")
              : row.phone || "",
          source: row.source || "Counter",
          paymentMode: row.payment_mode || row.paymentMode || "Cash",
          ...(row.source === "Online"
            ? {
                pickupAt: required(
                  row.pickup_at || row.pickupAt,
                  "Pickup ISO date/time",
                ),
              }
            : {}),
          items,
          notes: row.notes || "",
          coupon: row.coupon || "",
        };
        plans.push({
          action: "order",
          values,
          skip: !!row.id && data.orders.some((o) => o.id === row.id),
          summary: `New ${values.source} order for ${values.customer}`,
          row: n,
        });
      } else if (kind === "bookings") {
        const court = required(row.court, "Court");
        if (
          !data.settings.business.courts.some(
            (c: any) => c.name === court && c.active,
          )
        )
          throw new Error("Choose an active court.");
        let start = row.start;
        if (typeof start === "string" && start.includes(":")) {
          const [h, m] = start.split(":").map(Number);
          start = h * 60 + m;
        }
        const values = {
          customer: required(row.customer, "Customer"),
          phone: required(row.phone, "Mobile"),
          court,
          date: required(row.date, "Date"),
          start: integer(start, "Start minutes"),
          duration: integer(row.duration || 60, "Duration"),
          players: integer(row.players || 4, "Players"),
          equipment: flag(row.equipment, false),
        };
        plans.push({
          action: "booking",
          values,
          skip: !!row.id && data.bookings.some((b) => b.id === row.id),
          summary: `${court} · ${values.date} · ${values.customer}`,
          row: n,
        });
      } else if (kind === "payments") {
        const id = required(row.order_id || row.reference, "Order ID");
        const order = data.orders.find((o) => o.id === id);
        if (!order || order.status === "Cancelled")
          throw new Error("A current order ID is required.");
        const mode = row.mode || "Cash";
        if (!["Cash", "UPI", "Card"].includes(mode))
          throw new Error("Mode must be Cash, UPI or Card.");
        plans.push({
          action: "collectPayment",
          values: { id, mode },
          summary: `Collect ${mode} for ${id}`,
          row: n,
          skip: order.paymentStatus !== "Pending",
        });
      } else if (kind === "expenses") {
        const values = {
          description: required(row.description, "Description"),
          category: row.category || "Other",
          amount: amount(row, "amount"),
        };
        if (values.amount > 5000000)
          throw new Error("Expenses above ₹50,000 require partner approval.");
        plans.push({
          action: "expense",
          values,
          skip: !!row.id && data.expenses.some((e) => e.id === row.id),
          summary: `${values.description} · ₹${(values.amount / 100).toFixed(2)}`,
          row: n,
        });
      } else if (kind === "campaigns") {
        if (row.id === "popup-campaign") {
          const value = popupCampaignSchema.parse({
            ...defaultPopupCampaign,
            ...row,
            enabled: flag(row.enabled, false),
            registrationEnabled: flag(row.registrationEnabled, true),
            delaySeconds: integer(row.delaySeconds ?? 2, "Popup delay"),
            pages: jsonCell(row.pages, defaultPopupCampaign.pages),
            fields: jsonCell(row.fields, defaultPopupCampaign.fields),
          });
          plans.push({
            action: "popupCampaign",
            values: { value },
            summary: `Update popup · ${value.title}`,
            row: n,
          });
          return;
        }
        if (row.id === "hero-announcement") {
          const text = required(row.text, "Campaign message");
          if (text.length > 300)
            throw new Error("Campaign message must be at most 300 characters.");
          const speed = integer(row.speed || 30, "Animation speed");
          if (speed < 15 || speed > 90)
            throw new Error("Animation speed must be 15–90 seconds.");
          plans.push({
            action: "heroCampaign",
            values: { text, enabled: flag(row.enabled), speed },
            summary: "Update homepage announcement",
            row: n,
          });
          return;
        }
        const item = data.documents.find(
          (d) => d.type === "campaign" && d.id === row.id,
        );
        if (!item) throw new Error("Supply an existing campaign ID.");
        plans.push({
          action: "campaign",
          values: { id: row.id, active: flag(row.active) },
          summary: `${flag(row.active) ? "Activate" : "Pause"} ${item.data.name}`,
          row: n,
        });
      } else if (kind === "messages") {
        if (
          !data.documents.some((d) => d.type === "message" && d.id === row.id)
        )
          throw new Error("Supply an existing conversation ID.");
        plans.push({
          action: "reply",
          values: { id: row.id, reply: required(row.reply, "Reply") },
          summary: `Save inbox reply for ${row.id} (not sent externally)`,
          row: n,
        });
      }
    } catch (error: any) {
      throw new Error(`Row ${n}: ${error.message}`);
    }
  });
  return plans;
}
export function importTemplate(kind: DataKind, data: State) {
  const product = data.products.find((p) => p.active)!;
  const court = data.settings.business.courts[0];
  const templates: Record<DataKind, Record<string, any>[]> = {
    products: [
      {
        id: product?.id || "espresso",
        name: product?.name || "Espresso",
        category: product?.category || "Espresso",
        section: product?.section || "Drinks",
        diet: product?.diet || "veg",
        recipe: product?.recipe || {},
        variants: product?.variants || [],
        active: 1,
      },
    ],
    inventory: [
      { id: data.inventory[0]?.id || "beans", delta: 100, reason: "Purchase" },
    ],
    orders: [
      {
        customer: "Customer name",
        phone: "9876543210",
        product_id: product?.id || "espresso",
        variant: product?.variants?.[0]?.label || "Standard",
        quantity: 1,
        source: "Counter",
        payment_mode: "Cash",
      },
    ],
    bookings: [
      {
        customer: "Player name",
        phone: "9876543210",
        court: court.name,
        date: "YYYY-MM-DD",
        start: "10:00",
        duration: 60,
        players: 4,
        equipment: false,
      },
    ],
    payments: [{ order_id: "LO-ORDER-ID", mode: "Cash" }],
    expenses: [
      {
        description: "Business expense",
        category: "Supplies",
        amount_rupees: "100.00",
      },
    ],
    partners: (data.settings.business.partnerShares || [34, 33, 33]).map(
      (share: number, i: number) => ({ partner: i + 1, share_percent: share }),
    ),
    campaigns: [{ id: "popup-campaign", ...defaultPopupCampaign }],
    messages: [
      {
        id: data.documents.find((d) => d.type === "message")?.id || "msg-one",
        reply: "Your reply",
      },
    ],
    settings: [data.settings.business],
  };
  return templates[kind];
}
export async function stableRequestKey(seed: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)),
  );
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes.slice(0, 16)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
