import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const products = sqliteTable("products", {
  variants: text("variants", { mode: "json" }).notNull().default([]),
  diet: text("diet").notNull().default("veg"),
  section: text("section").notNull().default("Drinks"),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  active: integer("active").notNull().default(1),
  showOnPos: integer("show_on_pos").notNull().default(1),
  showOnWebsite: integer("show_on_website").notNull().default(1),
  recipe: text("recipe", { mode: "json" }).notNull(),
});
export const inventory = sqliteTable(
  "inventory",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    quantity: integer("quantity").notNull(),
    reorder: integer("reorder").notNull(),
    cost: integer("cost").notNull(),
  },
  (t) => [check("nonnegative_stock", sql`${t.quantity} >= 0`)],
);
export const orders = sqliteTable("orders", {
  email: text("email").notNull().default(""),
  marketingOptIn: integer("marketing_opt_in").notNull().default(0),
  timeline: text("timeline", { mode: "json" }).notNull().default([]),
  version: integer("version").notNull().default(0),
  id: text("id").primaryKey(),
  customer: text("customer").notNull(),
  phone: text("phone").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  paymentMode: text("payment_mode").notNull(),
  paymentStatus: text("payment_status").notNull(),
  total: integer("total").notNull(),
  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").notNull(),
  discount: integer("discount").notNull().default(0),
  items: text("items", { mode: "json" }).notNull(),
  pickupAt: text("pickup_at").notNull(),
  createdAt: text("created_at").notNull(),
  requestKey: text("request_key").notNull().unique(),
  notes: text("notes").notNull().default(""),
});
export const bookings = sqliteTable("bookings", {
  email: text("email").notNull().default(""),
  marketingOptIn: integer("marketing_opt_in").notNull().default(0),
  source: text("source").notNull().default("Legacy"),
  pricing: text("pricing", { mode: "json" }).notNull().default({}),
  checkedInAt: text("checked_in_at"),
  completedAt: text("completed_at"),
  refund: integer("refund").notNull().default(0),
  cancellationReason: text("cancellation_reason").notNull().default(""),
  version: integer("version").notNull().default(0),
  id: text("id").primaryKey(),
  customer: text("customer").notNull(),
  phone: text("phone").notNull(),
  court: text("court").notNull(),
  date: text("date").notNull(),
  start: integer("start").notNull(),
  duration: integer("duration").notNull(),
  players: integer("players").notNull(),
  equipment: integer("equipment").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  requestKey: text("request_key").notNull().unique(),
});
export const bookingSlots = sqliteTable(
  "booking_slots",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id").notNull(),
    court: text("court").notNull(),
    date: text("date").notNull(),
    slot: integer("slot").notNull(),
  },
  (t) => [uniqueIndex("court_date_slot").on(t.court, t.date, t.slot)],
);
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull(),
  source: text("source").notNull(),
  mode: text("mode").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});
export const journals = sqliteTable("journals", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull(),
  description: text("description").notNull(),
  lines: text("lines", { mode: "json" }).notNull(),
  createdAt: text("created_at").notNull(),
});
export const stockLedger = sqliteTable("stock_ledger", {
  id: text("id").primaryKey(),
  item: text("item").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  reference: text("reference").notNull(),
  createdAt: text("created_at").notNull(),
});
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull(),
});
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  data: text("data", { mode: "json" }).notNull(),
});
export const campaignRegistrations = sqliteTable("campaign_registrations", {
  marketingOptIn: integer("marketing_opt_in").notNull().default(0),
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  campaignTitle: text("campaign_title").notNull(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  answers: text("answers", { mode: "json" }).notNull(),
  fieldLabels: text("field_labels", { mode: "json" }).notNull(),
  status: text("status").notNull().default("New"),
  requestKey: text("request_key").notNull().unique(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
});
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
});
export const operationGuards = sqliteTable(
  "operation_guards",
  {
    id: text("id").primaryKey(),
    verified: integer("verified").notNull(),
  },
  (t) => [check("unchanged_record", sql`${t.verified} = 1`)],
);
export const realtimeClock = sqliteTable("realtime_clock", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(0),
});
export const authAdmins = sqliteTable("auth_admins", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  version: text("version").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
export const authCustomers = sqliteTable("auth_customers", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});
export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  subject: text("subject").notNull(),
  csrf: text("csrf").notNull(),
  version: text("version").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  lastSeen: integer("last_seen").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
export const authLimits = sqliteTable("auth_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: integer("window_start").notNull(),
});
export const authChallenges = sqliteTable("auth_challenges", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  providerId: text("provider_id").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
  consumed: integer("consumed").notNull().default(0),
});
export const notificationJobs = sqliteTable("notification_jobs", {
  id: text("id").primaryKey(),
  channel: text("channel").notNull(),
  reference: text("reference").notNull(),
  recipient: text("recipient").notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  status: text("status").notNull().default("Pending"),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
