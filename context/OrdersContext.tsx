import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import type { ItemCarrito } from "./CartContext";

export type EstadoPedido = "confirmado" | "preparando" | "en-camino" | "entregado";

export const ORDEN_ESTADOS: EstadoPedido[] = ["confirmado", "preparando", "en-camino", "entregado"];

export type Pedido = {
  id: string;
  negocioId: string;
  items: ItemCarrito[];
  subtotal: number;
  propina: number;
  total: number;
  metodoPago: string;
  direccion: string;
  nota: string;
  creadoEn: string; // ISO
  estado: EstadoPedido;
  calificacion: number | null;
  comentario: string;
};

type PedidoNuevo = Omit<Pedido, "id" | "creadoEn" | "estado" | "calificacion" | "comentario">;

type OrdersContextValue = {
  pedidos: Pedido[]; // el más reciente primero
  crear: (pedido: PedidoNuevo) => string;
  avanzar: (id: string, estado: EstadoPedido) => void;
  calificar: (id: string, estrellas: number, comentario: string) => void;
  pedidoPorId: (id: string | undefined) => Pedido | undefined;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

// Mientras no haya tabla de pedidos en Supabase, el historial vive en el
// celular, separado por usuario para que otra cuenta no vea pedidos ajenos.
function claveDe(userId: string) {
  return `mikhuna:pedidos:${userId}`;
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  // Igual que en CartContext: copia síncrona para que dos cambios seguidos
  // no se pisen antes del siguiente render.
  const actual = useRef<Pedido[]>([]);

  useEffect(() => {
    actual.current = [];
    setPedidos([]);
    if (!userId) return;
    let vigente = true;
    AsyncStorage.getItem(claveDe(userId))
      .then((guardado) => {
        if (!vigente || !guardado) return;
        const lista = JSON.parse(guardado) as Pedido[];
        actual.current = lista;
        setPedidos(lista);
      })
      .catch(() => {}); // sin historial guardado o ilegible: se empieza vacío
    return () => {
      vigente = false;
    };
  }, [userId]);

  function guardar(siguiente: Pedido[]) {
    actual.current = siguiente;
    setPedidos(siguiente);
    if (userId) AsyncStorage.setItem(claveDe(userId), JSON.stringify(siguiente)).catch(() => {});
  }

  function crear(nuevo: PedidoNuevo) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const pedido: Pedido = {
      ...nuevo,
      id,
      creadoEn: new Date().toISOString(),
      estado: "confirmado",
      calificacion: null,
      comentario: "",
    };
    guardar([pedido, ...actual.current]);
    return id;
  }

  function avanzar(id: string, estado: EstadoPedido) {
    guardar(actual.current.map((p) => (p.id === id ? { ...p, estado } : p)));
  }

  function calificar(id: string, estrellas: number, comentario: string) {
    guardar(
      actual.current.map((p) => (p.id === id ? { ...p, calificacion: estrellas, comentario } : p))
    );
  }

  function pedidoPorId(id: string | undefined) {
    if (!id) return undefined;
    return pedidos.find((p) => p.id === id);
  }

  return (
    <OrdersContext.Provider value={{ pedidos, crear, avanzar, calificar, pedidoPorId }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders debe usarse dentro de OrdersProvider");
  return ctx;
}
