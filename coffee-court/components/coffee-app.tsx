"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Coffee,
  LayoutDashboard,
  ShoppingBag,
  Monitor,
  ChefHat,
  CalendarDays,
  Package,
  BookOpen,
  CreditCard,
  Landmark,
  Users,
  Megaphone,
  Globe,
  MessageCircle,
  ChartNoAxesCombined,
  Settings,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Plus,
  Search,
  Bell,
  ExternalLink,
  Menu as MenuIcon,
  X,
  Check,
  Clock,
  MoreHorizontal,
  Download,
  Filter,
  Leaf,
  Activity,
  Receipt,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Minus,
  MapPin,
  Sun,
  RefreshCw,
  Send,
  Printer,
  Trash2,
  SlidersHorizontal,
  ChevronLeft,
  WifiOff,
  ShoppingCart,
  Heart,
  Mail,
  Info,
  LogOut,
  UserRound,
} from "lucide-react";
import { Modal, Field } from "./shared";
import { WorkspaceTools, PrintPreview } from "./workspace-tools";
import ColorBanner from "./color-banner";
import PaddleIcon from "./paddle-icon";
import HeroEditor from "./hero-editor";
import CafeScene from "./cafe-scene";
import CustomerCourts from "./customer-courts";
import HomeSections from "./home-sections";
import CustomerMenu from "./customer-menu";
import CartBar from "./cart-bar";
import { parseIngredients, productIngredients } from "../lib/product-details";
import AdminCourts from "./admin-courts";
import KitchenBoard from "./kitchen-board";
import OrderTimeline from "./order-timeline";
import CustomerActivity from "./customer-activity";
import SiteFooter from "./site-footer";
import FooterSettings from "./footer-settings";
import CustomerLogin from "./customer-login";
import SecuritySettings from "./security-settings";
import CommunicationsAdmin, { CampaignWhatsApp } from "./communications-admin";
import {
  TransactionConfirmation,
  WhatsAppShare,
  DownloadBill,
} from "./bill-delivery";
import { authFetch, setCsrfToken, logout } from "../lib/client-auth";
import HeroCampaignEditor, { HeroCampaignTicker } from "./hero-campaign";
import PopupCampaignEditor from "./popup-campaign-editor";
import CustomerPopupCampaign from "./popup-campaign";
import { heroCampaign } from "../lib/campaign";
import BlueCourt from "./blue-court";
import WorkspaceFilters from "./admin-filters";
import {
  emptyFilters,
  filterViews,
  filterWorkspace,
  type AdminFilters,
} from "../lib/admin-filters";
import { heroSlides } from "../lib/hero";
import { useScrollLock } from "../lib/scroll-lock";
import { lostOriginMenu } from "../lib/lost-origin-catalogue";
import {
  cacheCatalogue,
  cachedCatalogue,
  queuedBills,
  queueBill,
  removeQueuedBill,
} from "../lib/offline";
import {
  courtConfig,
  defaultCourts,
  categories,
  productVariants,
  productVisible,
  priceLabel,
  variantPrice,
  validBooking,
  bookingSlotAvailability,
  money,
  todayIST,
  timeLabel,
  clock,
  calculate,
  quoteBooking,
  available,
  nextStatus,
  type State,
  type Product,
  type Order,
  type Booking,
  type Item,
} from "../lib/domain";

