import type { Menu } from "../config/menu";

export const testMenu: Menu = {
  recipient: { name: "Baker Bob", whatsappNumber: "46701234567" },
  maxToppings: 3,
  toppings: [
    { id: "mozzarella", name: "Mozzarella", emoji: "🧀", group: "Cheese" },
    { id: "ham", name: "Ham", emoji: "🍖", group: "Meat" },
    { id: "salami", name: "Salami", emoji: "🥩", group: "Meat" },
    { id: "olives", name: "Olives", emoji: "🫒", group: "Veg" },
  ],
};
