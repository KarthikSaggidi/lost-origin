import { available, productVisible, type State } from "./domain.ts";
import { productIngredients } from "./product-details.ts";
export function customerState(
  data: State,
  customer?: { id: string; name: string; phone?: string },
) {
  const business = data.settings.business || {};
  const fields = [
    "shopName",
    "tagline",
    "headline",
    "announcement",
    "heroSlides",
    "footerTagline",
    "phone",
    "email",
    "address",
    "socialLinks",
    "privacyPolicy",
    "terms",
    "openTime",
    "closeTime",
    "paused",
    "prepMinutes",
    "taxRate",
    "slotCapacity",
    "courts",
    "receiptFooter",
    "receiptWidth",
    "gstin",
    "fssai",
  ];
  return {
    ...data,
    notifications: [],
    notificationUnread: 0,
    products: data.products
      .filter((p) => productVisible(p, "website"))
      .map((p) => ({
        ...p,
        stockAvailable: available(p, data.inventory),
        ingredients: productIngredients(p, data.inventory),
        recipe: {},
      })),
    inventory: [],
    orders: customer?.phone
      ? data.orders.filter((order) => order.phone === customer.phone)
      : [],
    bookings: data.bookings.map((booking) =>
      customer?.phone && booking.phone === customer.phone
        ? booking
        : {
            id: `availability-${booking.id}`,
            court: booking.court,
            date: booking.date,
            start: booking.start,
            duration: booking.duration,
            status: booking.status,
            customer: "",
            phone: "",
            players: 0,
            equipment: 0,
            total: 0,
            createdAt: "",
            requestKey: "",
          },
    ),
    payments: [],
    expenses: [],
    journals: [],
    stockLedger: [],
    auditLogs: [],
    registrations: [],
    documents: data.documents.filter(
      (document) =>
        ["heroCampaign", "popupCampaign"].includes(document.type) ||
        (document.type === "campaign" && document.data.active),
    ),
    settings: {
      business: Object.fromEntries(
        fields
          .filter((key) => business[key] !== undefined)
          .map((key) => [key, business[key]]),
      ),
    },
  };
}
