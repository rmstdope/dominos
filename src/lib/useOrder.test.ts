import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Menu } from "../config/menu";
import { useOrder } from "./useOrder";

const menu: Menu = {
  recipient: { name: "Baker", whatsappNumber: "46701234567" },
  maxToppings: 2,
  toppings: [
    { id: "cheese", name: "Cheese", emoji: "🧀", group: "Cheese" },
    { id: "ham", name: "Ham", emoji: "🍖", group: "Meat" },
    { id: "olives", name: "Olives", emoji: "🫒", group: "Veg" },
  ],
};

describe("useOrder", () => {
  it("starts on the name step with nothing selected", () => {
    const { result } = renderHook(() => useOrder(menu));
    expect(result.current.step).toBe("name");
    expect(result.current.customerName).toBe("");
    expect(result.current.selectedToppings).toEqual([]);
  });

  it("prefills a remembered name", () => {
    window.localStorage.setItem("dominos.customerName", "Henrik");
    const { result } = renderHook(() => useOrder(menu));
    expect(result.current.customerName).toBe("Henrik");
  });

  it("refuses a blank name and stays on the name step", () => {
    const { result } = renderHook(() => useOrder(menu));
    act(() => result.current.submitName("   "));
    expect(result.current.step).toBe("name");
  });

  it("stores a trimmed name and moves on to toppings", () => {
    const { result } = renderHook(() => useOrder(menu));
    act(() => result.current.submitName("  Henrik "));
    expect(result.current.customerName).toBe("Henrik");
    expect(result.current.step).toBe("toppings");
    expect(window.localStorage.getItem("dominos.customerName")).toBe("Henrik");
  });

  it("toggles toppings and keeps selection order", () => {
    const { result } = renderHook(() => useOrder(menu));
    act(() => result.current.toggleTopping("ham"));
    act(() => result.current.toggleTopping("cheese"));
    expect(result.current.selectedToppings.map((t) => t.name)).toEqual(["Ham", "Cheese"]);
    expect(result.current.isSelected("ham")).toBe(true);
    act(() => result.current.toggleTopping("ham"));
    expect(result.current.selectedIds).toEqual(["cheese"]);
    expect(result.current.isSelected("ham")).toBe(false);
  });

  it("ignores unknown topping ids", () => {
    const { result } = renderHook(() => useOrder(menu));
    act(() => result.current.toggleTopping("anchovies"));
    expect(result.current.selectedIds).toEqual([]);
  });

  it("enforces maxToppings but still allows deselecting", () => {
    const { result } = renderHook(() => useOrder(menu));
    act(() => result.current.toggleTopping("cheese"));
    act(() => result.current.toggleTopping("ham"));
    expect(result.current.atLimit).toBe(true);
    act(() => result.current.toggleTopping("olives"));
    expect(result.current.selectedIds).toEqual(["cheese", "ham"]);
    act(() => result.current.toggleTopping("cheese"));
    expect(result.current.atLimit).toBe(false);
    expect(result.current.selectedIds).toEqual(["ham"]);
  });

  it("has no limit when maxToppings is unset", () => {
    const { result } = renderHook(() => useOrder({ ...menu, maxToppings: undefined }));
    for (const t of menu.toppings) act(() => result.current.toggleTopping(t.id));
    expect(result.current.selectedIds).toHaveLength(3);
    expect(result.current.atLimit).toBe(false);
  });

  it("only reaches review with at least one topping", () => {
    const { result } = renderHook(() => useOrder(menu));
    act(() => result.current.submitName("Henrik"));
    act(() => result.current.goToReview());
    expect(result.current.step).toBe("toppings");
    act(() => result.current.toggleTopping("cheese"));
    act(() => result.current.goToReview());
    expect(result.current.step).toBe("review");
  });

  it("navigates back and resets", () => {
    const { result } = renderHook(() => useOrder(menu));
    act(() => result.current.submitName("Henrik"));
    act(() => result.current.toggleTopping("cheese"));
    act(() => result.current.goToReview());
    act(() => result.current.backToToppings());
    expect(result.current.step).toBe("toppings");
    act(() => result.current.backToName());
    expect(result.current.step).toBe("name");
    expect(result.current.selectedIds).toEqual(["cheese"]);
    act(() => result.current.reset());
    expect(result.current.step).toBe("name");
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.customerName).toBe("Henrik");
    act(() => result.current.clearToppings());
    expect(result.current.selectedIds).toEqual([]);
  });
});
