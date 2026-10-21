import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";

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

type EstadoCarrito = { negocioId: string | null; items: ItemCarrito[] };

const VACIO: EstadoCarrito = { negocioId: null, items: [] };

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [carrito, setCarrito] = useState<EstadoCarrito>(VACIO);
  // Copia síncrona del estado: varias llamadas seguidas a agregar() (por ejemplo
  // pedirGrupo, que agrega todos los ingredientes de una tienda en un bucle) tienen
  // que ver lo que agregó la anterior, y `reemplazado` se tiene que saber al
  // momento de devolverlo, no en el próximo render.
  const actual = useRef<EstadoCarrito>(VACIO);

  function guardar(siguiente: EstadoCarrito) {
    actual.current = siguiente;
    setCarrito(siguiente);
  }

  function agregar(nId: string, item: ItemNuevo) {
    const prev = actual.current;
    const reemplazado = prev.negocioId !== null && prev.negocioId !== nId;
    const base = reemplazado ? [] : prev.items;
    const existe = base.find((i) => i.id === item.id);
    const items = existe
      ? base.map((i) => (i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      : [...base, { ...item, cantidad: 1 }];
    guardar({ negocioId: nId, items });
    return { reemplazado };
  }

  function quitar(id: string) {
    const items = actual.current.items
      .map((i) => (i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i))
      .filter((i) => i.cantidad > 0);
    guardar({ negocioId: items.length === 0 ? null : actual.current.negocioId, items });
  }

  function cantidadDe(id: string) {
    return carrito.items.find((i) => i.id === id)?.cantidad ?? 0;
  }

  function vaciar() {
    guardar(VACIO);
  }

  const total = useMemo(
    () => carrito.items.reduce((suma, item) => suma + item.precio * item.cantidad, 0),
    [carrito.items]
  );

  const cantidadTotal = useMemo(() => carrito.items.reduce((s, i) => s + i.cantidad, 0), [carrito.items]);

  return (
    <CartContext.Provider
      value={{
        negocioId: carrito.negocioId,
        items: carrito.items,
        total,
        cantidadTotal,
        agregar,
        quitar,
        cantidadDe,
        vaciar,
      }}
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
