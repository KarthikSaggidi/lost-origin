export type Product = {
  stockAvailable?: boolean;
  ingredients?: string[];
  showOnPos?: number;
  showOnWebsite?: number;
  variants?: { label: string; price: number }[];
  diet?: string;
  section?: string;
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  active: number;
  recipe: Record<string, number>;
};
export type Item = {
  variant?: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  milk: string;
  shot: boolean;
};
export type Order = {
  email?: string;
  marketingOptIn?: number;
  emailDelivery?: { status: string; detail?: string };
  timeline?: { status: string; at: string }[];
  id: string;
  customer: string;
  phone: string;
  source: string;
  status: string;
  paymentMode: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  items: Item[];
  pickupAt: string;
  createdAt: string;
  requestKey: string;
  notes: string;
};
export type Booking = {
  email?: string;
  marketingOptIn?: number;
  emailDelivery?: { status: string; detail?: string };
  source?: string;
  pricing?: BookingPricing;
  checkedInAt?: string | null;
  completedAt?: string | null;
  refund?: number;
  cancellationReason?: string;
  id: string;
  customer: string;
  phone: string;
  court: string;
  date: string;
  start: number;
  duration: number;
  players: number;
  equipment: number;
  total: number;
  status: string;
  createdAt: string;
  requestKey: string;
};
export type Stock = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorder: number;
  cost: number;
};
export type Payment = {
  id: string;
  reference: string;
  source: string;
  mode: string;
  amount: number;
  status: string;
  createdAt: string;
};
export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  createdAt: string;
};
export type JournalLine = { account: string; debit: number; credit: number };
export type State = {
  notificationLogs?: {
    id: string;
    channel: string;
    reference: string;
    recipient: string;
    status: string;
    detail: string;
    createdAt: string;
    updatedAt: string;
  }[];
  registrations?: import("./popup-campaign").CampaignRegistration[];
  access?: {
    admin: boolean;
    csrfToken?: string;
    customer?: { id: string; name: string; phone?: string } | null;
    adminEmail?: string;
    otpAvailable?: boolean;
  };
  revision?: number;
  products: Product[];
  inventory: Stock[];
  orders: Order[];
  bookings: Booking[];
  payments: Payment[];
  expenses: Expense[];
  journals: {
    id: string;
    reference: string;
    description: string;
    lines: JournalLine[];
    createdAt: string;
  }[];
  stockLedger: {
    id: string;
    item: string;
    delta: number;
    reason: string;
    reference: string;
    createdAt: string;
  }[];
  documents: { id: string; type: string; data: any }[];
  settings: Record<string, any>;
  auditLogs: {
    id: string;
    action: string;
    detail: string;
    createdAt: string;
  }[];
};
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const todayIST = (date = new Date()) => istDateFormatter.format(date);
export function timeLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function clock(date: string) {
  return new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
}
export const nextStatus: Record<string, string> = {
  Received: "Preparing",
  Preparing: "Ready",
  Ready: "Completed",
};
export function calculate(items: Item[], coupon: string, taxRate = 5) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount =
    coupon.toUpperCase() === "FIRSTBREW"
      ? Math.min(Math.round(subtotal * 0.1), 10000)
      : 0;
  const tax = Math.round(((subtotal - discount) * taxRate) / 100);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}
