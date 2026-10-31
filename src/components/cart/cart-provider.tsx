"use client";

import * as React from "react";
import {
  addItemToCart,
  getCartState,
  removeCartItemAction,
  updateCartItemQtyAction,
  type CartState,
} from "@/app/actions/cart";

const EMPTY: CartState = { cartId: "", items: [], count: 0, subtotalCents: 0 };

interface CartContextValue {
  state: CartState;
  loading: boolean;
  sessionId: string;
  refresh: () => Promise<void>;
  addItem: (input: { productId: string; quantity?: number; configuration?: Record<string, string> | null }) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const CartContext = React.createContext<CartContextValue>({
  state: EMPTY,
  loading: true,
  sessionId: "",
  refresh: async () => {},
  addItem: async () => {},
  updateQty: async () => {},
  removeItem: async () => {},
});

export function useCart() {
  return React.useContext(CartContext);
}

const SESSION_KEY = "atelier_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CartState>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [sessionId, setSessionId] = React.useState("");

  const refresh = React.useCallback(async () => {
    try {
      const next = await getCartState(sessionId);
      setState(next);
    } catch {
      setState(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  React.useEffect(() => {
    if (sessionId) void refresh();
  }, [sessionId, refresh]);

  const addItem = React.useCallback(
    async (input: { productId: string; quantity?: number; configuration?: Record<string, string> | null }) => {
      const next = await addItemToCart({ ...input, sessionId });
      setState(next);
    },
    [sessionId],
  );

  const updateQty = React.useCallback(
    async (itemId: string, quantity: number) => {
      const next = await updateCartItemQtyAction({ itemId, quantity, sessionId });
      setState(next);
    },
    [sessionId],
  );

  const removeItem = React.useCallback(
    async (itemId: string) => {
      const next = await removeCartItemAction({ itemId, sessionId });
      setState(next);
    },
    [sessionId],
  );

  const value = React.useMemo(
    () => ({ state, loading, sessionId, refresh, addItem, updateQty, removeItem }),
    [state, loading, sessionId, refresh, addItem, updateQty, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
