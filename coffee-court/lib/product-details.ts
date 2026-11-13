import type { Product, Stock } from "./domain";

export function productImage(product: Product) {
  const name = [
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
  ].includes(product.image)
    ? product.image
    : "latte";
  return `/images/${name}.${name === "infusion" ? "svg" : "jpg"}`;
}

export function productIngredients(product: Product, inventory: Stock[] = []) {
  if (Array.isArray(product.ingredients)) return product.ingredients;
  return Object.entries(product.recipe)
    .filter(
      ([id, amount]) =>
        amount > 0 && id !== "cups" && !id.startsWith("portion-"),
    )
    .map(([id]) => inventory.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

export function parseIngredients(value: string) {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
