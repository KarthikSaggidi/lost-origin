import { z } from "zod";
import type { Item, Product } from "./domain.ts";
import { variantPrice } from "./domain.ts";
export type PosFields = {
  customer: string;
  phone: string;
  notes: string;
  coupon: string;
  paymentMode: "Cash" | "UPI" | "Card";
};
export type CounterPayload = PosFields & {
  source: "Counter";
  requestKey: string;
  items: Item[];
};
export type PosBill = {
  id: string;
  number: number;
  label: string;
  requestKey: string;
  items: Item[];
  fields: PosFields;
  status: "draft" | "submitting" | "uncertain";
  submission?: CounterPayload;
  createdAt: string;
};
export type PosWorkspace = {
  version: 1;
  id: string;
  activeId: string;
  nextNumber: number;
  bills: PosBill[];
};
export const blankPosFields = (): PosFields => ({
  customer: "",
  phone: "",
  notes: "",
  coupon: "",
  paymentMode: "Cash",
});
export const billName = (bill: PosBill) =>
  `Bill ${String(bill.number).padStart(2, "0")}`;
export function newPosBill(number: number): PosBill {
  return {
    id: crypto.randomUUID(),
    number,
    label: "",
    requestKey: crypto.randomUUID(),
    items: [],
    fields: blankPosFields(),
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}
export function newPosWorkspace(): PosWorkspace {
  const bill = newPosBill(1);
  return {
    version: 1,
    id: crypto.randomUUID(),
    activeId: bill.id,
    nextNumber: 2,
    bills: [bill],
  };
}
const itemSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  price: z.number().int().positive().max(1000000),
  quantity: z.number().int().min(1).max(20),
  size: z.string().max(30),
  milk: z.string().max(40),
  shot: z.boolean(),
  variant: z.string().max(40).optional(),
});
const fieldsSchema = z.object({
  customer: z.string().max(80),
  phone: z.string().max(20),
  notes: z.string().max(500),
  coupon: z.string().max(30),
  paymentMode: z.enum(["Cash", "UPI", "Card"]),
});
const submissionSchema = fieldsSchema.extend({
  source: z.literal("Counter"),
  requestKey: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(30),
});
const billSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().positive(),
  label: z.string().max(40),
  requestKey: z.string().uuid(),
  items: z.array(itemSchema).max(30),
  fields: fieldsSchema,
  status: z.enum(["draft", "submitting", "uncertain"]),
  submission: submissionSchema.optional(),
  createdAt: z.string(),
});
export function restorePosWorkspace(raw: unknown): PosWorkspace {
  const value = z
    .object({
      version: z.literal(1),
      id: z.string().uuid(),
      activeId: z.string().uuid(),
      nextNumber: z.number().int().positive(),
      bills: z.array(billSchema).min(1).max(20),
    })
    .parse(raw);
  if (
    new Set(value.bills.map((b) => b.id)).size !== value.bills.length ||
    new Set(value.bills.map((b) => b.requestKey)).size !== value.bills.length
  )
    throw new Error("Duplicate bill references in saved drafts.");
  if (!value.bills.some((b) => b.id === value.activeId))
    value.activeId = value.bills[0].id;
  for (const bill of value.bills) {
    if (bill.status !== "draft") {
      if (!bill.submission || bill.submission.requestKey !== bill.requestKey)
        throw new Error("A saved billing attempt needs review.");
      bill.status = "uncertain";
    }
  }
  value.nextNumber = Math.max(
    value.nextNumber,
    ...value.bills.map((b) => b.number + 1),
  );
  return value;
}
export function posBill(state: PosWorkspace, id: string) {
  const bill = state.bills.find((b) => b.id === id);
  if (!bill) throw new Error("This bill is no longer open.");
  return bill;
}
function edit(
  state: PosWorkspace,
  id: string,
  change: (bill: PosBill) => PosBill,
): PosWorkspace {
  const bill = posBill(state, id);
  if (bill.status !== "draft")
    throw new Error(
      "This bill is locked until its billing attempt is resolved. Use another bill meanwhile.",
    );
  return {
    ...state,
    bills: state.bills.map((b) => (b.id === id ? change(b) : b)),
  };
}
export function sameItem(a: Item, b: Item) {
  return (
    a.id === b.id &&
    a.variant === b.variant &&
    a.size === b.size &&
    a.milk === b.milk &&
    a.shot === b.shot
  );
}
export function mergePosItems(current: Item[], incoming: Item[]) {
  const items = current.map((i) => ({ ...i }));
  for (const item of incoming) {
    itemSchema.parse(item);
    const found = items.find((i) => sameItem(i, item));
    if (found) {
      if (found.quantity + item.quantity > 20)
        throw new Error(`Maximum 20 of ${item.name} per bill.`);
      found.quantity += item.quantity;
    } else {
      if (items.length >= 30)
        throw new Error("Maximum 30 item lines per bill.");
      items.push({ ...item });
    }
  }
  return items;
}
export function addPosItems(state: PosWorkspace, id: string, items: Item[]) {
  return edit(state, id, (b) => ({
    ...b,
    items: mergePosItems(b.items, items),
  }));
}
export function changePosFields(
  state: PosWorkspace,
  id: string,
  patch: Partial<PosFields>,
) {
  return edit(state, id, (b) => ({
    ...b,
    fields: fieldsSchema.parse({ ...b.fields, ...patch }),
  }));
}
export function renamePosBill(state: PosWorkspace, id: string, label: string) {
  return edit(state, id, (b) => ({ ...b, label: label.slice(0, 40) }));
}
export function adjustPosItem(
  state: PosWorkspace,
  id: string,
  index: number,
  delta: number,
) {
  return edit(state, id, (b) => {
    const item = b.items[index];
    if (!item) return b;
    const quantity = item.quantity + delta;
    if (quantity > 20) throw new Error("Maximum 20 of one item per bill.");
    return {
      ...b,
      items: b.items.flatMap((line, n) =>
        n === index ? (quantity > 0 ? [{ ...line, quantity }] : []) : [line],
      ),
    };
  });
}
export function addPosBill(state: PosWorkspace) {
  if (state.bills.length >= 20)
    throw new Error(
      "Finish or close a bill before opening more than 20 bills.",
    );
  const bill = newPosBill(state.nextNumber);
  return {
    ...state,
    activeId: bill.id,
    nextNumber: state.nextNumber + 1,
    bills: [...state.bills, bill],
  };
}
export function selectPosBill(state: PosWorkspace, id: string) {
  posBill(state, id);
  return { ...state, activeId: id };
}
export function clearPosBill(state: PosWorkspace, id: string) {
  return edit(state, id, (b) => ({
    ...b,
    items: [],
    fields: blankPosFields(),
    requestKey: crypto.randomUUID(),
    submission: undefined,
  }));
}
export function closePosBill(state: PosWorkspace, id: string) {
  const bill = posBill(state, id);
  if (
    bill.status !== "draft" ||
    bill.items.length ||
    bill.fields.customer ||
    bill.fields.phone ||
    bill.fields.notes
  )
    throw new Error(
      "Clear this draft before closing it. Pending billing attempts must be resolved.",
    );
  return finishPosBill(state, id);
}
export function finishPosBill(state: PosWorkspace, id: string) {
  if (!state.bills.some((b) => b.id === id)) return state;
  const bills = state.bills.filter((b) => b.id !== id);
  if (!bills.length) {
    const bill = newPosBill(state.nextNumber);
    return {
      ...state,
      bills: [bill],
      activeId: bill.id,
      nextNumber: state.nextNumber + 1,
    };
  }
  return {
    ...state,
    bills,
    activeId: state.activeId === id ? bills[0].id : state.activeId,
  };
}
export function beginPosBilling(
  state: PosWorkspace,
  id: string,
): { state: PosWorkspace; payload: CounterPayload; recover: boolean } {
  const bill = posBill(state, id);
  if (bill.status === "submitting")
    throw new Error("This bill is already being submitted.");
  if (!bill.items.length) throw new Error("Add an item before billing.");
  const recover = Boolean(bill.submission),
    payload =
      bill.submission ||
      submissionSchema.parse({
        ...bill.fields,
        source: "Counter",
        requestKey: bill.requestKey,
        items: bill.items.map((item) => ({ ...item })),
        customer: bill.fields.customer || "Walk-in customer",
      });
  return {
    payload,
    recover,
    state: {
      ...state,
      bills: state.bills.map((b) =>
        b.id === id ? { ...b, status: "submitting", submission: payload } : b,
      ),
    },
  };
}
export function failPosBilling(
  state: PosWorkspace,
  id: string,
  definitive = false,
) {
  return {
    ...state,
    bills: state.bills.map((b) =>
      b.id === id
        ? {
            ...b,
            status: definitive ? ("draft" as const) : ("uncertain" as const),
            submission: definitive ? undefined : b.submission,
          }
        : b,
    ),
  };
}
export function repricePosBills(state: PosWorkspace, products: Product[]) {
  let changed = false;
  const bills = state.bills.map((b) => {
    if (b.status !== "draft") return b;
    const items = b.items.map((item) => {
      const p = products.find((p) => p.id === item.id),
        price = p && variantPrice(p, item.variant);
      if (price && price !== item.price) {
        changed = true;
        return { ...item, price };
      }
      return item;
    });
    return { ...b, items };
  });
  return changed ? { ...state, bills } : state;
}
