import type { Menu } from "../config/menu";

export const testMenu: Menu = {
  recipient: { name: "Baker Bob", whatsappNumber: "46701234567" },
  maxToppings: 3,
  toppings: [
    {
      id: "mozzarella",
      name: { en: "Mozzarella", sv: "Mozzarella" },
      emoji: "🧀",
      group: { en: "Cheese", sv: "Ost" },
    },
    {
      id: "ham",
      name: { en: "Ham", sv: "Skinka" },
      emoji: "🍖",
      group: { en: "Meat", sv: "Kött" },
    },
    {
      id: "salami",
      name: { en: "Salami", sv: "Salami" },
      emoji: "🥩",
      group: { en: "Meat", sv: "Kött" },
    },
    {
      id: "olives",
      name: { en: "Olives", sv: "Oliver" },
      emoji: "🫒",
      group: { en: "Veg", sv: "Grönt" },
    },
  ],
};
