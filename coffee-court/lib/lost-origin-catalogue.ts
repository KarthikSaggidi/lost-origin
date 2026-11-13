import type { Product } from "./domain";
// Transcribed from the two menu images supplied by the owner. Amounts are paise.
const entries: [
  string,
  string,
  string,
  number | [number, number],
  string?,
  string?,
][] = [
  ["espresso", "Espresso", "Espresso", [110, 120], "americano"],
  ["cortado", "Cortado", "Espresso", 140, "latte"],
  ["cappuccino", "Cappuccino", "Espresso", 150, "latte"],
  ["americano", "Long black", "Espresso", [150, 160], "americano"],
  ["flat-white", "Flat white", "Espresso", 160, "latte"],
  ["latte", "Latte", "Espresso", [160, 170], "latte"],
  ["spanish-latte", "Spanish latte", "Espresso", 170, "latte"],
  ["mocha", "Mocha", "Espresso", [170, 180], "latte"],
  ["vietnamese-coffee", "Vietnamese coffee", "Iced Coffee", 180, "coldbrew"],
  ["cranberry-infusion", "Cranberry Infusion", "Iced Coffee", 180, "infusion"],
  ["orange-infusion", "Orange Infusion", "Iced Coffee", 180, "infusion"],
  ["espresso-tonic", "Espresso Tonic", "Iced Coffee", 180, "coldbrew"],
  ["estate-special", "Estate Special", "Pour Overs", 180, "americano"],
  [
    "classic-cold-coffee",
    "Classic Cold Coffee",
    "Cold Coffee",
    200,
    "coldbrew",
  ],
  [
    "brownie-cold-coffee",
    "Brownie Cold Coffee",
    "Cold Coffee",
    220,
    "coldbrew",
  ],
  [
    "biscoff-cold-coffee",
    "Biscoff Cold Coffee",
    "Cold Coffee",
    230,
    "coldbrew",
  ],
  ["coldbrew", "Plain Cold Brew", "Cold Brew", 180, "coldbrew"],
  ["vanilla-cold-brew", "Vanilla Cold Brew", "Cold Brew", 200, "coldbrew"],
  ["coconut-cold-brew", "Coconut Cold Brew", "Cold Brew", 220, "coldbrew"],
  ["matcha", "Matcha Latte", "Matcha", [240, 250], "matcha"],
  ["coconut-matcha", "Coconut Matcha", "Matcha", 280, "matcha"],
  ["strawberry-matcha", "Strawberry Matcha latte", "Matcha", 280, "matcha"],
  ["matcha-cream", "Matcha Cream", "Matcha", 300, "matcha"],
  ["hot-chocolate", "Hot chocolate", "Non Coffee", 200, "latte"],
  ["strawberry-latte", "Strawberry Latte", "Non Coffee", 220, "infusion"],
  ["salted-fries", "Salted Fries", "Fries", 200, "fries"],
  ["peri-peri-fries", "Peri Peri Fries", "Fries", 220, "fries"],
  ["sandwich", "Veg Sandwich", "Sandwich", 270, "sandwich"],
  [
    "chicken-sandwich",
    "Chicken Sandwich",
    "Sandwich",
    300,
    "sandwich",
    "nonveg",
  ],
  ["alfredo-veg-pasta", "Alfredo Veg Pasta", "Pasta", 270, "pasta"],
  [
    "alfredo-chicken-pasta",
    "Alfredo Chicken Pasta",
    "Pasta",
    300,
    "pasta",
    "nonveg",
  ],
  ["red-sauce-veg-pasta", "Red Sauce Veg Pasta", "Pasta", 270, "pasta"],
  [
    "red-sauce-chicken-pasta",
    "Red Sauce Chicken Pasta",
    "Pasta",
    300,
    "pasta",
    "nonveg",
  ],
  ["avocado-toast", "Avacado Toast", "Toast", 230, "toast"],
  ["scrambled-egg-toast", "Scrambled Egg Toast", "Toast", 200, "toast", "egg"],
];
const foodCategories = ["Fries", "Sandwich", "Pasta", "Toast"];
export const lostOriginMenu: Product[] = entries.map(
  ([id, name, category, price, image = "latte", diet = "veg"]) => {
    const food = foodCategories.includes(category);
    const recipe: Record<string, number> = food
      ? { ["portion-" + id]: 1 }
      : category === "Matcha"
        ? { matcha: 4, milk: 200, cups: 1 }
        : [
              "cranberry-infusion",
              "orange-infusion",
              "strawberry-latte",
            ].includes(id)
          ? { ["portion-" + id]: 1, cups: 1 }
          : [
                "americano",
                "espresso",
                "estate-special",
                "espresso-tonic",
                "coldbrew",
                "vanilla-cold-brew",
                "coconut-cold-brew",
              ].includes(id)
            ? { beans: 18, cups: 1 }
            : { beans: 18, milk: 180, cups: 1 };
    if (id === "hot-chocolate") {
      delete recipe.beans;
      Object.assign(recipe, { milk: 200, chocolate: 25 });
    }
    return {
      id,
      name,
      category,
      description: food
        ? "Prepared fresh for takeaway."
        : category === "Espresso"
          ? "Freshly brewed, just the way you like it."
          : category === "Matcha"
            ? "Smooth matcha, made to order."
            : "Freshly prepared at Lost Origin.",
      price: (Array.isArray(price) ? price[0] : price) * 100,
      image,
      active: 1,
      recipe,
      variants: Array.isArray(price)
        ? [
            { label: "Hot", price: price[0] * 100 },
            { label: "Cold", price: price[1] * 100 },
          ]
        : [{ label: "Standard", price: price * 100 }],
      diet,
      section: food ? "Food" : "Drinks",
    };
  },
);
export const cataloguePortions = lostOriginMenu
  .filter((p) => Object.keys(p.recipe).some((k) => k.startsWith("portion-")))
  .map((p) => ({
    id: "portion-" + p.id,
    name: p.name + " · prepared portions",
    unit: "portions",
    quantity: 20,
    reorder: 5,
    cost: Math.round(p.price * 0.35),
  }));
