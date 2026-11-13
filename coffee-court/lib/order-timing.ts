export type TimingInput = {
  source: "Online" | "Counter";
  pickupAt?: string;
  offline?: boolean;
  createdAt?: string;
};
export function resolveOrderTime(
  input: TimingInput,
  settings: { openTime: string; closeTime: string; prepMinutes: number },
  now = new Date(),
): string {
  if (input.source === "Counter") {
    // Counter billing is immediate. Never apply online slots, hours or capacity.
    if (input.offline && input.createdAt) {
      const created = new Date(input.createdAt);
      if (
        Number.isNaN(created.getTime()) ||
        created.getTime() < now.getTime() - 7 * 86400000 ||
        created.getTime() > now.getTime() + 60000
      )
        throw new Error("The offline bill date is invalid.");
      return created.toISOString();
    }
    return now.toISOString();
  }
  if (!input.pickupAt)
    throw new Error("Choose a pickup time for your online order.");
  const pickup = new Date(input.pickupAt);
  if (
    Number.isNaN(pickup.getTime()) ||
    pickup.getTime() < now.getTime() - 60000 ||
    pickup.getTime() > now.getTime() + 2 * 86400000
  )
    throw new Error("Choose a pickup time within the next two days.");
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(pickup);
  if (local < settings.openTime || local >= settings.closeTime)
    throw new Error("Choose a pickup time during opening hours.");
  if (pickup.getTime() < now.getTime() + (settings.prepMinutes - 1) * 60000)
    throw new Error(
      `Please allow at least ${settings.prepMinutes} minutes to prepare your order.`,
    );
  return pickup.toISOString();
}