export type BookingPricing = {
  courtSubtotal?: number;
  equipmentSubtotal?: number;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  total?: number;
};
export function bookingCharges(
  start: number,
  duration: number,
  equipment: boolean,
  date = todayIST(),
  config?: Partial<CourtConfig>,
): BookingPricing & {
  courtSubtotal: number;
  equipmentSubtotal: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
} {
  const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
  let courtSubtotal = 0;
  for (let m = start; m < start + duration; m += 30)
    courtSubtotal +=
      (weekend || m >= (config?.peakStart ?? 1020)
        ? (config?.peakRate ?? 80000)
        : (config?.baseRate ?? 60000)) / 2;
  const equipmentSubtotal = equipment ? (config?.equipmentRate ?? 10000) : 0;
  const subtotal = courtSubtotal + equipmentSubtotal,
    taxRate = config?.taxRate ?? 18,
    tax = Math.round((subtotal * taxRate) / 100);
  return {
    courtSubtotal,
    equipmentSubtotal,
    subtotal,
    tax,
    taxRate,
    total: subtotal + tax,
  };
}
export function quoteBooking(
  start: number,
  duration: number,
  equipment: boolean,
  date = todayIST(),
  config?: Partial<CourtConfig>,
) {
  return bookingCharges(start, duration, equipment, date, config).total;
}
export function productVisible(product: Product, channel: "pos" | "website") {
  return (
    Boolean(product.active) &&
    (channel === "pos" ? product.showOnPos : product.showOnWebsite) !== 0
  );
}
export function isBalanced(lines: JournalLine[]) {
  return (
    lines.length >= 2 &&
    lines.every(
      (l) =>
        Number.isSafeInteger(l.debit) &&
        Number.isSafeInteger(l.credit) &&
        l.debit >= 0 &&
        l.credit >= 0,
    ) &&
    lines.reduce((s, l) => s + l.debit - l.credit, 0) === 0
  );
}
export function available(p: Product, stock: Stock[]) {
  if (typeof p.stockAvailable === "boolean")
    return Boolean(p.active && p.stockAvailable);
  return (
    !!p.active &&
    Object.entries(p.recipe).every(
      ([id, q]) => (stock.find((s) => s.id === id)?.quantity || 0) >= q,
    )
  );
}
export function validBooking(
  start: number,
  duration: number,
  court?: Partial<CourtConfig>,
) {
  return (
    Number.isInteger(start) &&
    start >= (court?.open ?? 360) &&
    start % 30 === 0 &&
    [30, 60, 90, 120].includes(duration) &&
    start + duration <= (court?.close ?? 1320)
  );
}
export type CourtConfig = {
  name: string;
  active: boolean;
  baseRate: number;
  peakRate: number;
  peakStart: number;
  open: number;
  close: number;
  equipmentRate: number;
  taxRate: number;
};
export const defaultCourts: CourtConfig[] = Array.from(
  { length: 4 },
  (_, i) => ({
    name: `Court ${String(i + 1).padStart(2, "0")}`,
    active: true,
    baseRate: 60000,
    peakRate: 80000,
    peakStart: 1020,
    open: 360,
    close: 1320,
    equipmentRate: 10000,
    taxRate: 18,
  }),
);
export function courtConfig(settings: Record<string, any>): CourtConfig[] {
  return settings.business?.courts || defaultCourts;
}
export function productVariants(p: Product) {
  return p.variants?.length
    ? p.variants
    : [{ label: "Standard", price: p.price }];
}
export function variantPrice(p: Product, label?: string) {
  return productVariants(p).find(
    (v) => v.label === (label || productVariants(p)[0].label),
  )?.price;
}
export function priceLabel(p: Product) {
  return productVariants(p)
    .map((v) => money(v.price))
    .join(" / ");
}
export function categories(products: Product[]) {
  return [...new Set(products.filter((p) => p.active).map((p) => p.category))];
}

export function validBookingDate(date: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00+05:30`);
  return (
    Number.isFinite(parsed.getTime()) &&
    todayIST(parsed) === date &&
    date >= todayIST(now) &&
    date <= todayIST(new Date(now.getTime() + 30 * 86400000))
  );
}
export type SlotAvailability = "Available" | "Booked" | "Past" | "Closed";
export function bookingSlotAvailability(
  court: CourtConfig | undefined,
  date: string,
  start: number,
  duration: number,
  bookings: Booking[],
  now = new Date(),
): SlotAvailability {
  if (
    !court?.active ||
    !validBookingDate(date, now) ||
    !validBooking(start, duration, court)
  )
    return "Closed";
  const instant = new Date(
    `${date}T${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}:00+05:30`,
  );
  if (instant.getTime() < now.getTime()) return "Past";
  if (
    bookings.some(
      (b) =>
        b.date === date &&
        b.court === court.name &&
        b.status !== "Cancelled" &&
        b.start < start + duration &&
        b.start + b.duration > start,
    )
  )
    return "Booked";
  return "Available";
}
export function bookingStarts(
  court: CourtConfig | undefined,
  duration: number,
): number[] {
  if (!court || !court.active) return [];
  return Array.from(
    { length: Math.max(0, Math.ceil((court.close - court.open) / 30)) },
    (_, i) => court.open + i * 30,
  ).filter((start) => validBooking(start, duration, court));
}
