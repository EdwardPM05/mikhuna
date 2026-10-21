import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
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
  cargando: boolean;
  // mensaje para el usuario si no se pudo leer el historial (sin red, etc.)
  errorCarga: string | null;
  recargar: () => Promise<void>;
  crear: (pedido: PedidoNuevo) => Promise<{ id: string | null; error: string | null }>;
  avanzar: (id: string, estado: EstadoPedido) => void;
  // devuelve un mensaje para el usuario si no se pudo guardar
  calificar: (id: string, estrellas: number, comentario: string) => Promise<string | null>;
  pedidoPorId: (id: string | undefined) => Pedido | undefined;
};

// Fila de la tabla public.pedidos (ver supabase/migrations).
type FilaPedido = {
  id: string;
  negocio_id: string;
  items: ItemCarrito[];
  subtotal: number | string;
  propina: number | string;
  total: number | string;
  metodo_pago: string;
  direccion: string;
  nota: string;
  creado_en: string;
  estado: EstadoPedido;
  calificacion: number | null;
  comentario: string;
};

function desdeFila(f: FilaPedido): Pedido {
  return {
    id: f.id,
    negocioId: f.negocio_id,
    items: f.items,
    // numeric puede llegar como texto según la configuración de PostgREST
    subtotal: Number(f.subtotal),
    propina: Number(f.propina),
    total: Number(f.total),
    metodoPago: f.metodo_pago,
    direccion: f.direccion,
    nota: f.nota,
    creadoEn: f.creado_en,
    estado: f.estado,
    calificacion: f.calificacion,
    comentario: f.comentario,
  };
}

function aFila(p: PedidoNuevo) {
  return {
    negocio_id: p.negocioId,
    items: p.items,
    subtotal: p.subtotal,
    propina: p.propina,
    total: p.total,
    metodo_pago: p.metodoPago,
    direccion: p.direccion,
    nota: p.nota,
  };
}

const MENSAJE_SIN_CONEXION = "No pudimos conectar con el servidor. Revisa tu internet.";

// Dónde guardaba los pedidos la versión anterior, antes de Supabase. Si hay
// algo ahí, se sube una vez y se borra.
function claveLocalDe(userId: string) {
  return `mikhuna:pedidos:${userId}`;
}

async function subirPedidosLocales(userId: string) {
  const clave = claveLocalDe(userId);
  const guardado = await AsyncStorage.getItem(clave);
  if (!guardado) return;
  let locales: Pedido[];
  try {
    locales = JSON.parse(guardado) as Pedido[];
  } catch {
    // Copia corrupta: no hay nada recuperable y reintentar no la arregla.
    await AsyncStorage.removeItem(clave);
    return;
  }
  // Se borra antes de subir: si la app se cierra justo después del insert,
  // no queremos volver a subir los mismos pedidos en el próximo arranque.
  await AsyncStorage.removeItem(clave);
  if (!Array.isArray(locales) || locales.length === 0) return;
  const filas = locales.map((p) => ({
    ...aFila(p),
    estado: p.estado,
    calificacion: p.calificacion,
    comentario: p.comentario,
    creado_en: p.creadoEn,
  }));
  const { error } = await supabase.from("pedidos").insert(filas);
  if (error) await AsyncStorage.setItem(clave, guardado); // se reintenta en la próxima carga
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  // Igual que en CartContext: copia síncrona para que dos cambios seguidos
  // no se pisen antes del siguiente render.
  const actual = useRef<Pedido[]>([]);
  // Cada carga (o cambio de cuenta) sube este número; una respuesta que
  // llega cuando ya hay otra más nueva en camino se descarta.
  const cargaVigente = useRef(0);
  // Pedidos creados mientras una carga estaba en vuelo: el SELECT pudo
  // salir antes del insert y no traerlos.
  const creadosDuranteCarga = useRef<Pedido[]>([]);

  function guardarEnMemoria(siguiente: Pedido[]) {
    actual.current = siguiente;
    setPedidos(siguiente);
  }

  async function cargar(uid: string) {
    const esta = ++cargaVigente.current;
    creadosDuranteCarga.current = [];
    setCargando(true);
    setErrorCarga(null);
    await subirPedidosLocales(uid).catch(() => {});
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("creado_en", { ascending: false });
    if (esta !== cargaVigente.current) return; // la cuenta o la carga ya cambió
    setCargando(false);
    if (error) {
      setErrorCarga(MENSAJE_SIN_CONEXION);
      return;
    }
    const traidos = (data as FilaPedido[]).map(desdeFila);
    const ids = new Set(traidos.map((p) => p.id));
    const faltantes = creadosDuranteCarga.current.filter((p) => !ids.has(p.id));
    creadosDuranteCarga.current = [];
    guardarEnMemoria([...faltantes, ...traidos]);
  }

  useEffect(() => {
    cargaVigente.current++;
    guardarEnMemoria([]);
    setErrorCarga(null);
    setCargando(false);
    if (userId) cargar(userId);
  }, [userId]);

  async function recargar() {
    if (userId) await cargar(userId);
  }

  async function crear(nuevo: PedidoNuevo) {
    const { data, error } = await supabase.from("pedidos").insert(aFila(nuevo)).select().single();
    if (error || !data) {
      return { id: null, error: "No se pudo enviar tu pedido. Revisa tu conexión e inténtalo de nuevo." };
    }
    const pedido = desdeFila(data as FilaPedido);
    creadosDuranteCarga.current.push(pedido);
    guardarEnMemoria([pedido, ...actual.current]);
    return { id: pedido.id, error: null };
  }

  // Estos dos cambios se ven al instante en la app y se guardan por detrás.
  // Si el servidor los rechaza, se deshacen para que la pantalla no muestre
  // algo que no quedó guardado.
  function cambiarLocal(id: string, cambios: Partial<Pedido>) {
    guardarEnMemoria(actual.current.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  }

  async function guardarCambio(id: string, cambios: Partial<Pedido>, fila: Record<string, unknown>) {
    const antes = actual.current.find((p) => p.id === id);
    cambiarLocal(id, cambios);
    const { error } = await supabase.from("pedidos").update(fila).eq("id", id);
    if (!error) return true;
    if (antes) {
      const revertir = Object.fromEntries(
        Object.keys(cambios).map((k) => [k, antes[k as keyof Pedido]])
      ) as Partial<Pedido>;
      cambiarLocal(id, revertir);
    }
    return false;
  }

  function avanzar(id: string, estado: EstadoPedido) {
    guardarCambio(id, { estado }, { estado });
  }

  async function calificar(id: string, estrellas: number, comentario: string) {
    const ok = await guardarCambio(
      id,
      { calificacion: estrellas, comentario },
      { calificacion: estrellas, comentario }
    );
    return ok ? null : "No pudimos guardar tu calificación. Revisa tu internet e inténtalo de nuevo.";
  }

  function pedidoPorId(id: string | undefined) {
    if (!id) return undefined;
    return pedidos.find((p) => p.id === id);
  }

  return (
    <OrdersContext.Provider
      value={{ pedidos, cargando, errorCarga, recargar, crear, avanzar, calificar, pedidoPorId }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders debe usarse dentro de OrdersProvider");
  return ctx;
}
