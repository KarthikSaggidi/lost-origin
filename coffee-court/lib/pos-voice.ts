import {
  productVariants,
  productVisible,
  available,
  type Product,
  type Item,
  type Stock,
} from "./domain.ts";
import { mergePosItems } from "./pos-bills.ts";

export type VoiceLine = {
  productId: string;
  quantity: number;
  variant?: string;
};
export type VoiceCommand = { lines: VoiceLine[]; needsChoice: boolean };
const numbers = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];
export function normalizeVoice(value: string) {
  return value
    .toLowerCase()
    .replace(/browine|brownies/g, "brownie")
    .replace(/avocado/g, "avacado")
    .replace(/cappuccinos/g, "cappuccino")
    .replace(/sandwiches/g, "sandwich")
    .replace(/coffees/g, "coffee")
    .replace(/lattes/g, "latte")
    .replace(/mochas/g, "mocha")
    .replace(/espressos/g, "espresso")
    .replace(/cortados/g, "cortado")
    .replace(/\biced\b/g, "cold")
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const aliases: Record<string, string[]> = {
  "classic-cold-coffee": ["cold coffee"],
  americano: ["americano", "long black coffee"],
  "avocado-toast": ["avacado toast"],
  sandwich: ["vegetable sandwich", "veggie sandwich"],
  "biscoff-cold-coffee": ["bisc off cold coffee", "biscuit cold coffee"],
};
export function parseVoiceCommand(
  text: string,
  products: Product[],
): VoiceCommand {
  if (!text.trim())
    throw new Error(
      "Say a quantity and menu item, such as ‘one brownie cold coffee’.",
    );
  if (
    /\b(clear|delete|remove|pay|payment|checkout|print|refund|cancel|bill)\b/i.test(
      text,
    )
  )
    throw new Error(
      "Voice entry adds menu items only. Use the billing controls for other actions.",
    );
  const segments = text
    .replace(/[.!?]+\s*$/g, "")
    .split(/\s+and\s+|\s+plus\s+|[,;]/i)
    .map((s) => s.trim());
  if (segments.length > 10 || segments.some((s) => !s))
    throw new Error("Use up to ten items, separated by ‘and’.");
  const lines = segments.map((segment) => {
    let phrase = normalizeVoice(segment)
      .replace(/^(?:please\s+)?add\s+/, "")
      .replace(/\s+please$/, "");
    const parts = phrase.split(" ");
    let quantity = 1;
    if (/^[-\d]/.test(parts[0]) || numbers.includes(parts[0])) {
      quantity = numbers.includes(parts[0])
        ? numbers.indexOf(parts[0])
        : Number(parts[0]);
      parts.shift();
      phrase = parts.join(" ");
    } else if (["a", "an"].includes(parts[0])) {
      parts.shift();
      phrase = parts.join(" ");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
      throw new Error("Use a whole quantity from 1 to 20.");
    const matches: VoiceLine[] = [];
    for (const p of products.filter((p) => productVisible(p, "pos"))) {
      const names = [
        normalizeVoice(p.name),
        ...(aliases[p.id] || []).map(normalizeVoice),
      ];
      const variants = productVariants(p);
      for (const name of names) {
        if (phrase === name)
          matches.push({
            productId: p.id,
            quantity,
            variant: variants.length === 1 ? variants[0].label : undefined,
          });
        for (const variant of variants) {
          if (variant.label === "Standard") continue;
          const label = normalizeVoice(variant.label);
          if (phrase === `${label} ${name}` || phrase === `${name} ${label}`)
            matches.push({ productId: p.id, quantity, variant: variant.label });
        }
      }
    }
    const unique = [
      ...new Map(
        matches.map((m) => [`${m.productId}:${m.variant}`, m]),
      ).values(),
    ];
    if (!unique.length)
      throw new Error(
        `Could not match “${segment}”. Use the item’s menu name, or tap a product.`,
      );
    if (unique.length !== 1)
      throw new Error(
        `“${segment}” matches more than one item. Please use the full menu name.`,
      );
    return unique[0];
  });
  return { lines, needsChoice: lines.some((line) => !line.variant) };
}
export function voiceItems(
  command: VoiceCommand,
  products: Product[],
  inventory: Stock[],
  cart: Item[],
): Item[] {
  const incoming = command.lines.map((line) => {
    const p = products.find((p) => p.id === line.productId);
    if (!p || !productVisible(p, "pos") || !available(p, inventory))
      throw new Error(`${p?.name || "This item"} is not available on the POS.`);
    const variant = productVariants(p).find((v) => v.label === line.variant);
    if (!variant) throw new Error(`Choose a variant for ${p.name}.`);
    return {
      id: p.id,
      name: p.name,
      variant: variant.label,
      quantity: line.quantity,
      price: variant.price,
      size: "Regular",
      milk: p.recipe.milk ? "Whole milk" : "",
      shot: false,
    };
  });
  const combined = mergePosItems(cart, incoming),
    usage: Record<string, number> = {};
  for (const item of combined) {
    const p = products.find((p) => p.id === item.id);
    if (!p) continue;
    for (const [id, amount] of Object.entries(p.recipe))
      usage[id] = (usage[id] || 0) + amount * item.quantity;
  }
  for (const [id, amount] of Object.entries(usage)) {
    const stock = inventory.find((s) => s.id === id);
    if (!stock || stock.quantity + 1e-9 < amount)
      throw new Error(
        `Not enough ${stock?.name || id} for this bill. Reduce the quantity.`,
      );
  }
  return incoming;
}
