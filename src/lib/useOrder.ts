import { useCallback, useMemo, useState } from "react";
import type { Menu, Topping } from "../config/menu";
import { loadCustomerName, saveCustomerName } from "./storage";

export type Step = "name" | "toppings" | "review";

export type OrderState = {
  step: Step;
  customerName: string;
  selectedIds: string[];
  selectedToppings: Topping[];
  atLimit: boolean;
  isSelected: (id: string) => boolean;
  submitName: (name: string) => void;
  toggleTopping: (id: string) => void;
  clearToppings: () => void;
  goToReview: () => void;
  backToToppings: () => void;
  backToName: () => void;
  reset: () => void;
};

/** All order state and the transitions between the three screens. */
export function useOrder(menu: Menu): OrderState {
  const [step, setStep] = useState<Step>("name");
  const [customerName, setCustomerName] = useState<string>(() => loadCustomerName());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedToppings = useMemo(
    () => selectedIds.flatMap((id) => menu.toppings.filter((t) => t.id === id)),
    [selectedIds, menu.toppings],
  );
  const atLimit = menu.maxToppings !== undefined && selectedIds.length >= menu.maxToppings;

  const submitName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    setCustomerName(trimmed);
    saveCustomerName(trimmed);
    setStep("toppings");
  }, []);

  const toggleTopping = useCallback(
    (id: string) => {
      if (!menu.toppings.some((t) => t.id === id)) return;
      setSelectedIds((current) => {
        if (current.includes(id)) return current.filter((x) => x !== id);
        if (menu.maxToppings !== undefined && current.length >= menu.maxToppings) return current;
        return [...current, id];
      });
    },
    [menu.toppings, menu.maxToppings],
  );

  return {
    step,
    customerName,
    selectedIds,
    selectedToppings,
    atLimit,
    isSelected: (id) => selectedIds.includes(id),
    submitName,
    toggleTopping,
    clearToppings: () => setSelectedIds([]),
    goToReview: () => {
      if (selectedIds.length > 0) setStep("review");
    },
    backToToppings: () => setStep("toppings"),
    backToName: () => setStep("name"),
    reset: () => {
      setSelectedIds([]);
      setStep("name");
    },
  };
}
