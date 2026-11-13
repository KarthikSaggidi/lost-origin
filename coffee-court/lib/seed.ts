import {
  todayIST,
  calculate,
  quoteBooking,
  type Product,
  type Item,
} from "./domain";

export const menu: Product[] = [
  {
    id: "latte",
    name: "Signature latte",
    category: "Coffee",
    description:
      "Our house espresso, silky steamed milk, a little everyday magic.",
    price: 22000,
    image: "latte",
    active: 1,
    recipe: { beans: 18, milk: 200, cups: 1 },
  },
  {
    id: "cappuccino",
    name: "Classic cappuccino",
    category: "Coffee",
    description: "A balanced espresso with a cloud of textured milk.",
    price: 20000,
    image: "cappuccino",
    active: 1,
    recipe: { beans: 18, milk: 140, cups: 1 },
  },
  {
    id: "americano",
    name: "Americano",
    category: "Coffee",
    description:
      "Bold, clean and beautifully simple. Our single-origin house blend.",
    price: 16000,
    image: "americano",
    active: 1,
    recipe: { beans: 18, cups: 1 },
  },
  {
    id: "coldbrew",
    name: "Slow-steeped cold brew",
    category: "Cold drinks",
    description: "Steeped for 18 hours. Smooth, chocolatey and refreshing.",
    price: 24000,
    image: "coldbrew",
    active: 1,
    recipe: { beans: 25, cups: 1 },
  },
  {
    id: "matcha",
    name: "Iced matcha latte",
    category: "Cold drinks",
    description: "Ceremonial matcha, your choice of milk, poured over ice.",
    price: 28000,
    image: "matcha",
    active: 1,
    recipe: { matcha: 4, milk: 200, cups: 1 },
  },
  {
    id: "mocha",
    name: "Dark chocolate mocha",
    category: "Coffee",
    description: "Rich dark chocolate meets espresso and creamy steamed milk.",
    price: 26000,
    image: "mocha",
    active: 1,
    recipe: { beans: 18, milk: 180, chocolate: 25, cups: 1 },
  },
  {
    id: "croissant",
    name: "Butter croissant",
    category: "Bakery",
    description: "Golden layers, French butter and that perfect first crunch.",
    price: 18000,
    image: "croissant",
    active: 1,
    recipe: { croissants: 1 },
  },
  {
    id: "sandwich",
    name: "Pesto grilled sandwich",
    category: "Bites",
    description:
      "Basil pesto, melted mozzarella and fresh tomatoes on sourdough.",
    price: 29000,
    image: "sandwich",
    active: 1,
    recipe: { bread: 2, cheese: 40 },
  },
];
export const initialStock = [
  {
    id: "beans",
    name: "House blend coffee beans",
    unit: "g",
    quantity: 8400,
    reorder: 3000,
    cost: 150,
  },
  {
    id: "milk",
    name: "Whole milk",
    unit: "ml",
    quantity: 4200,
    reorder: 5000,
    cost: 7,
  },
  {
    id: "oat",
    name: "Oat milk",
    unit: "ml",
    quantity: 3000,
    reorder: 1000,
    cost: 12,
  },
  {
    id: "cups",
    name: "Takeaway cups · 12 oz",
    unit: "pcs",
    quantity: 286,
    reorder: 100,
    cost: 600,
  },
  {
    id: "matcha",
    name: "Ceremonial matcha",
    unit: "g",
    quantity: 180,
    reorder: 200,
    cost: 1200,
  },
  {
    id: "chocolate",
    name: "Dark chocolate sauce",
    unit: "g",
    quantity: 1600,
    reorder: 500,
    cost: 90,
  },
  {
    id: "croissants",
    name: "Butter croissants",
    unit: "pcs",
    quantity: 8,
    reorder: 10,
    cost: 8500,
  },
  {
    id: "bread",
    name: "Sourdough slices",
    unit: "pcs",
    quantity: 48,
    reorder: 20,
    cost: 1500,
  },
  {
    id: "cheese",
    name: "Mozzarella cheese",
    unit: "g",
    quantity: 1800,
    reorder: 500,
    cost: 85,
  },
];
export function demoData() {
  const names = [
    "Ananya Rao",
    "Arjun Reddy",
    "Priya Sharma",
    "Rahul Mehta",
    "Sneha Iyer",
    "Aditya Kumar",
    "Meera Nair",
    "Vikram Singh",
    "Diya Patel",
    "Kiran Rao",
    "Rohan Shah",
    "Ishita Das",
  ];
  const date = todayIST();
  const orders: any[] = [];
  const bookings: any[] = [];
  for (let d = 6; d >= 0; d--) {
    const day = todayIST(
      new Date(new Date(`${date}T12:00:00+05:30`).getTime() - d * 86400000),
    );
    for (let n = 0; n < (d === 0 ? 42 : 26 + (6 - d) * 3); n++) {
      const product = menu[(n + d) % menu.length];
      const items: Item[] = [
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: n % 5 === 0 ? 2 : 1,
          size: "Regular",
          milk: "Whole milk",
          shot: false,
        },
      ];
      if (n % 4 === 0)
        items.push({
          id: "croissant",
          name: "Butter croissant",
          price: 18000,
          quantity: 1,
          size: "Regular",
          milk: "",
          shot: false,
        });
      const at = `${day}T${String(8 + (Math.floor(n / 4) % 12)).padStart(2, "0")}:${String((n % 4) * 15).padStart(2, "0")}:00+05:30`;
      const totals = calculate(items, "");
      const source = n % 3 === 0 ? "Online" : "Counter";
      orders.push({
        id: `CC-${1040 + orders.length}`,
        customer: names[n % names.length],
        phone: `98${String(76543000 + n).slice(-8)}`,
        source,
        status:
          d === 0 && n > 35
            ? ["Received", "Preparing", "Ready"][n % 3]
            : "Completed",
        paymentMode: n % 5 === 0 ? "Cash" : "UPI",
        paymentStatus: "Demo paid",
        ...totals,
        items,
        pickupAt: at,
        createdAt: at,
        requestKey: `seed-${d}-${n}`,
        notes: n === 39 ? "Less ice, please." : "",
      });
    }
    for (let b = 0; b < (d === 0 ? 9 : 5); b++) {
      const start = [420, 540, 660, 900, 1020, 1080, 1140, 1200, 1260][b];
      const court = b % 2 === 0 ? "Court 01" : "Court 02";
      bookings.push({
        id: `PB-${201 + bookings.length}`,
        customer: names[(b + 2) % names.length],
        phone: "9876543210",
        court,
        date: day,
        start,
        duration: 60,
        players: 4,
        equipment: b % 3 === 0 ? 1 : 0,
        total: quoteBooking(start, 60, b % 3 === 0, day),
        status:
          d === 0
            ? b < 4
              ? "Completed"
              : b === 4
                ? "Checked in"
                : "Confirmed"
            : "Completed",
        createdAt: `${day}T08:00:00+05:30`,
        requestKey: `seed-book-${d}-${b}`,
      });
    }
  }
  return { orders, bookings };
}