const navGroups = [
  {
    label: "WORKSPACE",
    items: [
      ["overview", "Overview", LayoutDashboard],
      ["orders", "Orders", ShoppingBag],
      ["pos", "Point of sale", Monitor],
      ["kitchen", "Kitchen display", ChefHat],
      ["courts", "Court bookings", CalendarDays],
      ["inventory", "Inventory", Package],
      ["products", "Menu & products", BookOpen],
    ],
  },
  {
    label: "MANAGE & GROW",
    items: [
      ["payments", "Payments", CreditCard],
      ["accounting", "Accounting", Landmark],
      ["partners", "Partners", Users],
      ["campaigns", "Campaigns", Megaphone],
      ["whatsapp", "WhatsApp", MessageCircle],
      ["reports", "Reports", ChartNoAxesCombined],
    ],
  },
];
const titles: Record<string, string> = {
  overview: "Overview",
  orders: "Orders",
  pos: "Point of sale",
  kitchen: "Kitchen display",
  courts: "Court bookings",
  inventory: "Inventory",
  products: "Menu & products",
  payments: "Payments",
  accounting: "Accounting",
  partners: "Partners",
  campaigns: "Campaigns",
  website: "Website management",
  whatsapp: "WhatsApp & delivery",
  reports: "Reports",
  settings: "Settings",
};
const img = (id: string, custom?: string) => {
  const name =
    (custom &&
    [
      "coffee",
      "latte",
      "americano",
      "coldbrew",
      "matcha",
      "fries",
      "pasta",
      "toast",
      "sandwich",
      "infusion",
      "croissant",
    ].includes(custom)
      ? custom
      : undefined) ||
    lostOriginMenu.find((p) => p.id === id)?.image ||
    (["croissant", "matcha", "sandwich", "coldbrew", "americano"].includes(id)
      ? id
      : "latte");
  return `/images/${name}.${name === "infusion" ? "svg" : "jpg"}`;
};
const emptyState: State = {
  products: [],
  inventory: [],
  orders: [],
  bookings: [],
  payments: [],
  expenses: [],
  journals: [],
  stockLedger: [],
  documents: [],
  settings: {},
  auditLogs: [],
};
function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "brand-small" : ""}`}>
      <img
        src="/lost-origin-logo.svg"
        alt="Lost Origin Coffee House"
        width="180"
        height="54"
      />
    </div>
  );
}
function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={`badge ${tone || String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      <span />
      {children}
    </span>
  );
}
function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="empty">
      <Coffee size={30} />
      <h3>{title}</h3>
      <p>{detail || "New activity will appear here."}</p>
    </div>
  );
}
function CourtDrawing() {
  return (
    <svg viewBox="0 0 210 116" aria-hidden="true">
      <rect x="1" y="1" width="208" height="114" rx="8" fill="#34715b" />
      <rect
        x="24"
        y="14"
        width="162"
        height="88"
        fill="#bad17d"
        stroke="#eeeeee"
        strokeWidth="1.5"
      />
      <path
        d="M105 14V102M24 58H186M62 14V102M148 14V102"
        stroke="#eeeeee"
        strokeWidth="1.4"
      />
      <path
        d="M105 8V108"
        stroke="#fff"
        strokeWidth="2.5"
        strokeDasharray="2 2"
      />
      <circle cx="154" cy="44" r="4" fill="#ffffff" />
    </svg>
  );
}
function exportCSV(name: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const quote = (v: any) =>
    '"' +
    String(
      typeof v === "object"
        ? JSON.stringify(v)
        : typeof v === "string" && /^[=+@\-\t\r]/.test(v)
          ? "'" + v
          : (v ?? ""),
    ).replaceAll('"', '""') +
    '"';
  const csv = [
    keys.map(quote).join(","),
    ...rows.map((r) => keys.map((k) => quote(r[k])).join(",")),
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
  );
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function CoffeeApp({
  surface = "website",
}: {
  surface?: "website" | "admin";
}) {
  const mainRef = useRef<HTMLElement>(null);
  const [recentBooking, setRecentBooking] = useState<Booking | null>(null);
  const [adminFilterState, setAdminFilterState] = useState<{
    view: string;
    value: AdminFilters;
  }>({ view: "", value: { ...emptyFilters } });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [data, setData] = useState<State>(emptyState),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState(surface === "admin" ? "overview" : "home"),
    [sidebar, setSidebar] = useState(false),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [search, setSearch] = useState(""),
    [notifications, setNotifications] = useState(false),
    [offline, setOffline] = useState(false);
  const [modal, setModal] = useState<{ type: string; value?: any } | null>(
      null,
    ),
    [cart, setCart] = useState<Item[]>([]),
    [cartOpen, setCartOpen] = useState(false),
    [orderSuccess, setOrderSuccess] = useState<Order | null>(null);
  const [queued, setQueued] = useState(0),
    [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const revisionRef = useRef(-1);
  const liveRef = useRef(false);
  const loadingRef = useRef(false);
  const refreshPendingRef = useRef(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const updateNotificationLogs = useCallback(
    (notificationLogs: NonNullable<State["notificationLogs"]>) =>
      setData((current) => ({ ...current, notificationLogs })),
    [],
  );
  const load = useCallback(
    async function refresh() {
      if (loadingRef.current) {
        refreshPendingRef.current = true;
        return;
      }
      loadingRef.current = true;
      const pending =
        surface === "admin" ? await queuedBills().catch(() => []) : [];
      setQueued(pending.length);
      try {
        const r = await fetch("/api/v1/state", { cache: "no-store" });
        const d: any = await r.json();
        if (r.status === 401 && surface === "admin") {
          window.location.replace("/admin/login");
          return;
        }
        if (!r.ok) throw new Error(d.error);
        if (surface === "admin" && !d.access?.admin) {
          window.location.replace("/admin/login");
          return;
        }
        setCsrfToken(d.access?.csrfToken);
        await cacheCatalogue(d, surface).catch(() => {});
        revisionRef.current = d.revision ?? 0;
        setData({
          ...d,
          orders: [...pending.map((b) => b.order), ...d.orders],
        });
        setError("");
        setLoaded(true);
      } catch (e: any) {
        const cache = await cachedCatalogue(surface).catch(() => undefined);
        if (cache && !navigator.onLine) {
          setData({
            ...emptyState,
            ...cache,
            orders: pending.map((b) => b.order),
          });
          setLoaded(true);
          setError("");
        } else setError(e.message);
      } finally {
        loadingRef.current = false;
        if (refreshPendingRef.current) {
          refreshPendingRef.current = false;
          void refresh();
        }
      }
    },
    [surface],
  );
  const syncBills = useCallback(async () => {
    if (surface !== "admin") return;
    if (syncingRef.current || !navigator.onLine) return;
    const bills = await queuedBills().catch(() => []);
    if (!bills.length) return;
    syncingRef.current = true;
    setSyncing(true);
    let count = 0;
    try {
      for (const bill of bills) {
        const r = await authFetch("/api/v1/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "order", ...bill.payload }),
        });
        const result: any = await r.json();
        if (!r.ok) {
          setToast(`Queued bill needs attention: ${result.error}`);
          break;
        }
        await removeQueuedBill(bill.requestKey);
        count++;
      }
      if (count)
        setToast(
          `${count} offline bill${count === 1 ? "" : "s"} synced. Final order references assigned.`,
        );
    } catch {
      setToast("Offline bills remain safely queued on this device.");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await load();
    }
  }, [load]);
  useEffect(() => {
    if (loaded && !offline) void syncBills();
  }, [loaded, offline, syncBills]);
  useEffect(() => {
    if (
      surface === "website" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          const urls = performance
            .getEntriesByType("resource")
            .map((r) => r.name);
          reg.active?.postMessage({ type: "CACHE_ASSETS", urls });
        })
        .catch(() => {});
    }
  }, []);
  useEffect(() => {
    const read = () => {
      const fallback = surface === "admin" ? "overview" : "home";
      const v = new URLSearchParams(location.search).get("view") || fallback;
      const allowed =
        surface === "admin"
          ? Object.keys(titles)
          : ["home", "menu", "book", "track"];
      setView(allowed.includes(v) ? v : fallback);
    };
    read();
    load();
    window.addEventListener("popstate", read);
    const timer = setInterval(() => {
      if (!liveRef.current && navigator.onLine) void load();
    }, 5000);
    const network = () => setOffline(!navigator.onLine);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    network();
    return () => {
      clearInterval(timer);
      window.removeEventListener("popstate", read);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, [load]);
  useEffect(() => {
    if (offline) return;
    const source = new EventSource("/api/v1/events");
    source.onopen = () => {
      liveRef.current = true;
      setLiveConnected(true);
    };
    source.onmessage = (event) => {
      try {
        const value = JSON.parse(event.data);
        if (value.version !== revisionRef.current) void load();
      } catch {}
    };
    source.onerror = () => {
      liveRef.current = false;
      setLiveConnected(false);
    };
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      source.close();
      liveRef.current = false;
      setLiveConnected(false);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load, offline]);
  useEffect(() => {
    if (offline) return;
    setCart((current) => {
      const next = current.map((item) => {
        const p = data.products.find((p) => p.id === item.id);
        const price = p && variantPrice(p, item.variant);
        return price && price !== item.price ? { ...item, price } : item;
      });
      return next.some((i, n) => i !== current[n]) ? next : current;
    });
  }, [data.products, offline]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (v: string) => {
    if (
      !(
        surface === "admin"
          ? Object.keys(titles)
          : ["home", "menu", "book", "track"]
      ).includes(v)
    )
      return;
    setView(v);
    setSidebar(false);
    setMobileMenu(false);
    setNotifications(false);
    setSearch("");
    history.pushState(
      {},
      "",
      `${surface === "admin" ? "/admin" : "/"}?view=${v}`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };
  const act = async (
    action: string,
    values: Record<string, any>,
    success?: string,
  ) => {
    setBusy(true);
    try {
      if (
        action === "order" &&
        values.source === "Counter" &&
        !navigator.onLine
      ) {
        const order = await queueBill(
          values,
          data.settings.business?.taxRate ?? 5,
        );
        await load();
        setToast("Bill saved on this device. It will sync when you reconnect.");
        return order;
      }
      const r = await authFetch("/api/v1/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...values }),
      });
      const d: any = await r.json();
      if (r.status === 401 && surface === "admin")
        window.location.replace("/admin/login");
      if (!r.ok) throw new Error(d.error);
      await load();
      if (success) setToast(success);
      return d;
    } catch (e: any) {
      setToast(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const mutate = (
    action: string,
    values: Record<string, any>,
    success?: string,
  ) => {
    void act(action, values, success).catch(() => {});
  };
  const business = data.settings.business || {
    shopName: "Lost Origin",
    tagline: "Coffee House",
    headline: "Find your\nLost Origin.",
    announcement: "COFFEE HOUSE · FRESHLY BREWED · MADE FOR TAKEAWAY",
    openTime: "06:00",
    closeTime: "22:00",
    prepMinutes: 15,
    taxRate: 5,
  };
  const active = data.orders.filter(
    (o) => !["Completed", "Cancelled", "No-show"].includes(o.status),
  );
  const lowStock = data.inventory.filter((i) => i.quantity <= i.reorder);
  const customerView = surface === "website";
  useScrollLock(sidebar || mobileMenu || notifications || !!search);
  const addCart = (item: Item) => {
    setCart((c) => {
      const i = c.findIndex(
        (x) =>
          x.id === item.id &&
          x.size === item.size &&
          x.milk === item.milk &&
          x.shot === item.shot &&
          x.variant === item.variant,
      );
      return i < 0
        ? [...c, item]
        : c.map((x, n) =>
            n === i
              ? { ...x, quantity: Math.min(20, x.quantity + item.quantity) }
              : x,
          );
    });
    setModal(null);
    if (!customerView) setToast(`${item.name} added to your order`);
  };
  const updateQuantity = (index: number, delta: number) =>
    setCart((c) =>
      c
        .map((x, n) =>
          n === index ? { ...x, quantity: x.quantity + delta } : x,
        )
        .filter((x) => x.quantity > 0),
    );
  const openCheckout = () => {
    if (cart.length) setModal({ type: "checkout" });
  };
  const openOrder = (o: Order) => setModal({ type: "order", value: o });
  const pageFilters =
    adminFilterState.view === view ? adminFilterState.value : emptyFilters;
  const pageData = filterWorkspace(data, view, pageFilters);
  const common = {
    data: pageData,
    navigate,
    setModal,
    mutate,
    openOrder,
    busy,
  };
  if (loaded && !customerView && data.access?.admin === false)
    return (
      <main className="admin-access-needed">
        <img src="/lost-origin-logo.svg" alt="Lost Origin Coffee House" />
        <h1>Administrator access required.</h1>
        <p>
          Sign in with the authorised administrator account to use this area.
        </p>
        <a className="btn primary" href="?view=home">
          Visit the website <ArrowRight size={16} />
        </a>
      </main>
    );
  return (
    <div
      className={
        customerView
          ? `customer-app customer-view-${view}${cart.length ? " cart-has-items" : ""}`
          : "admin-app"
      }
    >
      {customerView ? (
        <>
          <header className="customer-header">
            <a
              className="plain header-brand"
              href="?view=home"
              aria-label="Lost Origin home"
              onClick={(e) => {
                e.preventDefault();
                navigate("home");
              }}
            >
              <Brand small />
            </a>
            <nav aria-label="Main navigation">
              {[
                ["home", "Home"],
                ["menu", "Our menu"],
                ["book", "Play pickleball"],
                ["track", "My orders"],
              ].map(([id, label]) => (
                <a
                  key={id}
                  href={`?view=${id}`}
                  className={view === id ? "active" : ""}
                  aria-current={view === id ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(id);
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="header-actions">
              <button
                className="header-bag"
                aria-label={`Open bag, ${cart.reduce((s, i) => s + i.quantity, 0)} items`}
                onClick={() => setCartOpen(true)}
              >
                <ShoppingBag size={19} />
                <span>Bag (</span>
                <b className="cart-count">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </b>
                <span>)</span>
              </button>
              <button
                className="icon-btn header-profile"
                aria-label="My orders and account"
                onClick={() =>
                  setModal({
                    type: data.access?.customer
                      ? "customerAccount"
                      : "customerLogin",
                  })
                }
              >
                <UserRound size={24} />
              </button>
              <button
                className="mobile-menu-toggle icon-btn"
                aria-label="Open mobile menu"
                aria-haspopup="dialog"
                aria-expanded={mobileMenu}
                onClick={() => setMobileMenu(true)}
              >
                <MenuIcon size={21} />
              </button>
            </div>
          </header>
        </>
      ) : (
        <>
          {sidebar && (
            <div
              className="sidebar-backdrop"
              onClick={() => setSidebar(false)}
            />
          )}
          <aside className={`sidebar ${sidebar ? "open" : ""}`}>
            <button
              className="plain brand-button"
              onClick={() => navigate("overview")}
            >
              <Brand />
            </button>
            <button
              className="outlet"
              onClick={() => setModal({ type: "outlet" })}
            >
              <span className="outlet-icon">
                <MapPin size={16} />
              </span>
              <span>
                Main outlet<small>Hyderabad, India</small>
              </span>
              <ChevronDown size={14} />
            </button>
            <div className="sidebar-scroll">
              {navGroups.map((group) => (
                <div className="nav-group" key={group.label}>
                  <p>{group.label}</p>
                  {group.items.map(([id, label, Icon]: any) => (
                    <button
                      key={id}
                      className={`nav-item ${view === id ? "selected" : ""}`}
                      onClick={() => navigate(id)}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                      {id === "orders" && active.length > 0 ? (
                        <b className="nav-count">{active.length}</b>
                      ) : id === "whatsapp" ? (
                        <span className="tiny-dot" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="sidebar-bottom">
              <button
                className={`nav-item ${view === "settings" ? "selected" : ""}`}
                onClick={() => navigate("settings")}
              >
                <Settings size={17} />
                <span>Settings</span>
              </button>
              <div className="profile">
                <span className="avatar">KS</span>
                <div>
                  Karthik Saggidi<small>Owner workspace</small>
                </div>
                <button
                  aria-label="Workspace details"
                  className="icon-btn"
                  onClick={() => setModal({ type: "profile" })}
                >
                  <MoreHorizontal size={19} />
                </button>
              </div>
            </div>
          </aside>
          <div className="topbar">
            <div className="row">
              <button
                className="icon-btn mobile-toggle"
                onClick={() => setSidebar(true)}
                aria-label="Open navigation"
              >
                <MenuIcon size={21} />
              </button>
              <span className="breadcrumb">
                Workspace <ChevronRight size={13} />
                <b>{titles[view]}</b>
              </span>
            </div>
            <div className="topbar-actions">
              <div className="global-search">
                <Search size={16} />
                <input
                  aria-label="Search workspace"
                  placeholder="Search anything..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <div className="search-results">
                    {data.products
                      .filter((p) =>
                        p.name.toLowerCase().includes(search.toLowerCase()),
                      )
                      .slice(0, 3)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            navigate("products");
                            setModal({ type: "product", value: p });
                          }}
                        >
                          <Coffee size={16} />
                          {p.name}
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    {data.orders
                      .filter((o) =>
                        (o.id + o.customer)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .slice(0, 3)
                      .map((o) => (
                        <button
                          key={o.id}
                          onClick={() => {
                            setSearch("");
                            openOrder(o);
                          }}
                        >
                          <ShoppingBag size={16} />
                          {o.id} · {o.customer}
                        </button>
                      ))}
                    <button onClick={() => navigate("orders")}>
                      View all orders <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="notification-wrap">
                <button
                  className={`icon-btn notification-btn ${notifications ? "is-active" : ""}`}
                  aria-label="Notifications"
                  onClick={() => setNotifications(!notifications)}
                >
                  <Bell size={19} />
                  <span />
                </button>
                {notifications && (
                  <div className="notification-panel">
                    <h3>Your attention, please</h3>
                    <button
                      onClick={() => {
                        navigate("orders");
                        setNotifications(false);
                      }}
                    >
                      <ShoppingBag size={18} />
                      <span>
                        <b>{active.length} orders in progress</b>
                        <small>Keep the good coffee flowing.</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                    <button
                      onClick={() => {
                        navigate("inventory");
                        setNotifications(false);
                      }}
                    >
                      <Package size={18} />
                      <span>
                        <b>{lowStock.length} items running low</b>
                        <small>Time for a little restock.</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                    <p>Preview notifications · no messages sent</p>
                  </div>
                )}
              </div>
              <span className="avatar avatar-sm">KS</span>
            </div>
          </div>
        </>
      )}
      <main
        ref={mainRef}
        className={customerView ? "customer-main" : "main-content"}
      >
        {loaded && !customerView && (
          <WorkspaceTools
            key={view}
            view={view}
            title={titles[view] || "Workspace"}
            data={pageData}
            contentRef={mainRef}
            act={act}
          />
        )}
        {loaded &&
          !customerView &&
          view !== "campaigns" &&
          filterViews.includes(view) && (
            <WorkspaceFilters
              data={data}
              view={view}
              value={pageFilters}
              update={(value) => setAdminFilterState({ view, value })}
            />
          )}
        {offline && (
          <div className="offline-notice">
            <WifiOff size={17} />
            You’re offline. Counter cash and UPI bills save on this device and
            sync when you reconnect.
          </div>
        )}
        {queued > 0 && (
          <div className="offline-notice">
            <Receipt size={17} />
            <span>
              {queued} bill{queued === 1 ? "" : "s"} queued on this device.{" "}
              {syncing
                ? "Syncing…"
                : "Final references are assigned after sync."}
            </span>
            <button
              className="text-btn"
              disabled={offline || syncing}
              onClick={() => void syncBills()}
            >
              Retry sync <RefreshCw size={14} />
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            {error}
            <button className="text-btn" onClick={load}>
              Retry <RefreshCw size={14} />
            </button>
          </div>
        )}
        {!loaded ? (
          <div className="loading-state">
            <Coffee className="loading-icon" size={38} />
            <h2>Warming things up…</h2>
            <p>Getting your workspace ready.</p>
          </div>
        ) : (
          <>
            {view === "overview" && <Overview {...common} />}
            {view === "orders" && <OrdersPage {...common} />}
            {view === "kitchen" && <KitchenBoard {...common} />}
            {view === "pos" && (
              <POS
                data={data}
                cart={cart}
                add={(p) => setModal({ type: "modifier", value: p })}
                updateQuantity={updateQuantity}
                checkout={openCheckout}
                clear={() => setCart([])}
              />
            )}
            {view === "courts" && (
              <AdminCourts
                {...common}
                act={act}
                receipt={(booking) =>
                  setModal({ type: "bookingReceipt", value: booking })
                }
              />
            )}
            {view === "book" && (
              <CustomerCourts
                data={data}
                confirm={(value) => setModal({ type: "booking", value })}
              />
            )}
            {view === "inventory" && <Inventory {...common} />}
            {view === "products" && <Products {...common} />}
            {view === "payments" && <Payments {...common} />}
            {view === "accounting" && <Accounting {...common} />}
            {view === "partners" && <Partners {...common} />}
            {view === "campaigns" && <Campaigns {...common} act={act} />}
            {(view === "website" || view === "settings") && (
              <SettingsPage
                key={view}
                {...common}
                act={act}
                website={view === "website"}
              />
            )}
            {view === "whatsapp" && (
              <CommunicationsAdmin
                data={data}
                filters={pageFilters}
                onJobs={updateNotificationLogs}
              />
            )}
            {view === "reports" && <Reports {...common} range={pageFilters} />}
            {(view === "home" || view === "menu") && (
              <CustomerHome
                data={data}
                view={view}
                navigate={navigate}
                add={(p) => setModal({ type: "modifier", value: p })}
              />
            )}
            {view === "track" && (
              <CustomerActivity
                data={data}
                recentOrder={orderSuccess}
                recentBooking={recentBooking}
                openOrder={openOrder}
                openBooking={(booking) =>
                  setModal({ type: "bookingDetail", value: booking })
                }
                receipt={(booking) =>
                  setModal({ type: "bookingReceipt", value: booking })
                }
                navigate={navigate}
                signIn={() => setModal({ type: "customerLogin" })}
              />
            )}
          </>
        )}
        {!customerView && (
          <footer className="workspace-footer">
            <span>
              <span className="tiny-dot" />{" "}
              {offline
                ? "Offline · device queue ready"
                : liveConnected
                  ? "Live · connected"
                  : "Connecting live updates"}{" "}
              <span className="muted">·</span> Demo workspace
            </span>
            <span>
              <a
                href="https://www.dropxcorp.in"
                target="_blank"
                rel="noopener noreferrer"
              >
                Designed and developed by DropXcorp Pvt Ltd{" "}
                <ArrowUpRight size={12} />
              </a>
            </span>
          </footer>
        )}
      </main>
      {customerView && (
        <SiteFooter
          business={business}
          navigate={navigate}
          policy={(kind) => setModal({ type: "footerPolicy", value: kind })}
          offers={() => setModal({ type: "offers" })}
        />
      )}
      {customerView && !modal && !cartOpen && !mobileMenu && (
        <CartBar cart={cart} open={() => setCartOpen(true)} />
      )}
      {loaded && customerView && (
        <CustomerPopupCampaign
          data={data}
          view={view}
          blocked={Boolean(
            modal ||
              cartOpen ||
              mobileMenu ||
              notifications ||
              search ||
              offline,
          )}
          navigate={navigate}
        />
      )}
      {modal?.type === "footerPolicy" && (
        <Modal
          title={
            modal.value === "privacy" ? "Privacy Policy" : "Terms & Conditions"
          }
          close={() => setModal(null)}
        >
          <div className="footer-policy-copy">
            {modal.value === "privacy"
              ? business.privacyPolicy ||
                "Please contact Lost Origin Coffee House for privacy information about your orders and court bookings."
              : business.terms ||
                "Please contact Lost Origin Coffee House for the current café and court booking terms. Cancellations are handled by the admin team."}
          </div>
        </Modal>
      )}
      {modal?.type === "offers" && (
        <Modal title="Offers & Events" close={() => setModal(null)}>
          {heroCampaign(data).enabled ? (
            <p className="offer-message">{heroCampaign(data).text}</p>
          ) : (
            <Empty
              title="Good things are brewing"
              detail="New offers and events will appear here."
            />
          )}
          {data.documents
            .filter((d) => d.type === "campaign" && d.data.active)
            .map((d) => (
              <div className="offer-card" key={d.id}>
                <h3>{d.data.name}</h3>
                <p>{d.data.description}</p>
                <b>{d.data.code}</b>
              </div>
            ))}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            className="plain"
            onClick={() => setToast("")}
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {mobileMenu && (
        <Modal
          title="Explore Lost Origin"
          className="mobile-navigation"
          close={() => setMobileMenu(false)}
        >
          <nav aria-label="Mobile navigation">
            {[
              ["home", "Home"],
              ["menu", "Coffee & food menu"],
              ["book", "Book a court"],
              ["track", "My orders"],
            ].map(([id, label]) => (
              <a
                key={id}
                className={view === id ? "active" : ""}
                href={`?view=${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(id);
                }}
              >
                {label}
                <ArrowUpRight size={15} />
              </a>
            ))}
            <button
              className="mobile-account-link"
              onClick={() => {
                setMobileMenu(false);
                setModal({
                  type: data.access?.customer
                    ? "customerAccount"
                    : "customerLogin",
                });
              }}
            >
              <UserRound size={18} />
              {data.access?.customer ? "My account" : "Sign in"}
              <ArrowUpRight size={15} />
            </button>
          </nav>
        </Modal>
      )}
      {modal?.type === "receipt" && (
        <PrintPreview
          title="Sale receipt"
          canShare={!customerView}
          order={
            data.orders.find((o) => o.id === modal.value.id) || modal.value
          }
          business={business}
          close={() =>
            modal.value.returnToOrder
              ? setModal({ type: "order", value: modal.value })
              : setModal(null)
          }
        />
      )}
      {cartOpen && (
        <Modal title="Your takeaway bag" close={() => setCartOpen(false)}>
          <CartItems cart={cart} update={updateQuantity} />
          {cart.length > 0 && (
            <>
              <div className="total-line">
                <span>Subtotal</span>
                <b>{money(calculate(cart, "").subtotal)}</b>
              </div>
              <button
                className="btn primary full"
                onClick={() => {
                  setCartOpen(false);
                  openCheckout();
                }}
              >
                Choose pickup & checkout <ArrowRight size={17} />
              </button>
            </>
          )}
        </Modal>
      )}
      {modal?.type === "customerLogin" && (
        <CustomerLogin
          close={() => setModal(null)}
          done={() => {
            setModal(null);
            void load();
          }}
        />
      )}
      {modal?.type === "customerAccount" && data.access?.customer && (
        <Modal title="Your account" close={() => setModal(null)}>
          <div className="customer-account-summary">
            <UserRound size={32} strokeWidth={1.3} />
            <h3>{data.access.customer.name}</h3>
            <p>+91 {data.access.customer.phone}</p>
            <span>
              <CheckCircle2 size={15} />
              Verified mobile number
            </span>
          </div>
          <button
            className="btn primary full"
            onClick={() => {
              setModal(null);
              navigate("track");
            }}
          >
            My orders & bookings <ArrowRight size={16} />
          </button>
          <button
            className="btn secondary full"
            onClick={async () => {
              try {
                await logout();
                setOrderSuccess(null);
                setRecentBooking(null);
                setModal(null);
                await load();
              } catch (e: any) {
                setToast(e.message);
              }
            }}
          >
            Sign out <LogOut size={16} />
          </button>
        </Modal>
      )}
      {modal?.type === "modifier" && (
        <ProductModifier
          product={
            data.products.find((p) => p.id === modal.value.id) || modal.value
          }
          inventory={data.inventory}
          paused={customerView && business.paused}
          channel={customerView ? "website" : "pos"}
          close={() => setModal(null)}
          add={addCart}
        />
      )}
      {modal?.type === "checkout" && (
        <Checkout
          cart={cart}
          business={business}
          source={view === "pos" ? "Counter" : "Online"}
          customer={data.access?.customer}
          act={act}
          busy={busy}
          close={() => setModal(null)}
          update={updateQuantity}
          done={(o: Order) => {
            setCart([]);
            setModal(null);
            setOrderSuccess(o);
            setModal(
              view === "pos"
                ? { type: "receipt", value: o }
                : { type: "confirmation", value: { record: o, kind: "order" } },
            );
            setToast(
              o.status === "Queued offline"
                ? "Offline bill saved on this device."
                : "Demo order placed. Your kitchen ticket is ready.",
            );
          }}
        />
      )}
      {modal?.type === "confirmation" && (
        <TransactionConfirmation
          record={modal.value.record}
          kind={modal.value.kind}
          close={() => setModal(null)}
          print={() =>
            setModal({
              type: modal.value.kind === "order" ? "receipt" : "bookingReceipt",
              value: modal.value.record,
            })
          }
        />
      )}
      {modal?.type === "order" && (
        <OrderDetail
          order={
            data.orders.find((o) => o.id === modal.value.id) || modal.value
          }
          close={() => setModal(null)}
          mutate={mutate}
          busy={busy}
          admin={!customerView}
          onPrint={(order: Order) =>
            setModal({
              type: "receipt",
              value: { ...order, returnToOrder: true },
            })
          }
        />
      )}
      {modal?.type === "booking" && (
        <BookingForm
          data={data}
          initial={modal.value}
          act={act}
          busy={busy}
          close={() => setModal(null)}
          done={(b: Booking) => {
            setRecentBooking(b);
            setModal({
              type: customerView ? "confirmation" : "bookingReceipt",
              value: customerView ? { record: b, kind: "booking" } : b,
            });
          }}
        />
      )}
      {modal?.type === "bookingReceipt" && (
        <PrintPreview
          title={
            modal.value.status === "Completed"
              ? "Court bill"
              : "Court booking receipt"
          }
          booking={
            data.bookings.find((b) => b.id === modal.value.id) || modal.value
          }
          business={business}
          canShare={!customerView}
          close={() => setModal({ type: "bookingDetail", value: modal.value })}
        />
      )}
      {modal?.type === "bookingDetail" && (
        <BookingDetail
          booking={
            data.bookings.find((b) => b.id === modal.value.id) || modal.value
          }
          close={() => setModal(null)}
          admin={!customerView && data.access?.admin !== false}
          mutate={mutate}
          busy={busy}
          act={act}
          onReceipt={(booking: Booking) =>
            setModal({ type: "bookingReceipt", value: booking })
          }
        />
      )}
      {modal?.type === "stock" && (
        <StockForm
          stock={modal.value}
          act={act}
          busy={busy}
          close={() => setModal(null)}
        />
      )}
      {modal?.type === "expense" && (
        <ExpenseForm act={act} busy={busy} close={() => setModal(null)} />
      )}
      {modal?.type === "product" && (
        <ProductForm
          inventory={data.inventory}
          product={modal.value}
          act={act}
          busy={busy}
          close={() => setModal(null)}
        />
      )}
      {modal?.type === "outlet" && (
        <Modal title="Your outlet" close={() => setModal(null)}>
          <div className="outlet-detail">
            <MapPin size={28} />
            <h3>{business.shopName} · Main outlet</h3>
            <p>{business.address}</p>
            <Badge tone="green">Single outlet</Badge>
          </div>
          <p className="note">
            Café and court operations share one workspace. Change your outlet
            information in Settings.
          </p>
          <button
            className="btn primary full"
            onClick={() => {
              setModal(null);
              navigate("settings");
            }}
          >
            Open business settings <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {modal?.type === "profile" && (
        <Modal title="Owner workspace" close={() => setModal(null)}>
          <div className="profile-details">
            <span className="avatar">KS</span>
            <h3>Administrator</h3>
            <p>{data.access?.adminEmail}</p>
          </div>
          <p className="note">
            Your admin session is protected. Manage your password in Settings →
            Security.
          </p>
          <button
            className="btn secondary full"
            onClick={() => {
              setModal(null);
              navigate("settings");
            }}
          >
            Workspace settings
          </button>
          <button
            className="btn secondary full"
            onClick={async () => {
              try {
                await logout();
                window.location.replace("/admin/login");
              } catch (e: any) {
                setToast(e.message);
              }
            }}
          >
            Sign out <LogOut size={16} />
          </button>
        </Modal>
      )}
      {modal?.type === "policy" && (
        <Modal title="A few helpful details" close={() => setModal(null)}>
          <div className="policy-copy">
            <h3>Takeaway, always</h3>
            <p>
              Collect your order at the counter using your pickup code. Contact
              the team for changes or cancellations.
            </p>
            <h3>Court cancellations</h3>
            <p>
              Full refund at least 12 hours before play. 50% refund between 4
              and 12 hours. No refund within 4 hours.
            </p>
            <h3>About this preview</h3>
            <p>
              Online payments are in demonstration mode. Customer sign-in uses
              SMS verification when delivery is configured.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

type Common = {
  data: State;
  navigate: (v: string) => void;
  setModal: (m: { type: string; value?: any }) => void;
  mutate: (a: string, v: Record<string, any>, s?: string) => void;
  openOrder: (o: Order) => void;
  busy: boolean;
};
function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Stat({
  title,
  value,
  change,
  icon: Icon,
  color = "green",
  note,
}: {
  title: string;
  value: string;
  change?: string;
  icon: any;
  color?: string;
  note?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <span className={`stat-icon ${color}`}>
          <Icon size={17} />
        </span>
      </div>
      <div className="stat-value">
        {value}
        <svg
          viewBox="0 0 90 33"
          className={`sparkline ${color}`}
          aria-hidden="true"
        >
          <path d="M2 27L12 21L23 24L33 14L43 19L53 10L64 13L74 5L88 3" />
        </svg>
      </div>
      <div className="stat-foot">
        {change ? (
          <span className="stat-change">
            <TrendingUp size={12} />
            {change}
          </span>
        ) : null}
        <span>{note || "vs. previous day"}</span>
      </div>
    </div>
  );
}
function Overview({ data, navigate, setModal, openOrder }: Common) {
  const [period, setPeriod] = useState("Today"),
    [stream, setStream] = useState("All revenue");
  const today = todayIST();
  const weekStart = todayIST(new Date(Date.now() - 6 * 86400000));
  const selectedOrders = data.orders.filter(
    (o) =>
      o.status !== "Cancelled" &&
      (period === "Last 7 days"
        ? todayIST(new Date(o.createdAt)) >= weekStart &&
          todayIST(new Date(o.createdAt)) <= today
        : todayIST(new Date(o.createdAt)) === today),
  );
  const selectedBookings = data.bookings.filter(
    (b) =>
      b.status !== "Cancelled" &&
      (period === "Last 7 days"
        ? b.date >= weekStart && b.date <= today
        : b.date === today),
  );
  const revenue =
    selectedOrders.reduce((s, o) => s + o.total, 0) +
    selectedBookings.reduce((s, b) => s + b.total, 0);
  const live = data.orders.filter((o) =>
    ["Received", "Preparing", "Ready"].includes(o.status),
  );
  const low = data.inventory.filter((i) => i.quantity <= i.reorder);
  const yesterday = todayIST(new Date(Date.now() - 86400000));
  const previous =
    data.orders
      .filter((o) => todayIST(new Date(o.createdAt)) === yesterday)
      .reduce((s, o) => s + o.total, 0) +
    data.bookings
      .filter((b) => b.date === yesterday)
      .reduce((s, b) => s + b.total, 0);
  const growth = previous
    ? `${Math.round(((revenue - previous) / previous) * 100)}%`
    : "";
  const best = Object.values(
    selectedOrders
      .flatMap((o) => o.items)
      .reduce((acc: any, i) => {
        if (!acc[i.id])
          acc[i.id] = { id: i.id, name: i.name, qty: 0, total: 0 };
        acc[i.id].qty += i.quantity;
        acc[i.id].total += i.price * i.quantity;
        return acc;
      }, {}),
  )
    .sort((a: any, b: any) => b.qty - a.qty)
    .slice(0, 4) as any[];
  const courtBookings = data.bookings.filter(
    (b) => b.date === today && b.status !== "Cancelled",
  );
  return (
    <>
      <PageHeading
        title="A good day starts here."
        description="Today at Lost Origin. Coffee, kitchen and four courts, together."
      >
        <span className="live-pill">
          <span />
          Live overview
        </span>
        <label className="select-wrap">
          <CalendarDays size={15} />
          <select
            aria-label="Dashboard date range"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option>Today</option>
            <option>Last 7 days</option>
          </select>
        </label>
        <button className="btn primary" onClick={() => navigate("pos")}>
          <Plus size={16} />
          New order
        </button>
      </PageHeading>
      <div className="welcome-banner">
        <div className="welcome-copy">
          <div className="banner-eyebrow">
            <span /> LOST ORIGIN · THE DAILY EDIT
          </div>
          <h2>
            Coffee House. Four Courts.
            <br />
            One origin.
          </h2>
          <p>Your coffee house and four courts, working together.</p>
          <button onClick={() => navigate("home")}>
            See what your customers see <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="banner-photo">
          <img
            src="/images/coffee.jpg"
            alt="Fresh roasted coffee beans and a warm cup of coffee"
          />
          <div className="photo-stamp">
            a cup of coffee.
            <br />
            <i>a whole lot of possibility.</i>
          </div>
        </div>
        <div className="banner-date">
          <Sun size={16} />
          <span>
            {new Date().toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          title="Total revenue"
          value={money(revenue)}
          change={period === "Today" ? growth : undefined}
          icon={Wallet}
          note={period === "Today" ? "vs. yesterday" : "across the last 7 days"}
        />
        <Stat
          title="Café orders"
          value={String(selectedOrders.length)}
          change={undefined}
          icon={Coffee}
          color="sand"
          note={`${selectedOrders.filter((o) => o.source === "Online").length} online · ${selectedOrders.filter((o) => o.source === "Counter").length} counter`}
        />
        <Stat
          title="Court bookings"
          value={String(selectedBookings.length).padStart(2, "0")}
          icon={CalendarDays}
          color="olive"
          note={`${Math.round(selectedBookings.reduce((s, b) => s + b.duration, 0) / 60)} hours of good games`}
        />
        <Stat
          title="Average café bill"
          value={money(
            selectedOrders.length
              ? selectedOrders.reduce((s, o) => s + o.total, 0) /
                  selectedOrders.length
              : 0,
          )}
          icon={Receipt}
          color="terracotta"
          note="a little joy in every order"
        />
      </div>
      <div className="dashboard-middle">
        <section className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Revenue overview <span className="info-circle">i</span>
              </h2>
              <p>A healthy mix of brews and good rallies.</p>
            </div>
            <select
              aria-label="Revenue stream"
              value={stream}
              onChange={(e) => setStream(e.target.value)}
            >
              <option>All revenue</option>
              <option>Café only</option>
              <option>Courts only</option>
            </select>
          </div>
          <RevenueChart data={data} stream={stream} />
          <div className="chart-legend">
            <span>
              <i className="legend-dot cafe" />
              Café revenue
            </span>
            <span>
              <i className="legend-dot court" />
              Court revenue
            </span>
            <span className="chart-caption">Last 7 days</span>
          </div>
        </section>
        <section className="panel bestsellers">
          <div className="panel-heading">
            <div>
              <h2>The crowd favourites</h2>
              <p>Good taste, by the numbers.</p>
            </div>
            <button
              className="icon-btn"
              aria-label="View product report"
              onClick={() => navigate("reports")}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="bestseller-list">
            {best.map((p, i) => (
              <div className="bestseller" key={p.id}>
                <span className="rank">0{i + 1}</span>
                <img src={img(p.id, p.image)} alt={p.name} />
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.qty} sold <span>·</span> {money(p.total)}
                  </small>
                </div>
                <div className="mini-bar">
                  <span style={{ width: `${(p.qty / best[0].qty) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <button className="panel-link" onClick={() => navigate("products")}>
            Explore your menu <ArrowRight size={14} />
          </button>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel live-orders">
          <div className="panel-heading">
            <div className="row">
              <h2>On the counter</h2>
              <span className="count-chip">{live.length} live</span>
            </div>
            <button className="text-btn" onClick={() => navigate("orders")}>
              All orders <ArrowUpRight size={14} />
            </button>
          </div>
          <OrderTable orders={live.slice(0, 4)} open={openOrder} compact />
          {!live.length && (
            <Empty
              title="All caught up"
              detail="Your next great order is on its way."
            />
          )}
        </section>
        <section className="panel stock-alerts">
          <div className="panel-heading">
            <div className="row">
              <h2>A little heads-up</h2>
              <span className="alert-count">{low.length}</span>
            </div>
            <Package size={17} />
          </div>
          <p className="panel-description">
            These essentials could use a top-up.
          </p>
          <div>
            {low.slice(0, 3).map((s) => (
              <button
                key={s.id}
                className="stock-alert"
                onClick={() => setModal({ type: "stock", value: s })}
              >
                <span className="stock-alert-icon">
                  <Package size={16} />
                </span>
                <div>
                  <b>{s.name}</b>
                  <small>
                    {s.quantity.toLocaleString("en-IN")} {s.unit} left{" "}
                    <span>· Low stock</span>
                  </small>
                </div>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
          <button className="panel-link" onClick={() => navigate("inventory")}>
            Manage inventory <ArrowRight size={14} />
          </button>
        </section>
      </div>
      <section className="panel court-today">
        <div className="panel-heading">
          <div>
            <div className="row">
              <h2>A good day on court</h2>
              <span className="count-chip">
                {courtBookings.length} bookings today
              </span>
            </div>
            <p>A little competition. A lot of community.</p>
          </div>
          <button className="text-btn" onClick={() => navigate("courts")}>
            Court calendar <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="court-summary-grid">
          {courtConfig(data.settings)
            .filter((c) => c.active)
            .map(({ name: c }) => {
              const bookings = courtBookings.filter((b) => b.court === c);
              const next = bookings.find((b) => b.status === "Confirmed");
              return (
                <div className="court-summary" key={c}>
                  <div className="court-thumb">
                    <CourtDrawing />
                  </div>
                  <div>
                    <h3>
                      {c} <Badge tone="green">Pickleball</Badge>
                    </h3>
                    <p>
                      {bookings.length} bookings <span>·</span>{" "}
                      {bookings.reduce((s, b) => s + b.duration, 0) / 60} hours
                      booked
                    </p>
                    <small>
                      {next
                        ? `Next up · ${timeLabel(next.start)} · ${next.customer}`
                        : "A little room for a rally"}
                    </small>
                  </div>
                  <button
                    className="btn secondary small"
                    onClick={() =>
                      setModal({ type: "booking", value: { court: c } })
                    }
                  >
                    Book a slot <Plus size={14} />
                  </button>
                </div>
              );
            })}
        </div>
      </section>
    </>
  );
}

function RevenueChart({
  data,
  stream = "All revenue",
  range,
}: {
  data: State;
  stream?: string;
  range?: AdminFilters;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const allDates = [
    ...data.orders.map((o) => todayIST(new Date(o.createdAt))),
    ...data.bookings.map((b) => b.date),
  ].sort();
  const end = range
    ? range.to || allDates[allDates.length - 1] || todayIST()
    : todayIST();
  const start = range
    ? range.from || allDates[0] || end
    : todayIST(new Date(Date.now() - 6 * 86400000));
  const startMs = new Date(start + "T12:00:00+05:30").getTime();
  const dayCount = Math.max(
    1,
    Math.round(
      (new Date(end + "T12:00:00+05:30").getTime() - startMs) / 86400000,
    ) + 1,
  );
  const buckets = Math.min(7, dayCount);
  const points = Array.from({ length: buckets }, (_, i) => {
    const date = todayIST(
      new Date(startMs + Math.floor((i * dayCount) / buckets) * 86400000),
    );
    const next = todayIST(
      new Date(startMs + Math.floor(((i + 1) * dayCount) / buckets) * 86400000),
    );
    const last = todayIST(
      new Date(new Date(next + "T12:00:00+05:30").getTime() - 86400000),
    );
    return {
      date,
      label: new Date(date + "T12:00:00+05:30").toLocaleDateString("en-IN", {
        month: "short",
      }),
      rangeLabel: date === last ? date : `${date} – ${last}`,
      cafe:
        data.orders
          .filter((o) => {
            const d = todayIST(new Date(o.createdAt));
            return d >= date && d < next && o.status !== "Cancelled";
          })
          .reduce((s, o) => s + o.total, 0) / 100,
      court:
        data.bookings
          .filter(
            (b) => b.date >= date && b.date < next && b.status !== "Cancelled",
          )
          .reduce((s, b) => s + b.total, 0) / 100,
    };
  });
  const max =
    Math.ceil(
      Math.max(...points.flatMap((p) => [p.cafe, p.court]), 1000) / 4000,
    ) * 4000;
  const x = (i: number) =>
    points.length === 1 ? 292 : 52 + (i * 480) / (points.length - 1);
  const y = (value: number) => 188 - (value / max) * 160;
  const line = (key: "cafe" | "court") =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[key])}`)
      .join(" ");
  return (
    <div className="revenue-chart">
      <svg
        viewBox="0 0 558 228"
        role="img"
        aria-label="Café and court revenue for the selected period"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#666666" stopOpacity=".18" />
            <stop offset="100%" stopColor="#666666" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((n) => (
          <g key={n}>
            <line
              x1="52"
              x2="532"
              y1={28 + n * 40}
              y2={28 + n * 40}
              stroke="#eeeEe8"
              strokeDasharray="3 4"
            />
            <text
              x="36"
              y={32 + n * 40}
              textAnchor="end"
              fill="#93958d"
              fontSize="12.5"
            >
              {n === 4 ? "₹0" : `₹${Math.round((max * (4 - n)) / 4 / 1000)}k`}
            </text>
          </g>
        ))}
        {stream !== "Courts only" && (
          <>
            <path
              d={`${line("cafe")} L532,188 L52,188 Z`}
              fill={points.length > 1 ? "url(#areaGradient)" : "none"}
            />
            <path
              d={line("cafe")}
              fill="none"
              stroke="#242424"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </>
        )}
        {stream !== "Café only" && (
          <path
            d={line("court")}
            fill="none"
            stroke="#a0a0a0"
            strokeWidth="2.2"
            strokeDasharray="5 5"
            strokeLinejoin="round"
          />
        )}
        {points.length === 1 && (
          <g>
            {stream !== "Courts only" && (
              <circle cx={x(0)} cy={y(points[0].cafe)} r="4" fill="#302a22" />
            )}
            {stream !== "Café only" && (
              <circle cx={x(0)} cy={y(points[0].court)} r="4" fill="#a5967c" />
            )}
          </g>
        )}
        {points.map((p, i) => (
          <g
            key={p.date}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <rect
              x={x(i) - 32}
              y="20"
              width="64"
              height="175"
              fill="transparent"
            />
            <text
              x={x(i)}
              y="215"
              fill="#898d81"
              fontSize="12.5"
              textAnchor="middle"
            >
              {p.label} {Number(p.date.slice(-2))}
            </text>
            {hover === i && (
              <>
                <line
                  x1={x(i)}
                  x2={x(i)}
                  y1="26"
                  y2="188"
                  stroke="#cccccc"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={x(i)}
                  cy={y(p.cafe)}
                  r="4"
                  fill="#242424"
                  stroke="white"
                  strokeWidth="2"
                />
              </>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="chart-tooltip"
          style={{ left: `${Math.min(75, 12 + hover * 12)}%` }}
        >
          <b>{points[hover].rangeLabel}</b>
          <span>Café {money(points[hover].cafe * 100)}</span>
          <span>Courts {money(points[hover].court * 100)}</span>
        </div>
      )}
    </div>
  );
}

function OrderTable({
  orders,
  open,
  compact = false,
}: {
  orders: Order[];
  open: (o: Order) => void;
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            {!compact && <th>Source</th>}
            <th>Pickup</th>
            <th>Amount</th>
            <th>Status</th>
            <th aria-label="Details" />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr
              key={o.id}
              onClick={() => open(o)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") open(o);
              }}
            >
              <td>
                <b className="order-id">#{o.id.replace("CC-", "")}</b>
                {compact && (
                  <small>
                    {o.source === "Online" ? (
                      <Globe size={10} />
                    ) : (
                      <Monitor size={10} />
                    )}{" "}
                    {o.source}
                  </small>
                )}
              </td>
              <td>
                <span className="customer-name">{o.customer}</span>
                {!compact && (
                  <small>
                    {o.items.reduce((s, i) => s + i.quantity, 0)} items
                  </small>
                )}
              </td>
              {!compact && (
                <td>
                  <span className="source-tag">
                    {o.source === "Online" ? (
                      <Globe size={12} />
                    ) : (
                      <Monitor size={12} />
                    )}{" "}
                    {o.source}
                  </span>
                </td>
              )}
              <td>
                {o.source === "Counter" ? "Immediate" : clock(o.pickupAt)}
              </td>
              <td>
                <b>{money(o.total)}</b>
              </td>
              <td>
                <Badge>{o.status}</Badge>
              </td>
              <td>
                <button
                  className="icon-btn"
                  aria-label={`View order ${o.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    open(o);
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function OrdersPage({ data, navigate, openOrder }: Common) {
  const [status, setStatus] = useState("All orders"),
    [query, setQuery] = useState(""),
    [source, setSource] = useState("All sources"),
    [date, setDate] = useState(todayIST());
  const rows = data.orders.filter(
    (o) =>
      (status === "All orders" || o.status === status) &&
      (source === "All sources" || o.source === source) &&
      (!date || todayIST(new Date(o.createdAt)) === date) &&
      (o.id + o.customer + o.phone).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Every order, a little happiness."
        description="From the first tap to the final pickup. Keep things flowing."
      >
        <button
          className="btn secondary"
          onClick={() => exportCSV("cafe-orders", rows)}
        >
          <Download size={16} />
          Export
        </button>
        <button className="btn primary" onClick={() => navigate("pos")}>
          <Plus size={16} />
          New order
        </button>
      </PageHeading>
      <div className="tabs">
        {[
          "All orders",
          "Received",
          "Preparing",
          "Ready",
          "Completed",
          "Cancelled",
        ].map((s) => (
          <button
            className={status === s ? "active" : ""}
            key={s}
            onClick={() => setStatus(s)}
          >
            {s}
            {["Received", "Preparing", "Ready"].includes(s) && (
              <span>{data.orders.filter((o) => o.status === s).length}</span>
            )}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="filter-bar">
          <div className="search-input">
            <Search size={16} />
            <input
              placeholder="Search order, name or mobile…"
              aria-label="Search orders"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Order source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option>All sources</option>
            <option>Online</option>
            <option>Counter</option>
          </select>
          <input
            aria-label="Order date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <span className="muted">{rows.length} orders</span>
        </div>
        <OrderTable orders={rows} open={openOrder} />
        {!rows.length && (
          <Empty
            title="No orders found"
            detail="Try a different status, search or date."
          />
        )}
      </section>
    </>
  );
}
function Kitchen({ data, mutate, busy, openOrder }: Common) {
  return (
    <>
      <PageHeading
        eyebrow="THE HEART OF THE CAFÉ"
        title="A little craft in every cup."
        description="Your live kitchen board. Tap an action to move an order along."
      >
        <span className="live-pill">
          <span />
          Live kitchen updates
        </span>
      </PageHeading>
      <div className="kitchen-grid">
        {["Received", "Preparing", "Ready"].map((status) => {
          const orders = data.orders.filter((o) => o.status === status);
          return (
            <section className="kitchen-column" key={status}>
              <h2>
                <span className={`status-dot ${status.toLowerCase()}`} />
                {status === "Received" ? "New orders" : status}
                <b>{orders.length}</b>
              </h2>
              {orders.map((o) => (
                <div className="kitchen-ticket" key={o.id}>
                  <div className="ticket-top">
                    <button className="plain" onClick={() => openOrder(o)}>
                      <b>#{o.id.replace("CC-", "")}</b>
                    </button>
                    <span className="source-tag">{o.source}</span>
                  </div>
                  <h3>{o.customer}</h3>
                  <p>
                    <Clock size={13} />
                    {o.source === "Counter"
                      ? "ASAP · Counter"
                      : `Pickup ${clock(o.pickupAt)}`}
                  </p>
                  <div className="ticket-items">
                    {o.items.map((i, n) => (
                      <div key={n}>
                        <b>
                          {i.quantity} × {i.name}
                        </b>
                        <small>
                          {i.variant && i.variant !== "Standard"
                            ? i.variant
                            : i.size === "Regular"
                              ? "Standard"
                              : i.size}
                          {i.milk ? ` · ${i.milk}` : ""}
                          {i.shot ? " · Extra shot" : ""}
                        </small>
                      </div>
                    ))}
                  </div>
                  {o.notes && <div className="order-note">{o.notes}</div>}
                  <button
                    disabled={busy}
                    className="btn primary full"
                    onClick={() =>
                      mutate(
                        "orderStatus",
                        { id: o.id, status: nextStatus[o.status] },
                        `Order ${nextStatus[o.status].toLowerCase()}`,
                      )
                    }
                  >
                    {status === "Received"
                      ? "Start preparing"
                      : status === "Preparing"
                        ? "Mark ready"
                        : "Mark collected"}
                    <ArrowRight size={15} />
                  </button>
                </div>
              ))}
              {!orders.length && <Empty title="A moment to breathe" />}
            </section>
          );
        })}
      </div>
    </>
  );
}

function CartItems({
  cart,
  update,
}: {
  cart: Item[];
  update: (n: number, d: number) => void;
}) {
  return (
    <div className="cart-items">
      {!cart.length ? (
        <Empty
          title="A little room for something good"
          detail="Add a drink or a bite to get started."
        />
      ) : (
        cart.map((i, n) => (
          <div className="cart-item" key={`${i.id}-${n}`}>
            <img src={img(i.id)} alt={i.name} />
            <div className="cart-item-main">
              <b>{i.name}</b>
              <small>
                {i.variant && i.variant !== "Standard"
                  ? i.variant
                  : i.size === "Regular"
                    ? "Standard"
                    : i.size}
                {i.milk ? ` · ${i.milk}` : ""}
                {i.shot ? " · Extra shot" : ""}
              </small>
              <div className="quantity-stepper">
                <button
                  aria-label={`Remove one ${i.name}`}
                  onClick={() => update(n, -1)}
                >
                  <Minus size={13} />
                </button>
                <span>{i.quantity}</span>
                <button
                  aria-label={`Add one ${i.name}`}
                  onClick={() => update(n, 1)}
                  disabled={i.quantity >= 20}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
            <strong>{money(i.price * i.quantity)}</strong>
          </div>
        ))
      )}
    </div>
  );
}
function POS({
  data,
  cart,
  add,
  updateQuantity,
  checkout,
  clear,
}: {
  data: State;
  cart: Item[];
  add: (p: Product) => void;
  updateQuantity: (n: number, d: number) => void;
  checkout: () => void;
  clear: () => void;
}) {
  const [category, setCategory] = useState("All items"),
    [query, setQuery] = useState("");
  const rows = data.products.filter(
    (p) =>
      productVisible(p, "pos") &&
      (category === "All items" || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Good things, on the counter."
        description="Tap a favourite, make it theirs, and keep the queue moving."
      >
        <span className="badge green">
          <span />
          Counter · Online
        </span>
      </PageHeading>
      <div className="pos-layout">
        <section>
          <div className="search-input pos-search">
            <Search size={17} />
            <input
              aria-label="Search POS products"
              placeholder="Find a drink or a bite…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="tabs compact-tabs">
            {[
              "All items",
              ...categories(
                data.products.filter((p) => productVisible(p, "pos")),
              ),
            ].map((c) => (
              <button
                className={c === category ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="pos-products">
            {rows.map((p) => (
              <button
                disabled={!available(p, data.inventory)}
                className="pos-product"
                key={p.id}
                onClick={() => add(p)}
              >
                <img src={img(p.id, p.image)} alt={p.name} />
                <div>
                  <span>{p.category}</span>
                  <h3>{p.name}</h3>
                  <div>
                    <b>{priceLabel(p)}</b>
                    {available(p, data.inventory) ? (
                      <span className="add-circle">
                        <Plus size={16} />
                      </span>
                    ) : (
                      <Badge tone="red">Sold out</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
        <aside className="panel pos-ticket">
          <div className="panel-heading">
            <h2>Current order</h2>
            <button
              disabled={!cart.length}
              className="text-btn"
              onClick={clear}
            >
              Clear
            </button>
          </div>
          <div className="ticket-source">
            <Monitor size={14} />
            Counter takeaway<span>New bill</span>
          </div>
          <CartItems cart={cart} update={updateQuantity} />
          <div className="pos-totals">
            <div>
              <span>Subtotal</span>
              <b>{money(calculate(cart, "").subtotal)}</b>
            </div>
            <div>
              <span>Estimated tax ({data.settings.business.taxRate}%)</span>
              <span>
                {money(calculate(cart, "", data.settings.business.taxRate).tax)}
              </span>
            </div>
            <div className="total-line">
              <span>Total</span>
              <b>
                {money(
                  calculate(cart, "", data.settings.business.taxRate).total,
                )}
              </b>
            </div>
            <button
              className="btn primary full"
              disabled={!cart.length}
              onClick={checkout}
            >
              Continue to payment <ArrowRight size={16} />
            </button>
            <p className="micro-copy">Demo billing · no money is collected</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function ProductModifier({
  product: p,
  close,
  add,
  inventory,
  paused,
  channel,
}: {
  product: Product;
  close: () => void;
  add: (item: Item) => void;
  inventory: State["inventory"];
  paused?: boolean;
  channel: "website" | "pos";
}) {
  const variants = productVariants(p);
  const [variant, setVariant] = useState(variants[0].label),
    [quantity, setQuantity] = useState(1);
  const price = variantPrice(p, variant)!;
  const ingredients = productIngredients(p, inventory);
  const canAdd =
    !paused && productVisible(p, channel) && available(p, inventory);
  return (
    <Modal title={p.name} close={close} className="product-detail-modal">
      <img className="modifier-photo" src={img(p.id, p.image)} alt={p.name} />
      <div className="modifier-info">
        <span className="eyebrow">LOST ORIGIN · {p.category}</span>
        <p>{p.description}</p>
      </div>
      <section className="product-ingredient-section" aria-label="Ingredients">
        <h3>Ingredients</h3>
        {ingredients.length ? (
          <ul>
            {ingredients.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p>
            Ingredient details are being updated. Please ask our team for this
            item's ingredients.
          </p>
        )}
        <small>
          Please ask our team about allergies or dietary needs before ordering.
        </small>
      </section>
      {variants.length > 1 && (
        <Field label="Hot or cold?">
          <div className="option-grid">
            {variants.map((v) => (
              <button
                key={v.label}
                className={variant === v.label ? "chosen" : ""}
                aria-pressed={variant === v.label}
                onClick={() => setVariant(v.label)}
              >
                {v.label}
                <span>{money(v.price)}</span>
              </button>
            ))}
          </div>
        </Field>
      )}
      <p className="menu-price-note">
        {variants.length === 1 ? money(price) : "Menu prices as listed"} · tax
        added at checkout
      </p>
      <div className="modifier-bottom">
        <div className="quantity-stepper large">
          <button
            aria-label="Reduce quantity"
            disabled={quantity === 1}
            onClick={() => setQuantity(quantity - 1)}
          >
            <Minus size={16} />
          </button>
          <span>{quantity}</span>
          <button
            aria-label="Increase quantity"
            disabled={quantity === 20}
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          className="btn primary"
          disabled={!canAdd}
          onClick={() =>
            add({
              id: p.id,
              name: p.name,
              variant,
              price,
              quantity,
              size: "Regular",
              milk: p.recipe.milk ? "Whole milk" : "",
              shot: false,
            })
          }
        >
          {canAdd
            ? `Add to order · ${money(price * quantity)}`
            : paused
              ? "Ordering is paused"
              : "Currently unavailable"}
          <Plus size={16} />
        </button>
      </div>
    </Modal>
  );
}
function pickupOptions(prep: number, opening: string, closing: string) {
  const result: string[] = [];
  const start = Math.ceil((Date.now() + prep * 60000) / 900000) * 900000;
  for (let i = 0; i < 192; i++) {
    const d = new Date(start + i * 900000);
    const local = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    if (local >= opening && local < closing) result.push(d.toISOString());
    if (result.length === 20) break;
  }
  return result;
}
function Checkout({
  cart,
  business,
  source,
  act,
  busy,
  close,
  update,
  done,
  customer,
}: any) {
  const instant = source === "Counter";
  const slots = instant
    ? []
    : pickupOptions(
        business.prepMinutes,
        business.openTime,
        business.closeTime,
      );
  const [pickup, setPickup] = useState(slots[0] || ""),
    [coupon, setCoupon] = useState(""),
    [payment, setPayment] = useState(source === "Counter" ? "Cash" : "UPI"),
    [formError, setFormError] = useState("");
  const key = useRef(crypto.randomUUID());
  const totals = calculate(cart, coupon, business.taxRate);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart.length) return;
    setFormError("");
    const f = new FormData(e.currentTarget);
    try {
      const result = await act("order", {
        customer: f.get("customer") || "Walk-in customer",
        phone: f.get("phone") || "",
        email: f.get("email") || "",
        marketingOptIn: f.get("marketingOptIn") === "on",
        items: cart,
        ...(instant ? {} : { pickupAt: pickup }),
        source,
        paymentMode: payment,
        notes: f.get("notes") || "",
        coupon,
        requestKey: key.current,
      });
      done(result);
    } catch (e: any) {
      setFormError(e.message);
    }
  }
  return (
    <Modal
      title={
        source === "Counter"
          ? "Instant counter bill"
          : "Your next good coffee awaits."
      }
      close={close}
      wide
    >
      <form onSubmit={submit} className="checkout-layout">
        <div>
          <div className="form-section-title">
            <span>01</span>
            {instant ? "Customer (optional)" : "Your details"}
          </div>
          <div className="form-grid">
            <Field label={instant ? "Name (optional)" : "Name"}>
              <input
                name="customer"
                required={!instant}
                minLength={2}
                placeholder="Your name"
                defaultValue={
                  source === "Counter"
                    ? "Walk-in customer"
                    : customer?.name || ""
                }
              />
            </Field>
            <Field
              label={instant ? "Mobile number (optional)" : "Mobile number"}
            >
              <div className="phone-input">
                <span>+91</span>
                <input
                  name="phone"
                  defaultValue={!instant ? customer?.phone || "" : ""}
                  readOnly={!instant && Boolean(customer?.phone)}
                  aria-label="Mobile number"
                  required={!instant}
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  placeholder="98765 43210"
                  title="10-digit Indian mobile number"
                />
              </div>
            </Field>
          </div>
          {!instant && (
            <>
              <Field label="Email address for confirmation and bill">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={160}
                  required
                  placeholder="you@example.com"
                />
              </Field>
              <label className="check-field">
                <input name="marketingOptIn" type="checkbox" />
                Send me offers and events on WhatsApp (optional)
              </label>
              <div className="form-section-title">
                <span>02</span>Pick up at the counter
              </div>
              <Field label="Pickup time">
                <select
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                >
                  {slots.map((s) => (
                    <option value={s} key={s}>
                      {todayIST(new Date(s)) === todayIST()
                        ? "Today"
                        : "Tomorrow"}{" "}
                      · {clock(s)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label="A note for the barista (optional)">
            <textarea
              name="notes"
              placeholder="A little less ice? Let us know."
              rows={2}
              maxLength={500}
            />
          </Field>
          <div className="form-section-title">
            <span>{instant ? "02" : "03"}</span>
            {instant ? "Payment" : "Payment preview"}
          </div>
          <div className="payment-options">
            {(source === "Counter"
              ? ["Cash", "UPI", "Card"]
              : ["UPI", "Card", "Pay at counter"]
            ).map((p) => (
              <button
                key={p}
                type="button"
                className={payment === p ? "chosen" : ""}
                onClick={() => setPayment(p)}
              >
                {p === "Cash" ? <Wallet size={18} /> : <CreditCard size={18} />}
                <span>{p}</span>
                {payment === p && <CheckCircle2 size={15} />}
              </button>
            ))}
          </div>
          <div className="notice">
            <Info size={16} />
            <p>
              This is a demo checkout. No money is collected. Phone verification
              and live payment providers are not connected.
            </p>
          </div>
        </div>
        <div className="checkout-summary">
          <h3>A bag of good things</h3>
          <CartItems cart={cart} update={update} />
          <Field label="Have a little perk?">
            <input
              placeholder="Coupon code · FIRSTBREW"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            />
          </Field>
          <div className="summary-lines">
            <div>
              <span>Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="green-text">
                <span>Your first-brew perk</span>
                <span>−{money(totals.discount)}</span>
              </div>
            )}
            <div>
              <span>Tax ({business.taxRate}%)</span>
              <span>{money(totals.tax)}</span>
            </div>
            <div className="total-line">
              <b>Total</b>
              <strong>{money(totals.total)}</strong>
            </div>
          </div>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <button
            className="btn primary full"
            type="submit"
            disabled={busy || !cart.length}
          >
            {busy
              ? instant
                ? "Creating bill…"
                : "Placing your order…"
              : instant
                ? "Bill & print"
                : "Place demo order"}
            <ArrowRight size={16} />
          </button>
          <p className="micro-copy">
            {instant
              ? "Instant billing · No pickup slot required."
              : "Takeaway only. A good thing worth picking up."}
          </p>
        </div>
      </form>
    </Modal>
  );
}

function OrderDetail({ order: o, close, mutate, busy, admin, onPrint }: any) {
  const stages = ["Received", "Preparing", "Ready", "Completed"];
  const index = stages.indexOf(o.status);
  return (
    <Modal title={`Order ${o.id}`} close={close}>
      <div className="receipt-hero">
        <span className="receipt-icon">
          <Coffee size={28} />
        </span>
        <h3>
          {o.status === "Ready"
            ? "Ready for pickup."
            : o.status === "Completed"
              ? "Your order has been collected."
              : o.status === "Cancelled"
                ? "This order was cancelled by the admin team."
                : o.status === "Preparing"
                  ? "We’re preparing your order."
                  : "Your order has been received."}
        </h3>
        <p>
          {o.customer} ·{" "}
          {o.source === "Counter"
            ? "ASAP · Counter"
            : `Pickup ${clock(o.pickupAt)}`}
        </p>
        <Badge>{o.status}</Badge>
      </div>
      <OrderTimeline order={o} />
      <div className="pickup-code">
        <span>
          {o.source === "Counter"
            ? "Counter order reference"
            : "Your pickup code"}
        </span>
        <b>{o.id.slice(-4)}</b>
        <small>
          {o.source === "Counter"
            ? "Instant counter bill · prepared as soon as possible."
            : "Show this at the counter. Your order is takeaway only."}
        </small>
      </div>
      <div className="receipt-items">
        {o.items.map((i: Item, n: number) => (
          <div key={n}>
            <span>
              {i.quantity} × {i.name}
              <small>
                {i.variant && i.variant !== "Standard"
                  ? i.variant
                  : i.size === "Regular"
                    ? "Standard"
                    : i.size}
                {i.shot ? " · Extra shot" : ""}
              </small>
            </span>
            <b>{money(i.price * i.quantity)}</b>
          </div>
        ))}
      </div>
      {o.notes && <div className="order-note">{o.notes}</div>}
      <div className="summary-lines">
        <div>
          <span>Subtotal</span>
          <span>{money(o.subtotal)}</span>
        </div>
        {o.discount > 0 && (
          <div>
            <span>Discount</span>
            <span>−{money(o.discount)}</span>
          </div>
        )}
        <div>
          <span>Tax</span>
          <span>{money(o.tax)}</span>
        </div>
        <div className="total-line">
          <b>Total</b>
          <strong>{money(o.total)}</strong>
        </div>
      </div>
      <p className="micro-copy">
        {o.paymentMode} · {o.paymentStatus} ·{" "}
        {o.status === "Queued offline"
          ? "Temporary device receipt"
          : "Preview receipt"}
      </p>
      {o.paymentStatus === "Pending" && admin && o.status !== "Cancelled" && (
        <button
          disabled={busy}
          className="btn secondary full"
          onClick={() =>
            mutate(
              "collectPayment",
              { id: o.id, mode: "Cash" },
              "Demo cash payment collected",
            )
          }
        >
          Collect demo cash · {money(o.total)}
        </button>
      )}
      {nextStatus[o.status] && admin && (
        <button
          disabled={busy}
          className="btn primary full"
          onClick={() =>
            mutate(
              "orderStatus",
              { id: o.id, status: nextStatus[o.status] },
              `Order ${nextStatus[o.status].toLowerCase()}`,
            )
          }
        >
          {o.status === "Received"
            ? "Start preparing"
            : o.status === "Preparing"
              ? "Mark ready for pickup"
              : "Mark collected"}
          <ArrowRight size={16} />
        </button>
      )}
      <div className="receipt-actions">
        <DownloadBill record={o} kind="order" />
        {admin && (
          <>
            <WhatsAppShare record={o} kind="order" />
            <WhatsAppShare record={o} kind="order" update />
          </>
        )}
        <button className="text-btn" onClick={() => onPrint(o)}>
          <Printer size={15} />
          Print receipt
        </button>
        {admin && ["Received", "Preparing", "Ready"].includes(o.status) && (
          <button
            disabled={busy}
            className="text-btn danger-text"
            onClick={() =>
              mutate(
                "orderStatus",
                { id: o.id, status: "Cancelled" },
                "Order cancelled with a reversing entry",
              )
            }
          >
            Cancel order
          </button>
        )}
      </div>
    </Modal>
  );
}

function Courts({
  data,
  setModal,
  customer = false,
}: Common & { customer?: boolean }) {
  const [date, setDate] = useState(todayIST()),
    [court, setCourt] = useState("All courts"),
    [layout, setLayout] = useState("Calendar");
  const courts = courtConfig(data.settings);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClockTick((v) => v + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const names = courts.filter((c) => c.active).map((c) => c.name);
  const opening = Math.min(...courts.map((c) => c.open));
  const closing = Math.max(...courts.map((c) => c.close));
  const hours = courts
    .filter((c) => c.active)
    .reduce((sum, c) => sum + (c.close - c.open) / 60, 0);
  useEffect(() => {
    if (date !== todayIST()) {
      if (calendarRef.current) calendarRef.current.scrollTop = 0;
      return;
    }
    const hours = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(new Date())
      .split(":")
      .map(Number);
    const index = Math.max(
      0,
      Math.floor((hours[0] * 60 + hours[1] - opening) / 30) - 1,
    );
    if (calendarRef.current) calendarRef.current.scrollTop = index * 61;
  }, [date, opening]);
  const bookings = data.bookings.filter(
    (b) => b.date === date && (court === "All courts" || b.court === court),
  );
  const active = bookings.filter((b) => b.status !== "Cancelled");
  const dayOffset = (n: number) =>
    todayIST(
      new Date(new Date(date + "T12:00:00+05:30").getTime() + n * 86400000),
    );
  return (
    <div className={customer ? "customer-booking" : ""}>
      <PageHeading
        eyebrow={customer ? "A LITTLE FRIENDLY COMPETITION" : undefined}
        title={
          customer
            ? "Make time for a good rally."
            : "More rallies. Happier days."
        }
        description={
          customer
            ? `${courts.length} courts. Good company. Your next favourite game.`
            : "Your courts, your community, all in one calendar."
        }
      >
        <button
          className="btn primary"
          onClick={() => setModal({ type: "booking", value: { date } })}
        >
          <Plus size={16} />
          {customer ? "Find your court" : "New booking"}
        </button>
      </PageHeading>
      {customer && (
        <div className="booking-intro">
          <div>
            <Leaf size={19} />
            <b>Four places to play</b>
            <span>{courts.length} pickleball courts</span>
          </div>
          <div>
            <Clock size={19} />
            <b>Your kind of time</b>
            <span>30, 60, 90 or 120-minute sessions</span>
          </div>
          <div>
            <Wallet size={19} />
            <b>
              From {money(Math.min(...courts.map((c) => c.baseRate)))} / hour
            </b>
            <span>Peak rates apply · tax added at checkout</span>
          </div>
        </div>
      )}
      {!customer && (
        <div className="stats-grid three">
          <Stat
            title="Bookings on this day"
            value={String(active.length).padStart(2, "0")}
            icon={CalendarDays}
            note="a little friendly competition"
          />
          <Stat
            title="Court revenue"
            value={money(active.reduce((s, b) => s + b.total, 0))}
            icon={Wallet}
            color="sand"
            note="including demo tax"
          />
          <Stat
            title="Court utilisation"
            value={`${Math.round((active.reduce((s, b) => s + b.duration, 0) / (Math.max(1, hours) * 60)) * 100)}%`}
            icon={Activity}
            color="olive"
            note={`of ${hours} available court hours`}
          />
        </div>
      )}
      <section className="panel court-calendar">
        <div className="calendar-toolbar">
          <div className="row">
            <button
              className="icon-btn bordered"
              aria-label="Previous day"
              onClick={() => setDate(dayOffset(-1))}
            >
              <ChevronLeft size={17} />
            </button>
            <input
              aria-label="Court calendar date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              className="icon-btn bordered"
              aria-label="Next day"
              onClick={() => setDate(dayOffset(1))}
            >
              <ChevronRight size={17} />
            </button>
            <button
              className="btn secondary small"
              onClick={() => setDate(todayIST())}
            >
              Today
            </button>
          </div>
          <div className="row">
            <select
              aria-label="Filter court"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
            >
              <option>All courts</option>
              {courts.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            <div className="segmented">
              {["Calendar", "List"].map((l) => (
                <button
                  className={layout === l ? "active" : ""}
                  key={l}
                  onClick={() => setLayout(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        {layout === "Calendar" ? (
          <div className="calendar-scroll" ref={calendarRef}>
            <div
              className="calendar-grid"
              style={{
                gridTemplateColumns: `76px repeat(${court === "All courts" ? courts.length : 1},minmax(220px,1fr))`,
              }}
            >
              <div className="calendar-time-head">IST</div>
              {(court === "All courts"
                ? courts.map((c) => c.name)
                : [court]
              ).map((c) => (
                <div className="calendar-court-head" key={c}>
                  <span className="tiny-dot" />
                  {c}
                  <small>Pickleball · Book online</small>
                </div>
              ))}
              {Array.from(
                { length: (closing - opening) / 30 },
                (_, n) => opening + n * 30,
              ).map((start) => (
                <div className="calendar-row" key={start}>
                  <div className="calendar-time">{timeLabel(start)}</div>
                  {(court === "All courts"
                    ? courts.map((c) => c.name)
                    : [court]
                  ).map((c) => {
                    const b = active.find(
                      (b) =>
                        b.court === c &&
                        b.start < start + 30 &&
                        b.start + b.duration > start,
                    );
                    const past =
                      new Date(
                        `${date}T${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}:00+05:30`,
                      ).getTime() < Date.now();
                    return (
                      <div key={c} className="calendar-cell">
                        {b ? (
                          <button
                            className={`calendar-event ${b.status.toLowerCase().replaceAll(" ", "-")}`}
                            onClick={() =>
                              setModal({ type: "bookingDetail", value: b })
                            }
                          >
                            <b>{customer ? "Reserved" : b.customer}</b>
                            <span>
                              {timeLabel(b.start)} –{" "}
                              {timeLabel(b.start + b.duration)}{" "}
                              <span>
                                · {customer ? "Booked" : `${b.players} players`}
                              </span>
                            </span>
                            {!customer && <small>{b.status}</small>}
                          </button>
                        ) : (
                          <button
                            disabled={
                              past ||
                              !courts.find((court) => court.name === c)
                                ?.active ||
                              start <
                                (courts.find((court) => court.name === c)
                                  ?.open ?? 0) ||
                              start >=
                                (courts.find((court) => court.name === c)
                                  ?.close ?? 0)
                            }
                            className="free-slot"
                            onClick={() =>
                              setModal({
                                type: "booking",
                                value: { date, court: c, start, duration: 30 },
                              })
                            }
                          >
                            {past ? (
                              <span>—</span>
                            ) : (
                              <>
                                <Plus size={14} />
                                <span>Available</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>{customer ? "Court" : "Customer"}</th>
                  <th>Time</th>
                  <th>Players</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.id}</b>
                      <small>{b.court}</small>
                    </td>
                    <td>{customer ? b.court : b.customer}</td>
                    <td>
                      {timeLabel(b.start)} – {timeLabel(b.start + b.duration)}
                    </td>
                    <td>{b.players}</td>
                    <td>{money(b.total)}</td>
                    <td>
                      <Badge>{b.status}</Badge>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label="View booking"
                        onClick={() =>
                          setModal({ type: "bookingDetail", value: b })
                        }
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bookings.length && (
              <Empty
                title="A day full of possibilities"
                detail="Book a court and start something good."
              />
            )}
          </div>
        )}
        <div className="calendar-legend">
          <span>
            <i className="legend-dot cafe" />
            Confirmed
          </span>
          <span>
            <i className="legend-dot court" />
            Checked in
          </span>
          <span>
            <i className="legend-dot pale" />
            Available
          </span>
          <small>
            IST · {timeLabel(opening)}–{timeLabel(closing)} · Live availability
          </small>
        </div>
      </section>
    </div>
  );
}
function BookingForm({ data, initial = {}, act, busy, close, done }: any) {
  const courts = courtConfig(data.settings).filter((c) => c.active);
  const [, tickBookingClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tickBookingClock((v) => v + 1), 15000);
    return () => clearInterval(timer);
  }, []);
  const [date, setDate] = useState(initial.date || todayIST()),
    [court, setCourt] = useState(initial.court || courts[0]?.name || ""),
    [duration, setDuration] = useState(initial.duration || 60),
    [start, setStart] = useState<number | null>(initial.start ?? null),
    [equipment, setEquipment] = useState(false),
    [error, setError] = useState("");
  const requestKey = useRef(crypto.randomUUID());
  const config = courts.find((c) => c.name === court);
  const blocked = (s: number) =>
    bookingSlotAvailability(config, date, s, duration, data.bookings) !==
    "Available";
  const price =
    start === null ? 0 : quoteBooking(start, duration, equipment, date, config);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (start === null || blocked(start)) {
      setError("Choose an available time for your game.");
      return;
    }
    const f = new FormData(e.currentTarget);
    try {
      const b = await act("booking", {
        date,
        court,
        source: initial.reviewOnly ? "Website" : "Admin",
        duration,
        start,
        equipment,
        players: Number(f.get("players")),
        customer: f.get("customer"),
        phone: f.get("phone"),
        email: f.get("email") || "",
        marketingOptIn: f.get("marketingOptIn") === "on",
        requestKey: requestKey.current,
      });
      done(b);
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <Modal
      title={
        initial.reviewOnly ? "Confirm your booking" : "A little court time."
      }
      close={close}
      wide={!initial.reviewOnly}
      className={initial.reviewOnly ? "court-confirm-modal" : ""}
    >
      <form
        onSubmit={submit}
        className={initial.reviewOnly ? "booking-confirm-form" : "booking-form"}
      >
        {initial.reviewOnly && (
          <div className="booking-selected-session">
            <BlueCourt />
            <div>
              <b>{court}</b>
              <p>
                {new Date(date + "T12:00:00+05:30").toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  },
                )}{" "}
                ·{" "}
                {start !== null
                  ? `${timeLabel(start)} – ${timeLabel(start + duration)}`
                  : "Choose a time"}
              </p>
            </div>
          </div>
        )}
        {!initial.reviewOnly && (
          <div className="booking-form-left">
            <div className="booking-court-art">
              <CourtDrawing />
              <div>
                <span className="eyebrow">GOOD GAMES AHEAD</span>
                <h3>Your next rally starts here.</h3>
                <p>Bring your favourite people. We have four courts ready.</p>
              </div>
            </div>
            <div className="form-grid">
              <Field label="Pick your day">
                <input
                  type="date"
                  min={todayIST()}
                  max={todayIST(new Date(Date.now() + 30 * 86400000))}
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setStart(null);
                  }}
                />
              </Field>
              <Field label="Your court">
                <select
                  value={court}
                  onChange={(e) => {
                    setCourt(e.target.value);
                    setStart(null);
                  }}
                >
                  {courts.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="How long shall we play?">
              <div className="option-grid four">
                {[30, 60, 90, 120].map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={duration === d ? "chosen" : ""}
                    onClick={() => {
                      setDuration(d);
                      setStart(null);
                    }}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Choose a start time · IST">
              <div className="time-slots">
                {Array.from(
                  {
                    length:
                      ((config?.close ?? 1320) - (config?.open ?? 360)) / 30,
                  },
                  (_, n) => (config?.open ?? 360) + n * 30,
                ).map((s) => (
                  <button
                    type="button"
                    key={s}
                    disabled={blocked(s)}
                    className={start === s ? "chosen" : ""}
                    onClick={() => setStart(s)}
                  >
                    {timeLabel(s)}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}
        <div className="checkout-summary">
          <h3>A game worth making time for.</h3>
          <Field label="Booking name">
            <input
              name="customer"
              defaultValue={
                initial.reviewOnly ? data.access?.customer?.name || "" : ""
              }
              required
              minLength={2}
              placeholder="Your name"
            />
          </Field>
          <Field label="Mobile number">
            <input
              name="phone"
              defaultValue={
                initial.reviewOnly ? data.access?.customer?.phone || "" : ""
              }
              readOnly={
                initial.reviewOnly && Boolean(data.access?.customer?.phone)
              }
              required
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
            />
          </Field>
          <Field label="How many players?">
            <select name="players" defaultValue="4">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field
            label={
              initial.reviewOnly
                ? "Email address for confirmation and bill"
                : "Email address (optional)"
            }
          >
            <input
              name="email"
              type="email"
              maxLength={160}
              autoComplete="email"
              required={Boolean(initial.reviewOnly)}
              placeholder="you@example.com"
            />
          </Field>
          <label className="check-field">
            <input name="marketingOptIn" type="checkbox" />
            Send me offers and events on WhatsApp (optional)
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={equipment}
              onChange={(e) => setEquipment(e.target.checked)}
            />
            <span>Paddle rental</span>
            <b>+ {money(config?.equipmentRate ?? 10000)}</b>
          </label>
          <div className="summary-lines">
            <div>
              <span>Court</span>
              <b>{court}</b>
            </div>
            <div>
              <span>Session</span>
              <span>{duration} minutes</span>
            </div>
            {start !== null && (
              <div>
                <span>Start time</span>
                <span>{timeLabel(start)}</span>
              </div>
            )}
            <div className="total-line">
              <b>Total, incl. {config?.taxRate ?? 18}% tax</b>
              <strong>{money(price)}</strong>
            </div>
          </div>
          <p className="micro-copy">
            Off-peak {money(config?.baseRate ?? 60000)}/hr · Peak{" "}
            {money(config?.peakRate ?? 80000)}/hr.
            <br />
            Cancellation: full refund 12h ahead, 50% at 4–12h.
          </p>
          <div className="notice">
            <Info size={15} />
            <p>Demo booking. No payment is collected.</p>
          </div>
          {initial.reviewOnly && start !== null && blocked(start) && (
            <p className="form-error" role="status">
              This session is no longer available. Close this window and choose
              another time.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn primary full"
            type="submit"
            disabled={busy || start === null || blocked(start)}
          >
            {busy ? "Reserving your court…" : "Confirm demo booking"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function BookingDetail({
  booking: b,
  close,
  admin,
  mutate,
  busy,
  act,
  onReceipt,
}: any) {
  return (
    <Modal title={`Booking ${b.id}`} close={close}>
      <div className="booking-detail-art">
        {admin ? <CourtDrawing /> : <BlueCourt />}
      </div>
      <div className="receipt-hero">
        <h3>
          {b.status === "Completed"
            ? "Game completed. Your bill is ready."
            : b.status === "Cancelled"
              ? "This booking was cancelled by the admin team."
              : "Your court is reserved."}
        </h3>
        <p>
          {b.customer} · {b.players} players
        </p>
        <Badge>{b.status}</Badge>
      </div>
      <div className="booking-receipt-actions">
        <DownloadBill record={b} kind="booking" />
        {admin && <WhatsAppShare record={b} kind="booking" />}
        <button className="btn primary full" onClick={() => onReceipt(b)}>
          <Receipt size={16} />
          {b.status === "Completed"
            ? "Save / print court bill"
            : "Save / print booking receipt"}
        </button>
      </div>
      <div className="booking-details">
        <div>
          <span>Contact</span>
          <a href={`tel:${b.phone}`}>{b.phone}</a>
        </div>
        <div>
          <span>Court</span>
          <b>{b.court} · Pickleball</b>
        </div>
        <div>
          <span>Date</span>
          <b>
            {new Date(b.date + "T12:00:00+05:30").toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </b>
        </div>
        <div>
          <span>Time</span>
          <b>
            {timeLabel(b.start)} – {timeLabel(b.start + b.duration)}
          </b>
        </div>
        <div>
          <span>Equipment</span>
          <b>
            {b.equipment ? "Paddle rental included" : "Bring your own paddles"}
          </b>
        </div>
        <div className="total-line">
          <span>Demo total, incl. tax</span>
          <b>{money(b.total)}</b>
        </div>
      </div>
      {admin && ["Confirmed", "Checked in"].includes(b.status) && (
        <button
          className="btn primary full"
          disabled={busy}
          onClick={async () => {
            try {
              const updated = await act(
                "bookingStatus",
                {
                  id: b.id,
                  status: b.status === "Confirmed" ? "Checked in" : "Completed",
                },
                b.status === "Confirmed"
                  ? "Players checked in"
                  : "Game completed · bill ready",
              );
              if (b.status === "Checked in") onReceipt(updated);
            } catch {}
          }}
        >
          {b.status === "Confirmed"
            ? "Check players in"
            : "Complete game & open bill"}
          <Check size={16} />
        </button>
      )}
      {admin && b.status === "Confirmed" && (
        <button
          className="text-btn danger-text full cancel-booking"
          disabled={busy}
          onClick={() =>
            mutate(
              "bookingStatus",
              { id: b.id, status: "Cancelled" },
              "Booking cancelled. Applicable demo refund recorded.",
            )
          }
        >
          Cancel booking
        </button>
      )}
      <p className="micro-copy">
        Keep this receipt and show your booking reference at the court desk.
        <br />
        All payments in this preview are simulated.
      </p>
    </Modal>
  );
}

function Inventory({ data, setModal }: Common) {
  const [tab, setTab] = useState("Stock overview"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All stock"),
    [ledgerReason, setLedgerReason] = useState(""),
    [ledgerDate, setLedgerDate] = useState("");
  const stock = data.inventory.filter(
    (i) =>
      i.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All stock" || i.quantity <= i.reorder),
  );
  return (
    <>
      <PageHeading
        title="A well-stocked kind of day."
        description="Every ingredient, every cup. Know what’s on your shelves."
      >
        <button
          className="btn secondary"
          onClick={() => exportCSV("inventory", stock)}
        >
          <Download size={16} />
          Export stock
        </button>
        <button
          className="btn primary"
          onClick={() => setModal({ type: "stock", value: data.inventory[0] })}
        >
          <Plus size={16} />
          Record movement
        </button>
      </PageHeading>
      <div className="stats-grid three">
        <Stat
          title="Inventory value"
          value={money(
            data.inventory.reduce((s, i) => s + i.quantity * i.cost, 0),
          )}
          icon={Package}
          note="at recorded unit cost"
        />
        <Stat
          title="Items to replenish"
          value={String(
            data.inventory.filter((i) => i.quantity <= i.reorder).length,
          ).padStart(2, "0")}
          icon={AlertTriangle}
          color="sand"
          note="at or below reorder level"
        />
        <Stat
          title="Recipes connected"
          value={String(data.products.length).padStart(2, "0")}
          icon={BookOpen}
          color="olive"
          note="stock deducted on every new sale"
        />
      </div>
      <div className="tabs">
        {["Stock overview", "Stock ledger", "Recipes"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="filter-bar">
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search inventory"
              placeholder="Search ingredients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Stock status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All stock</option>
            <option>Low stock</option>
          </select>
          {tab === "Stock ledger" && (
            <>
              <select
                aria-label="Movement reason"
                value={ledgerReason}
                onChange={(e) => setLedgerReason(e.target.value)}
              >
                <option value="">All movements</option>
                {[...new Set(data.stockLedger.map((l) => l.reason))]
                  .sort()
                  .map((r) => (
                    <option key={r}>{r}</option>
                  ))}
              </select>
              <input
                type="date"
                aria-label="Stock movement date"
                value={ledgerDate}
                onChange={(e) => setLedgerDate(e.target.value)}
              />
            </>
          )}
        </div>
        {tab === "Stock overview" ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>In stock</th>
                  <th>Reorder at</th>
                  <th>Stock value</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stock.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="row">
                        <span className="table-icon">
                          <Package size={17} />
                        </span>
                        <div>
                          <b>{i.name}</b>
                          <small>SKU-{i.id.toUpperCase()}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <b>{i.quantity.toLocaleString("en-IN")}</b> {i.unit}
                    </td>
                    <td>
                      {i.reorder.toLocaleString("en-IN")} {i.unit}
                    </td>
                    <td>{money(i.quantity * i.cost)}</td>
                    <td>
                      <Badge
                        tone={
                          i.quantity === 0
                            ? "red"
                            : i.quantity <= i.reorder
                              ? "amber"
                              : "green"
                        }
                      >
                        {i.quantity === 0
                          ? "Out of stock"
                          : i.quantity <= i.reorder
                            ? "Low stock"
                            : "In stock"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="btn secondary small"
                        onClick={() => setModal({ type: "stock", value: i })}
                      >
                        Adjust <Plus size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "Stock ledger" ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Ingredient</th>
                  <th>Movement</th>
                  <th>Reason</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {data.stockLedger
                  .filter(
                    (l) =>
                      (!ledgerReason || l.reason === ledgerReason) &&
                      (!ledgerDate ||
                        todayIST(new Date(l.createdAt)) === ledgerDate) &&
                      data.inventory
                        .find((i) => i.id === l.item)
                        ?.name.toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .slice(0, 150)
                  .map((l) => (
                    <tr key={l.id}>
                      <td>
                        {new Date(l.createdAt).toLocaleDateString("en-IN")}
                        <small>{clock(l.createdAt)}</small>
                      </td>
                      <td>
                        {data.inventory.find((i) => i.id === l.item)?.name}
                      </td>
                      <td
                        className={l.delta > 0 ? "green-text" : "danger-text"}
                      >
                        <b>
                          {l.delta > 0 ? "+" : ""}
                          {l.delta}
                        </b>
                      </td>
                      <td>{l.reason}</td>
                      <td className="muted">{l.reference}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="recipe-grid">
            {data.products
              .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
              .map((p) => (
                <div className="recipe-card" key={p.id}>
                  <div className="row">
                    <img src={img(p.id, p.image)} alt={p.name} />
                    <div>
                      <h3>{p.name}</h3>
                      <small>Per serving · Editable recipe</small>
                    </div>
                  </div>
                  <div>
                    {Object.entries(p.recipe).map(([id, q]) => {
                      const s = data.inventory.find((i) => i.id === id);
                      return (
                        <div className="recipe-line" key={id}>
                          <span>{s?.name}</span>
                          <b>
                            {q} {s?.unit}
                          </b>
                        </div>
                      );
                    })}
                  </div>
                  <div className="recipe-cost">
                    <span>Ingredient cost</span>
                    <b>
                      {money(
                        Object.entries(p.recipe).reduce(
                          (sum, [id, q]) =>
                            sum +
                            q *
                              (data.inventory.find((i) => i.id === id)?.cost ||
                                0),
                          0,
                        ),
                      )}
                    </b>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </>
  );
}
function StockForm({ stock, act, busy, close }: any) {
  const [reason, setReason] = useState("Purchase"),
    [error, setError] = useState("");
  return (
    <Modal title="Keep your shelves in sync." close={close}>
      <div className="form-product">
        <span className="table-icon">
          <Package size={24} />
        </span>
        <div>
          <h3>{stock.name}</h3>
          <p>
            On hand: {stock.quantity.toLocaleString("en-IN")} {stock.unit}
          </p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          let quantity = Number(f.get("quantity"));
          if (reason === "Wastage") quantity = -Math.abs(quantity);
          try {
            await act(
              "stock",
              { id: stock.id, quantity, reason },
              "Stock movement recorded",
            );
            close();
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <Field label="Movement type">
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Purchase</option>
            <option>Wastage</option>
            <option>Physical count</option>
          </select>
        </Field>
        <Field
          label={`Quantity to ${reason === "Wastage" ? "remove" : reason === "Physical count" ? "add or subtract" : "add"} (${stock.unit})`}
        >
          <input
            name="quantity"
            type="number"
            step="1"
            min={reason === "Physical count" ? -stock.quantity : 1}
            max="100000"
            required
            placeholder={
              reason === "Physical count" ? "e.g. -20 or 100" : "e.g. 1000"
            }
          />
        </Field>
        <p className="note">
          Every movement adds a stock ledger line and a balanced accounting
          entry. Physical count uses the difference from your current stock.
        </p>
        {error && <p className="form-error">{error}</p>}
        <button className="btn primary full" disabled={busy} type="submit">
          {busy ? "Saving…" : "Record stock movement"}
          <Check size={16} />
        </button>
      </form>
    </Modal>
  );
}
function Products({ data, setModal, mutate, busy }: Common) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All items"),
    [visibility, setVisibility] = useState("Active"),
    [diet, setDiet] = useState("");
  const rows = data.products.filter(
    (p) =>
      (visibility === "All" ||
        (visibility === "Active" ? p.active : !p.active)) &&
      (!diet || p.diet === diet) &&
      (category === "All items" || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="The Lost Origin menu."
        description="Thoughtfully made. Beautifully presented. Ready for your customers."
      >
        <button
          className="btn secondary"
          onClick={() => exportCSV("menu-products", rows)}
        >
          <Download size={16} />
          Export menu
        </button>
      </PageHeading>
      <section className="panel">
        <div className="filter-bar">
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search products"
              placeholder="Search your menu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Product category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["All items", ...categories(data.products)].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Product visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option>Active</option>
            <option>Hidden</option>
            <option>All</option>
          </select>
          <select
            aria-label="Product diet"
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
          >
            <option value="">All diets</option>
            <option value="veg">Vegetarian</option>
            <option value="egg">Contains egg</option>
            <option value="nonveg">Non-vegetarian</option>
          </select>
          <span className="muted">{rows.length} items</span>
        </div>
        <div className="product-admin-grid">
          {rows.map((p) => (
            <div className="product-admin-card" key={p.id}>
              <img src={img(p.id, p.image)} alt={p.name} />
              <div>
                <div className="row space-between">
                  <span className="eyebrow">{p.category}</span>
                  <Badge
                    tone={available(p, data.inventory) ? "green" : "amber"}
                  >
                    {available(p, data.inventory)
                      ? "Available"
                      : !p.active
                        ? "Hidden"
                        : "Sold out"}
                  </Badge>
                </div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="product-channel-controls">
                  {(["pos", "website"] as const).map((channel) => (
                    <button
                      key={channel}
                      className={`channel-toggle ${productVisible(p, channel) ? "enabled" : ""}`}
                      disabled={busy}
                      aria-pressed={productVisible(p, channel)}
                      onClick={() =>
                        mutate(
                          "productVisibility",
                          {
                            id: p.id,
                            channel,
                            visible: !productVisible(p, channel),
                          },
                          `${p.name} visibility updated`,
                        )
                      }
                    >
                      {channel === "pos" ? (
                        <Monitor size={14} />
                      ) : (
                        <Globe size={14} />
                      )}
                      <span>
                        {productVisible(p, channel) ? "Shown on" : "Show on"}{" "}
                        {channel === "pos" ? "POS" : "website"}
                      </span>
                      {productVisible(p, channel) && <Check size={13} />}
                    </button>
                  ))}
                </div>
                <div className="row space-between">
                  <b>{priceLabel(p)}</b>
                  <button
                    className="btn secondary small"
                    onClick={() => setModal({ type: "product", value: p })}
                  >
                    Edit product <SlidersHorizontal size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!rows.length && (
          <Empty
            title="Nothing on this shelf yet"
            detail="Try another search or category."
          />
        )}
      </section>
    </>
  );
}
function ProductForm({ product: p, act, busy, close, inventory = [] }: any) {
  const [active, setActive] = useState(!!p.active),
    [showOnPos, setShowOnPos] = useState(p.showOnPos !== 0),
    [showOnWebsite, setShowOnWebsite] = useState(p.showOnWebsite !== 0),
    [variants, setVariants] = useState(productVariants(p)),
    [recipe, setRecipe] = useState<Record<string, number>>({ ...p.recipe }),
    [error, setError] = useState("");
  return (
    <Modal title={`Edit ${p.name}`} close={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          try {
            await act(
              "product",
              {
                id: p.id,
                name: form.get("name"),
                price: variants[0].price,
                variants,
                recipe,
                ingredients: parseIngredients(
                  String(form.get("ingredients") || ""),
                ),
                active: active ? 1 : 0,
                showOnPos: showOnPos ? 1 : 0,
                showOnWebsite: showOnWebsite ? 1 : 0,
              },
              "Menu and recipe updated across all screens",
            );
            close();
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <Field label="Product name">
          <input name="name" required minLength={2} defaultValue={p.name} />
        </Field>
        <Field label="Customer-facing ingredients">
          <textarea
            name="ingredients"
            rows={3}
            maxLength={3000}
            defaultValue={productIngredients(p, inventory).join(", ")}
            placeholder="Enter ingredients, separated by commas or new lines"
          />
        </Field>
        <p className="note">
          Shown when a customer opens this item. Enter the complete ingredient
          list used by your kitchen.
        </p>
        <div className="form-grid">
          {variants.map((v, i) => (
            <Field
              key={v.label}
              label={`${v.label === "Standard" ? "Menu" : v.label} price (₹, before tax)`}
            >
              <input
                type="number"
                min="1"
                max="10000"
                step="0.01"
                required
                value={v.price / 100}
                onChange={(e) =>
                  setVariants((current) =>
                    current.map((item, n) =>
                      n === i
                        ? {
                            ...item,
                            price: Math.round(Number(e.target.value) * 100),
                          }
                        : item,
                    ),
                  )
                }
              />
            </Field>
          ))}
        </div>
        <label className="check-field">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>Active product</span>
        </label>
        <div className="product-form-channels">
          <label className="check-field">
            <input
              type="checkbox"
              checked={showOnPos}
              onChange={(e) => setShowOnPos(e.target.checked)}
            />
            <span>Show on POS</span>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={showOnWebsite}
              onChange={(e) => setShowOnWebsite(e.target.checked)}
            />
            <span>Show on website</span>
          </label>
        </div>
        <h3 className="recipe-edit-title">Recipe & stock deduction</h3>
        <p className="note">
          Initial recipe quantities and opening stock are provisional. Enter
          your actual quantities here; each new sale deducts these amounts.
        </p>
        {Object.entries(recipe).map(([id, quantity]) => (
          <Field
            key={id}
            label={`${inventory.find((s: any) => s.id === id)?.name || id} (${inventory.find((s: any) => s.id === id)?.unit || "units"})`}
          >
            <input
              type="number"
              min="0"
              max="100000"
              step="1"
              required
              value={quantity}
              onChange={(e) =>
                setRecipe((current) => ({
                  ...current,
                  [id]: Number(e.target.value),
                }))
              }
            />
          </Field>
        ))}
        {error && <p className="form-error">{error}</p>}
        <button disabled={busy} type="submit" className="btn primary full">
          Save product <Check size={16} />
        </button>
      </form>
    </Modal>
  );
}

function Payments({ data }: Common) {
  const [mode, setMode] = useState("All modes"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("All statuses");
  const rows = data.payments.filter(
    (p) =>
      (mode === "All modes" || p.mode === mode) &&
      (status === "All statuses" || p.status === status) &&
      (p.reference + p.id).toLowerCase().includes(query.toLowerCase()),
  );
  const collected = rows
    .filter((p) => !["Pending", "Void"].includes(p.status))
    .reduce((s, p) => s + p.amount, 0);
  return (
    <>
      <PageHeading
        title="Every rupee, accounted for."
        description="One ledger for the café, online orders and your courts."
      >
        <button
          className="btn secondary"
          onClick={() => exportCSV("payment-ledger", rows)}
        >
          <Download size={16} />
          Export ledger
        </button>
      </PageHeading>
      <div className="notice integration-notice">
        <Info size={18} />
        <div>
          <b>Payment preview</b>
          <p>
            These are simulated transactions. A live gateway, verified webhooks
            and settlement reconciliation are not connected.
          </p>
        </div>
        <Badge tone="amber">Demo mode</Badge>
      </div>
      <div className="stats-grid three">
        <Stat
          title="Net demo collections"
          value={money(collected)}
          icon={Wallet}
          note="all sources, after reversals"
        />
        <Stat
          title="Pending at counter"
          value={money(
            rows
              .filter((p) => p.status === "Pending")
              .reduce((s, p) => s + p.amount, 0),
          )}
          icon={Clock}
          color="sand"
          note="collect from the order details"
        />
        <Stat
          title="Demo refunds"
          value={money(
            -rows
              .filter((p) => p.amount < 0 && p.status !== "Void")
              .reduce((s, p) => s + p.amount, 0),
          )}
          icon={RefreshCw}
          color="terracotta"
          note="recorded as reversing payments"
        />
      </div>
      <section className="panel">
        <div className="filter-bar">
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search payments"
              placeholder="Search reference…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            value={mode}
            aria-label="Payment mode"
            onChange={(e) => setMode(e.target.value)}
          >
            {["All modes", "UPI", "Cash", "Card", "Pay at counter"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select
            value={status}
            aria-label="Payment status"
            onChange={(e) => setStatus(e.target.value)}
          >
            {[
              "All statuses",
              "Demo paid",
              "Pending",
              "Demo refunded",
              "Demo collected",
              "Void",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="muted">{rows.length} entries</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Source</th>
                <th>Mode</th>
                <th>Date & time</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 150).map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.reference}</b>
                    <small>{p.id.slice(0, 20)}</small>
                  </td>
                  <td>{p.source}</td>
                  <td>
                    <span className="source-tag">
                      {p.mode === "Cash" ? (
                        <Wallet size={12} />
                      ) : (
                        <CreditCard size={12} />
                      )}{" "}
                      {p.mode}
                    </span>
                  </td>
                  <td>
                    {new Date(p.createdAt).toLocaleDateString("en-IN")}
                    <small>{clock(p.createdAt)}</small>
                  </td>
                  <td className={p.amount < 0 ? "danger-text" : ""}>
                    <b>{money(p.amount)}</b>
                  </td>
                  <td>
                    <Badge
                      tone={
                        p.status === "Pending"
                          ? "amber"
                          : p.amount < 0
                            ? "neutral"
                            : "green"
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <Empty
              title="No matching payments"
              detail="Try another reference, mode or status."
            />
          )}
        </div>
      </section>
    </>
  );
}
function journalTotals(data: State) {
  const accounts: Record<string, { debit: number; credit: number }> = {};
  data.journals.forEach((j) =>
    j.lines.forEach((l) => {
      if (!accounts[l.account]) accounts[l.account] = { debit: 0, credit: 0 };
      accounts[l.account].debit += l.debit;
      accounts[l.account].credit += l.credit;
    }),
  );
  const revenue = Object.entries(accounts)
    .filter(([a]) => a.endsWith("revenue"))
    .reduce((s, [, v]) => s + v.credit - v.debit, 0);
  const expense = Object.entries(accounts)
    .filter(([a]) => a.endsWith("expense") || a === "Cost of goods sold")
    .reduce((s, [, v]) => s + v.debit - v.credit, 0);
  return { accounts, revenue, expense, profit: revenue - expense };
}
function Accounting({ data, setModal }: Common) {
  const [tab, setTab] = useState("Profit & loss");
  const totals = journalTotals(data);
  return (
    <>
      <PageHeading
        title="A clear picture of your business."
        description="Balanced books, thoughtful decisions and a little peace of mind."
      >
        <button
          className="btn secondary"
          onClick={() => exportCSV("journal-entries", data.journals)}
        >
          <Download size={16} />
          Export books
        </button>
        <button
          className="btn primary"
          onClick={() => setModal({ type: "expense" })}
        >
          <Plus size={16} />
          Record expense
        </button>
      </PageHeading>
      <div className="stats-grid three">
        <Stat
          title="Net revenue, before tax"
          value={money(totals.revenue)}
          icon={TrendingUp}
          note="café and court revenue"
        />
        <Stat
          title="Recorded costs & expenses"
          value={money(totals.expense)}
          icon={Receipt}
          color="sand"
          note="based on posted journal entries"
        />
        <Stat
          title="Recorded profit"
          value={money(totals.profit)}
          icon={Wallet}
          color="olive"
          note="before unrecorded operating costs"
        />
      </div>
      <div className="tabs">
        {["Profit & loss", "Journal entries", "Trial balance", "Expenses"].map(
          (t) => (
            <button
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ),
        )}
      </div>
      <section className="panel">
        {tab === "Profit & loss" ? (
          <div className="pnl">
            <div className="panel-heading">
              <div>
                <h2>Profit & loss statement</h2>
                <p>Filtered recorded activity · ₹ INR</p>
              </div>
              <Badge tone="green">Balanced books</Badge>
            </div>
            <h3>Revenue</h3>
            {Object.entries(totals.accounts)
              .filter(([a]) => a.endsWith("revenue"))
              .map(([a, v]) => (
                <div className="pnl-line" key={a}>
                  <span>{a}</span>
                  <b>{money(v.credit - v.debit)}</b>
                </div>
              ))}
            <div className="pnl-line subtotal">
              <b>Total revenue</b>
              <b>{money(totals.revenue)}</b>
            </div>
            <h3>Costs & expenses</h3>
            {Object.entries(totals.accounts)
              .filter(
                ([a]) => a.endsWith("expense") || a === "Cost of goods sold",
              )
              .map(([a, v]) => (
                <div className="pnl-line" key={a}>
                  <span>{a}</span>
                  <b>{money(v.debit - v.credit)}</b>
                </div>
              ))}
            {!totals.expense && (
              <p className="note">
                No operating expenses recorded yet. Add rent, utilities or
                supplies to complete the picture.
              </p>
            )}
            <div className="pnl-line profit">
              <b>Recorded profit</b>
              <strong>{money(totals.profit)}</strong>
            </div>
            <p className="note">
              Preview books include sample sales. Opening inventory, partner
              capital, bank balances and all operating costs must be reconciled
              before using financial reports for decisions.
            </p>
          </div>
        ) : tab === "Trial balance" ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Debit (₹)</th>
                  <th>Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(totals.accounts).map(([a, v]) => (
                  <tr key={a}>
                    <td>
                      <b>{a}</b>
                    </td>
                    <td>{money(Math.max(0, v.debit - v.credit))}</td>
                    <td>{money(Math.max(0, v.credit - v.debit))}</td>
                  </tr>
                ))}
                <tr className="table-total">
                  <td>Total</td>
                  <td>
                    {money(
                      Object.values(totals.accounts).reduce(
                        (s, v) => s + Math.max(0, v.debit - v.credit),
                        0,
                      ),
                    )}
                  </td>
                  <td>
                    {money(
                      Object.values(totals.accounts).reduce(
                        (s, v) => s + Math.max(0, v.credit - v.debit),
                        0,
                      ),
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : tab === "Expenses" ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <b>{e.description}</b>
                    </td>
                    <td>{e.category}</td>
                    <td>{new Date(e.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.expenses.length && (
              <Empty
                title="A clean slate for your expenses"
                detail="Record your first business expense to start tracking costs."
              />
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.journals.slice(0, 100).map((j) => (
                  <tr key={j.id}>
                    <td>
                      <b>{j.reference}</b>
                    </td>
                    <td>{j.description}</td>
                    <td>{new Date(j.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>{money(j.lines.reduce((s, l) => s + l.debit, 0))}</td>
                    <td>{money(j.lines.reduce((s, l) => s + l.credit, 0))}</td>
                    <td>
                      <Badge tone="green">Balanced</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
function ExpenseForm({ act, busy, close }: any) {
  const [error, setError] = useState("");
  return (
    <Modal title="Every little expense matters." close={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await act(
              "expense",
              {
                description: f.get("description"),
                category: f.get("category"),
                amount: Math.round(Number(f.get("amount")) * 100),
              },
              "Expense recorded with a balanced journal",
            );
            close();
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <Field label="What was it for?">
          <input
            name="description"
            required
            minLength={3}
            maxLength={150}
            placeholder="e.g. Electricity bill for November"
          />
        </Field>
        <div className="form-grid">
          <Field label="Category">
            <select name="category">
              {[
                "Rent",
                "Utilities",
                "Staff",
                "Supplies",
                "Maintenance",
                "Other",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount (₹)">
            <input
              name="amount"
              type="number"
              required
              min="1"
              step="0.01"
              max="50000"
              placeholder="0.00"
            />
          </Field>
        </div>
        <p className="note">
          Recorded against cash in hand. Expenses over ₹50,000 require a partner
          approval flow, which is not enabled in this preview.
        </p>
        {error && <p className="form-error">{error}</p>}
        <button className="btn primary full" disabled={busy} type="submit">
          Record expense <Check size={16} />
        </button>
      </form>
    </Modal>
  );
}
function Partners({ data, navigate }: Common) {
  const totals = journalTotals(data);
  const shares = data.settings.business.partnerShares || [34, 33, 33];
  const names = ["Karthik Saggidi", "Partner 02", "Partner 03"];
  return (
    <>
      <PageHeading
        title="Better, together."
        description="A shared business deserves a shared, transparent view."
      >
        <button
          className="btn secondary"
          onClick={() =>
            exportCSV(
              "partner-profit-allocation",
              names.map((name, i) => ({
                partner: name,
                share: shares[i],
                estimated_profit_paise: Math.round(
                  (totals.profit * shares[i]) / 100,
                ),
              })),
            )
          }
        >
          <Download size={16} />
          Export allocation
        </button>
        <button className="btn primary" onClick={() => navigate("settings")}>
          <Settings size={16} />
          Manage shares
        </button>
      </PageHeading>
      <div className="partner-banner">
        <Users size={30} />
        <div>
          <h2>Three partners. One good vision.</h2>
          <p>
            Profit shares are visible to everyone. Recorded profit:{" "}
            <b>{money(totals.profit)}</b>
          </p>
        </div>
        <span>
          100%<small>allocated</small>
        </span>
      </div>
      <div className="partner-grid">
        {names.map((name, i) => (
          <section className="panel partner-card" key={name}>
            <span className={`partner-avatar color-${i}`}>
              {i === 0 ? "KS" : `P${i + 1}`}
            </span>
            <h2>{name}</h2>
            <p>
              {i === 0
                ? "Lead partner"
                : "Partner · Configure name before launch"}
            </p>
            <div className="share-number">
              {shares[i]}
              <span>% ownership share</span>
            </div>
            <div className="partner-allocation">
              <span>Estimated profit allocation</span>
              <b>{money(Math.round((totals.profit * shares[i]) / 100))}</b>
            </div>
            <small>Informational estimate · no distribution posted</small>
          </section>
        ))}
      </div>
      <section className="panel approvals-panel">
        <div className="panel-heading">
          <h2>A little trust, backed by good controls.</h2>
        </div>
        <div className="approval-grid">
          <div>
            <CheckCircle2 size={21} />
            <h3>Shares always add to 100%</h3>
            <p>Change allocation rules in settings. Every update is logged.</p>
          </div>
          <div>
            <Landmark size={21} />
            <h3>Books you can follow</h3>
            <p>Review revenue, expenses and reversing entries in Accounting.</p>
            <button className="text-btn" onClick={() => navigate("accounting")}>
              Open accounting <ArrowRight size={14} />
            </button>
          </div>
          <div>
            <Users size={21} />
            <h3>Production partner controls</h3>
            <p>
              Capital accounts, drawings and multi-partner approvals are part of
              the remaining production work.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
function Campaigns({ data, busy, act }: Common & { act: any }) {
  return (
    <>
      <PageHeading
        title="Campaigns, your way."
        description="Manage the homepage ribbon, popup campaigns and visitor registrations."
      />
      <HeroCampaignEditor data={data} act={act} busy={busy} />
      <PopupCampaignEditor data={data} act={act} busy={busy} />
      <CampaignWhatsApp data={data} />
    </>
  );
}

function SettingsPage({
  data,
  act,
  busy,
  website,
  navigate,
}: Common & { act: any; website: boolean }) {
  const [tab, setTab] = useState(
      website ? "Website content" : "Business profile",
    ),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [uploadingHero, setUploadingHero] = useState(false);
  const b = data.settings.business;
  const [form, setForm] = useState({ ...b });
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setForm({ ...b });
  }, [b]);
  const update = (key: string, value: any) => {
    dirty.current = true;
    setSaved(false);
    setForm((f: any) => ({ ...f, [key]: value }));
  };
  const tabs = website
    ? ["Website content", "Footer & contact"]
    : [
        "Business profile",
        "Website content",
        "Footer & contact",
        "Ordering rules",
        "Courts",
        "Partner shares",
        "Security",
        "Integrations",
        "Audit log",
      ];
  return (
    <>
      <PageHeading
        title={
          website
            ? "A warm welcome, your way."
            : "The little details, all in place."
        }
        description={
          website
            ? "Keep your customer-facing content fresh without changing code."
            : "Your business rules, preferences and the people behind it."
        }
      ></PageHeading>
      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>
        <section className="panel settings-panel">
          {tab === "Security" ? (
            <SecuritySettings otpAvailable={data.access?.otpAvailable} />
          ) : tab === "Integrations" ? (
            <>
              <h2>Bring it all together.</h2>
              <p className="muted">
                Provider connections needed before a live launch.
              </p>
              <div className="integration-list">
                {[
                  [
                    "Payments",
                    "Razorpay, Cashfree or PayU",
                    "Verified webhooks and provider credentials required.",
                    CreditCard,
                  ],
                  [
                    "WhatsApp & email",
                    "QR linking and Nodemailer SMTP",
                    "Connect WhatsApp in its admin page. Configure SMTP securely in the communications service.",
                    MessageCircle,
                  ],
                  [
                    "Customer SMS login",
                    data.access?.otpAvailable
                      ? "SMS verification connected"
                      : "SMS delivery awaiting configuration",
                    "Phone verification, attempt limits and persistent customer sessions are implemented.",
                    Mail,
                  ],
                  [
                    "Thermal printers",
                    "58 mm / 80 mm receipt printers",
                    "Print-ready receipts use the browser print dialog.",
                    Printer,
                  ],
                  [
                    "Administrator security",
                    "Separate admin origin and password login",
                    "Change the admin password under Settings → Security. Sessions are checked on the server.",
                    Users,
                  ],
                ].map(([name, sub, desc, Icon]: any) => (
                  <div className="integration-row" key={name}>
                    <span className="table-icon">
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3>{name}</h3>
                      <b>{sub}</b>
                      <p>{desc}</p>
                    </div>
                    <Badge tone="amber">Setup required</Badge>
                  </div>
                ))}
              </div>
            </>
          ) : tab === "Audit log" ? (
            <>
              <h2>A transparent trail.</h2>
              <p className="muted">The latest 100 changes in your workspace.</p>
              <div className="audit-list">
                {data.auditLogs.map((a) => (
                  <div key={a.id}>
                    <span className="audit-dot" />
                    <div>
                      <b>{a.action}</b>
                      <p>{a.detail}</p>
                      <small>
                        {new Date(a.createdAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
                      </small>
                    </div>
                  </div>
                ))}
                {!data.auditLogs.length && (
                  <Empty
                    title="Your story starts here"
                    detail="New orders, updates and adjustments will appear in this log."
                  />
                )}
              </div>
            </>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (uploadingHero) return;
                setError("");
                try {
                  await act(
                    "settings",
                    { value: form },
                    "Your settings are saved",
                  );
                  dirty.current = false;
                  setSaved(true);
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              <h2>{tab}</h2>
              <p className="muted settings-description">
                {tab === "Website content"
                  ? "Changes appear immediately on your customer website."
                  : tab === "Partner shares"
                    ? "Allocation must always add to 100%. No distributions are posted automatically."
                    : "A few thoughtful settings for a smoother day."}
              </p>
              {tab === "Business profile" && (
                <>
                  <Field label="Business name">
                    <input
                      required
                      value={form.shopName}
                      onChange={(e) => update("shopName", e.target.value)}
                    />
                  </Field>
                  <Field label="Tagline">
                    <input
                      value={form.tagline}
                      onChange={(e) => update("tagline", e.target.value)}
                    />
                  </Field>
                  <Field label="Address">
                    <textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                    />
                  </Field>
                  <Field label="Contact phone">
                    <input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="GSTIN (optional)">
                      <input
                        maxLength={20}
                        value={form.gstin || ""}
                        onChange={(e) => update("gstin", e.target.value)}
                      />
                    </Field>
                    <Field label="FSSAI licence (optional)">
                      <input
                        maxLength={25}
                        value={form.fssai || ""}
                        onChange={(e) => update("fssai", e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Receipt printer paper">
                    <select
                      value={form.receiptWidth || 80}
                      onChange={(e) =>
                        update("receiptWidth", Number(e.target.value))
                      }
                    >
                      <option value={80}>80 mm thermal roll</option>
                      <option value={58}>58 mm thermal roll</option>
                    </select>
                  </Field>
                  <Field label="Receipt footer">
                    <input
                      maxLength={200}
                      value={form.receiptFooter || ""}
                      placeholder="Thank you for choosing Lost Origin."
                      onChange={(e) => update("receiptFooter", e.target.value)}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Opens at (IST)">
                      <input
                        type="time"
                        required
                        value={form.openTime}
                        onChange={(e) => update("openTime", e.target.value)}
                      />
                    </Field>
                    <Field label="Closes at (IST)">
                      <input
                        type="time"
                        required
                        value={form.closeTime}
                        onChange={(e) => update("closeTime", e.target.value)}
                      />
                    </Field>
                  </div>
                </>
              )}
              {tab === "Ordering rules" && (
                <>
                  <label className="toggle-setting">
                    <span>
                      <b>Accept online orders</b>
                      <small>
                        Pause when your team needs a little breathing room.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={!form.paused}
                      onChange={(e) => update("paused", !e.target.checked)}
                    />
                  </label>
                  <div className="form-grid">
                    <Field label="Preparation time (minutes)">
                      <input
                        type="number"
                        required
                        min="5"
                        max="120"
                        value={form.prepMinutes}
                        onChange={(e) =>
                          update("prepMinutes", Number(e.target.value))
                        }
                      />
                    </Field>
                    <Field label="Orders per 15-minute slot">
                      <input
                        type="number"
                        required
                        min="1"
                        max="100"
                        value={form.slotCapacity}
                        onChange={(e) =>
                          update("slotCapacity", Number(e.target.value))
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Café tax rate (%)">
                    <input
                      type="number"
                      required
                      min="0"
                      max="28"
                      step="0.01"
                      value={form.taxRate}
                      onChange={(e) =>
                        update("taxRate", Number(e.target.value))
                      }
                    />
                  </Field>
                  <p className="note">
                    This is a configurable demo calculation. Confirm your tax
                    setup with your accountant before launch. Advance orders are
                    limited to two days.
                  </p>
                </>
              )}
              {tab === "Footer & contact" && (
                <FooterSettings form={form} update={update} />
              )}
              {tab === "Website content" && (
                <>
                  <HeroEditor
                    products={data.products}
                    slides={heroSlides(form)}
                    update={(value) => update("heroSlides", value)}
                    onUploading={setUploadingHero}
                  />
                  <Field label="Homepage title (for screen readers)">
                    <textarea
                      required
                      rows={3}
                      value={form.headline}
                      onChange={(e) => update("headline", e.target.value)}
                    />
                  </Field>
                  <Field label="Tagline">
                    <input
                      value={form.tagline}
                      onChange={(e) => update("tagline", e.target.value)}
                    />
                  </Field>
                  <Field label="Announcement bar">
                    <textarea
                      rows={2}
                      value={form.announcement}
                      onChange={(e) => update("announcement", e.target.value)}
                    />
                  </Field>
                  <div className="content-preview">
                    <div className="hero-content-preview-image">
                      <CafeScene
                        slide={heroSlides(form).find((s) => s.active)!}
                        products={data.products}
                      />
                    </div>
                    <span>YOUR CUSTOMER WEBSITE</span>
                    <h3>{form.headline}</h3>
                    <p>{form.tagline}</p>
                  </div>
                </>
              )}
              {tab === "Courts" && (
                <CourtSettingsEditor
                  courts={form.courts || defaultCourts}
                  update={(value: import("../lib/domain").CourtConfig[]) =>
                    update("courts", value)
                  }
                />
              )}
              {tab === "Partner shares" && (
                <>
                  <div className="partner-share-fields">
                    {["Karthik Saggidi", "Partner 02", "Partner 03"].map(
                      (name, i) => (
                        <Field label={`${name} · Share (%)`} key={name}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={form.partnerShares[i]}
                            onChange={(e) => {
                              const shares = [...form.partnerShares];
                              shares[i] = Number(e.target.value);
                              update("partnerShares", shares);
                            }}
                          />
                        </Field>
                      ),
                    )}
                  </div>
                  <div
                    className={`share-total ${form.partnerShares.reduce((s: number, n: number) => s + n, 0) === 100 ? "green-text" : "danger-text"}`}
                  >
                    Total allocation:{" "}
                    {form.partnerShares.reduce(
                      (s: number, n: number) => s + n,
                      0,
                    )}
                    %
                  </div>
                </>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="settings-save">
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busy || uploadingHero}
                >
                  {uploadingHero
                    ? "Uploading image…"
                    : busy
                      ? "Saving…"
                      : saved
                        ? "Saved"
                        : "Save changes"}
                  <Check size={16} />
                </button>
                <span>Changes are recorded in the audit log.</span>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
function Reports({ data, range }: Common & { range: AdminFilters }) {
  const [tab, setTab] = useState("Sales overview");
  const products = Object.values(
    data.orders
      .filter((o) => o.status !== "Cancelled")
      .flatMap((o) => o.items)
      .reduce((a: any, i) => {
        if (!a[i.id])
          a[i.id] = { id: i.id, name: i.name, quantity: 0, revenue: 0 };
        a[i.id].quantity += i.quantity;
        a[i.id].revenue += i.quantity * i.price;
        return a;
      }, {}),
  ).sort((a: any, b: any) => b.revenue - a.revenue) as any[];
  const reports = [
    {
      title: "Sales register",
      description: "All café orders, status, taxes and discounts.",
      icon: ShoppingBag,
      rows: data.orders,
    },
    {
      title: "Court booking register",
      description: "Bookings, utilisation, players and revenue.",
      icon: CalendarDays,
      rows: data.bookings,
    },
    {
      title: "Payment ledger",
      description: "Collections, pending amounts and reversals.",
      icon: CreditCard,
      rows: data.payments,
    },
    {
      title: "Inventory movements",
      description: "Every recorded stock movement, with a reference.",
      icon: Package,
      rows: data.stockLedger,
    },
    {
      title: "Journal entries",
      description: "Balanced accounting entries for your records.",
      icon: Landmark,
      rows: data.journals,
    },
    {
      title: "Audit log",
      description: "Recent sensitive actions and settings changes.",
      icon: Activity,
      rows: data.auditLogs,
    },
  ];
  return (
    <>
      <PageHeading
        title="A little insight. A better tomorrow."
        description="See what’s working, spot what matters and take your records with you."
      />
      <div className="tabs">
        {["Sales overview", "Product performance", "Exports"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Sales overview" ? (
        <div className="reports-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Revenue, day by day</h2>
                <p>Café and court revenue · selected period</p>
              </div>
            </div>
            <RevenueChart data={data} range={range} />
            <div className="chart-legend">
              <span>
                <i className="legend-dot cafe" />
                Café
              </span>
              <span>
                <i className="legend-dot court" />
                Courts
              </span>
            </div>
          </section>
          <section className="panel revenue-mix">
            <div className="panel-heading">
              <h2>The revenue mix</h2>
            </div>
            {["Counter", "Online", "Court"].map((source, i) => {
              const revenue =
                source === "Court"
                  ? data.bookings
                      .filter((b) => b.status !== "Cancelled")
                      .reduce((s, b) => s + b.total, 0)
                  : data.orders
                      .filter(
                        (o) => o.source === source && o.status !== "Cancelled",
                      )
                      .reduce((s, o) => s + o.total, 0);
              const all =
                data.orders
                  .filter((o) => o.status !== "Cancelled")
                  .reduce((s, o) => s + o.total, 0) +
                data.bookings
                  .filter((b) => b.status !== "Cancelled")
                  .reduce((s, b) => s + b.total, 0);
              return (
                <div key={source} className="mix-row">
                  <div>
                    <span>
                      <i className={`mix-dot dot-${i}`} />
                      {source === "Court" ? "Court bookings" : `${source} café`}
                    </span>
                    <b>{money(revenue)}</b>
                  </div>
                  <div className="mix-bar">
                    <span
                      className={`dot-${i}`}
                      style={{ width: `${all ? (revenue / all) * 100 : 0}%` }}
                    />
                  </div>
                  <small>
                    {all ? Math.round((revenue / all) * 100) : 0}% of total
                    revenue
                  </small>
                </div>
              );
            })}
          </section>
        </div>
      ) : tab === "Product performance" ? (
        <section className="panel">
          <div className="panel-heading">
            <h2>Your menu, by the numbers</h2>
            <button
              className="btn secondary small"
              onClick={() => exportCSV("product-performance", products)}
            >
              <Download size={14} />
              Export
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity sold</th>
                  <th>Revenue, before tax</th>
                  <th>Base ingredient cost</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="row">
                        <img
                          className="table-photo"
                          src={img(p.id, p.image)}
                          alt={p.name}
                        />
                        <b>{p.name}</b>
                      </div>
                    </td>
                    <td>{p.quantity}</td>
                    <td>{money(p.revenue)}</td>
                    <td>
                      {money(
                        Object.entries(
                          data.products.find((pr) => pr.id === p.id)?.recipe ||
                            {},
                        ).reduce(
                          (s, [id, q]) =>
                            s +
                            q *
                              (data.inventory.find((i) => i.id === id)?.cost ||
                                0),
                          0,
                        ),
                      )}{" "}
                      / item
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="export-grid">
          {reports.map((r) => (
            <section className="panel export-card" key={r.title}>
              <span className="table-icon">
                <r.icon size={23} />
              </span>
              <h2>{r.title}</h2>
              <p>{r.description}</p>
              <span className="muted">{r.rows.length} records</span>
              <button
                className="btn secondary full"
                onClick={() =>
                  exportCSV(r.title.toLowerCase().replaceAll(" ", "-"), r.rows)
                }
              >
                <Download size={15} />
                Download CSV
              </button>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function CustomerHome({
  data,
  view,
  navigate,
  add,
}: {
  data: State;
  view: string;
  navigate: (v: string) => void;
  add: (p: Product) => void;
}) {
  const [category, setCategory] = useState("All"),
    [query, setQuery] = useState("");
  const b = data.settings.business;
  return (
    <>
      {view === "home" && (
        <>
          <section
            className="customer-hero"
            aria-label="Welcome to Lost Origin"
          >
            <h1 className="visually-hidden">
              {b.shopName}. {b.headline.replaceAll("\n", " ")}
            </h1>
            <ColorBanner business={b} products={data.products} />
            <form
              className="hero-action-bar"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate("menu");
              }}
            >
              <HeroCampaignTicker campaign={heroCampaign(data)} />
              <label className="hero-search">
                <Search size={27} />
                <input
                  aria-label="Search coffee, food or drinks"
                  placeholder="Search for coffee, food, or drinks..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCategory("All");
                  }}
                />
                <button
                  type="submit"
                  className="icon-btn"
                  aria-label="Find menu items"
                >
                  <ArrowRight size={21} />
                </button>
              </label>
              <span className="hero-action-divider" />
              <button
                type="button"
                className="hero-order-button"
                onClick={() => navigate("menu")}
              >
                <Coffee size={27} />
                <span>Order Now</span>
                <ArrowRight size={25} />
              </button>
              <span className="hero-action-divider" />
              <button
                type="button"
                className="hero-order-button"
                onClick={() => navigate("book")}
              >
                <PaddleIcon size={27} />
                <span>Book Court</span>
                <ArrowRight size={25} />
              </button>
            </form>
          </section>
        </>
      )}
      {view === "home" ? (
        <HomeSections data={data} navigate={navigate} add={add} />
      ) : (
        <CustomerMenu
          data={data}
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          open={add}
        />
      )}
    </>
  );
}

function Tracking({
  data,
  openOrder,
  navigate,
  recent,
}: {
  data: State;
  openOrder: (o: Order) => void;
  navigate: (v: string) => void;
  recent: Order | null;
}) {
  const [phone, setPhone] = useState(""),
    [submitted, setSubmitted] = useState(false);
  const rows = data.orders.filter(
    (o) => o.phone === phone || (recent && o.id === recent.id),
  );
  const bookings = data.bookings.filter((b) => b.phone === phone);
  return (
    <section className="tracking-page">
      <PageHeading
        eyebrow="YOUR LITTLE MOMENTS OF GOOD"
        title="Good things, on their way."
        description="Find your preview orders using the mobile number you entered."
      />
      <form
        className="tracking-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <Field label="Mobile number">
          <input
            type="tel"
            aria-label="Mobile number for order lookup"
            placeholder="10-digit mobile number"
            value={phone}
            pattern="[6-9][0-9]{9}"
            maxLength={10}
            required
            onChange={(e) => {
              setPhone(e.target.value);
              setSubmitted(false);
            }}
          />
        </Field>
        <button className="btn primary" type="submit">
          Find my orders <Search size={16} />
        </button>
      </form>
      <p className="note">
        Preview lookup only. Production order history requires OTP verification.
      </p>
      {(submitted || recent) && (
        <>
          <section className="panel">
            <div className="panel-heading">
              <h2>Your café orders</h2>
            </div>
            <OrderTable orders={rows} open={openOrder} />
            {!rows.length && (
              <Empty
                title="No orders with that number yet"
                detail="Your next favourite is waiting on the menu."
              />
            )}
          </section>
          {bookings.length > 0 && (
            <section className="panel tracking-bookings">
              <div className="panel-heading">
                <h2>Your court time</h2>
              </div>
              {bookings.map((b) => (
                <div className="tracking-booking" key={b.id}>
                  <CalendarDays size={22} />
                  <div>
                    <b>
                      {b.court} · {b.date}
                    </b>
                    <p>
                      {timeLabel(b.start)} – {timeLabel(b.start + b.duration)}
                    </p>
                  </div>
                  <Badge>{b.status}</Badge>
                </div>
              ))}
            </section>
          )}
        </>
      )}
      <button className="text-btn" onClick={() => navigate("menu")}>
        Find something good on the menu <ArrowRight size={16} />
      </button>
    </section>
  );
}

function CourtSettingsEditor({
  courts,
  update,
}: {
  courts: import("../lib/domain").CourtConfig[];
  update: (value: import("../lib/domain").CourtConfig[]) => void;
}) {
  const set = (index: number, key: string, value: any) =>
    update(
      courts.map((court, i) =>
        i === index ? { ...court, [key]: value } : court,
      ),
    );
  const format = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const minutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    <div className="court-settings">
      <p className="note">
        Four courts, as confirmed. Existing ₹600 off-peak / ₹800 peak hourly
        rates are provisional; replace them with your actual rates here. Changes
        update booking prices and availability live.
      </p>
      {courts.map((court, i) => (
        <section className="court-settings-card" key={i}>
          <div className="row space-between">
            <h3>Court {String(i + 1).padStart(2, "0")}</h3>
            <label className="check-field">
              <input
                type="checkbox"
                checked={court.active}
                onChange={(e) => set(i, "active", e.target.checked)}
              />
              Accept bookings
            </label>
          </div>
          <Field label={`Court ${i + 1} name`}>
            <input
              required
              value={court.name}
              onChange={(e) => set(i, "name", e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Off-peak hourly rate (₹)">
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={court.baseRate / 100}
                onChange={(e) =>
                  set(i, "baseRate", Math.round(Number(e.target.value) * 100))
                }
              />
            </Field>
            <Field label="Peak hourly rate (₹)">
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={court.peakRate / 100}
                onChange={(e) =>
                  set(i, "peakRate", Math.round(Number(e.target.value) * 100))
                }
              />
            </Field>
            <Field label="Opens (IST)">
              <input
                required
                type="time"
                step="1800"
                value={format(court.open)}
                onChange={(e) => set(i, "open", minutes(e.target.value))}
              />
            </Field>
            <Field label="Closes (IST)">
              <input
                required
                type="time"
                step="1800"
                value={format(court.close)}
                onChange={(e) => set(i, "close", minutes(e.target.value))}
              />
            </Field>
            <Field label="Weekday peak begins (IST)">
              <input
                required
                type="time"
                step="1800"
                value={format(court.peakStart)}
                onChange={(e) => set(i, "peakStart", minutes(e.target.value))}
              />
            </Field>
            <Field label="Paddle rental per booking (₹)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={court.equipmentRate / 100}
                onChange={(e) =>
                  set(
                    i,
                    "equipmentRate",
                    Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            </Field>
            <Field label="Court tax (%)">
              <input
                required
                type="number"
                min="0"
                max="28"
                step="0.01"
                value={court.taxRate}
                onChange={(e) => set(i, "taxRate", Number(e.target.value))}
              />
            </Field>
          </div>
        </section>
      ))}
    </div>
  );
}
