import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type ItemCarrito = { id: string; nombre: string; precio: number; cantidad: number };
type ItemNuevo = { id: string; nombre: string; precio: number };

type CartContextValue = {
  negocioId: string | null;
  items: ItemCarrito[];
  total: number;
  cantidadTotal: number;
  agregar: (negocioId: string, item: ItemNuevo) => { reemplazado: boolean };
  quitar: (id: string) => void;
  cantidadDe: (id: string) => number;
  vaciar: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemCarrito[]>([]);

  function agregar(nId: string, item: ItemNuevo) {
    let reemplazado = false;
    setItems((prev) => {
      if (negocioId !== null && negocioId !== nId) {
        reemplazado = true;
        return [{ ...item, cantidad: 1 }];
      }
      const existe = prev.find((i) => i.id === item.id);
      if (existe) {
        return prev.map((i) => (i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { ...item, cantidad: 1 }];
    });
    setNegocioId(nId);
    return { reemplazado };
  }

  function quitar(id: string) {
    setItems((prev) => {
      const siguiente = prev
        .map((i) => (i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0);
      if (siguiente.length === 0) setNegocioId(null);
      return siguiente;
    });
  }

  function cantidadDe(id: string) {
    return items.find((i) => i.id === id)?.cantidad ?? 0;
  }

  function vaciar() {
    setItems([]);
    setNegocioId(null);
  }

  const total = useMemo(
    () => items.reduce((suma, item) => suma + item.precio * item.cantidad, 0),
    [items]
  );

  const cantidadTotal = useMemo(() => items.reduce((s, i) => s + i.cantidad, 0), [items]);

  return (
    <CartContext.Provider
      value={{ negocioId, items, total, cantidadTotal, agregar, quitar, cantidadDe, vaciar }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
