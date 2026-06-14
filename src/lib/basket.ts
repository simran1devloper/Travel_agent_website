import { useCallback } from "react";
import { useLocalStorage, ls } from "./storage";

export interface BasketItem {
  type: "package" | "destination" | "service" | "offer";
  slug: string;
  name: string;
  price?: number;
  days?: number;
  image?: string;
  location?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string;   // ISO date string
}

const BASKET_KEY = "jm_basket";
export const CHECKOUT_KEY = "jm_basket_checkout";

export function useBasket() {
  const [items, setItems] = useLocalStorage<BasketItem[]>(BASKET_KEY, []);

  const add = useCallback(
    (item: BasketItem) => {
      setItems((prev) =>
        prev.some((i) => i.slug === item.slug && i.type === item.type) ? prev : [...prev, item],
      );
    },
    [setItems],
  );

  const remove = useCallback(
    (slug: string, type: BasketItem["type"]) => {
      setItems((prev) => prev.filter((i) => !(i.slug === slug && i.type === type)));
    },
    [setItems],
  );

  const has = useCallback(
    (slug: string, type: BasketItem["type"]) =>
      items.some((i) => i.slug === slug && i.type === type),
    [items],
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  return { items, add, remove, has, clear, count: items.length };
}

export function writeCheckoutPrefill(items: BasketItem[]): void {
  ls.set(CHECKOUT_KEY, items);
}

export function readCheckoutPrefill(): BasketItem[] | null {
  const data = ls.get<BasketItem[] | null>(CHECKOUT_KEY, null);
  if (data) ls.remove(CHECKOUT_KEY);
  return data;
}
