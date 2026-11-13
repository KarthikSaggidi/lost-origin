import { calculate, type State, type Order } from "./domain";
type QueuedBill = {
  requestKey: string;
  payload: Record<string, any>;
  order: Order;
  error?: string;
};
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("coffee-court-device-v1", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("cache");
      r.result.createObjectStore("outbox", { keyPath: "requestKey" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function request<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const r = run(tx.objectStore(store));
    let value: T;
    r.onsuccess = () => {
      value = r.result;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function cacheCatalogue(state: State, surface = "website") {
  const snapshot = {
    products: state.products,
    inventory: state.inventory,
    settings: state.settings,
    documents: state.documents.filter(
      (d) =>
        d.type === "campaign" ||
        d.type === "heroCampaign" ||
        d.type === "popupCampaign",
    ),
  };
  await request("cache", "readwrite", (s) =>
    s.put(snapshot, `catalogue-auth-${surface}-v2`),
  );
}
export const cachedCatalogue = (surface = "website") =>
  request<Partial<State> | undefined>("cache", "readonly", (s) =>
    s.get(`catalogue-auth-${surface}-v2`),
  );
export const queuedBills = () =>
  request<QueuedBill[]>("outbox", "readonly", (s) => s.getAll());
export const removeQueuedBill = (key: string) =>
  request("outbox", "readwrite", (s) => s.delete(key));
export async function queueBill(payload: Record<string, any>, taxRate: number) {
  if (!["Cash", "UPI"].includes(payload.paymentMode))
    throw new Error("Offline bills support cash or UPI at the counter.");
  const createdAt = new Date().toISOString();
  const order: Order = {
    ...payload,
    id: `TMP-${payload.requestKey.slice(0, 8).toUpperCase()}`,
    status: "Queued offline",
    paymentStatus: "Queued offline",
    createdAt,
    pickupAt: createdAt,
    ...calculate(payload.items, payload.coupon || "", taxRate),
  } as Order;
  await request("outbox", "readwrite", (s) =>
    s.put({
      requestKey: payload.requestKey,
      payload: {
        ...payload,
        offline: true,
        offlineTaxRate: taxRate,
        createdAt,
      },
      order,
    }),
  );
  return order;
}
