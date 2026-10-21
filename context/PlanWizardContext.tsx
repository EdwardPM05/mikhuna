import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type ListaPlan =
  | "dias"
  | "antojos"
  | "restricciones"
  | "electrodomesticos"
  | "comprados";

export type PlanData = {
  distrito: string | null;
  negocioId: string | null;
  personas: number;
  dias: string[];
  presupuesto: number;
  antojos: string[];
  restricciones: string[];
  electrodomesticos: string[];
  // ingredientes de la lista de compras que el usuario marcó como
  // "lo compro yo" — no dependen de haber pedido delivery.
  comprados: string[];
  // por ingrediente, en qué negocio prefiere comprarlo — si no eligió
  // ninguno, se usa el más barato por defecto (ver lib/catalogo.ts).
  preferenciasCompra: Record<string, string>;
};

const INICIAL: PlanData = {
  distrito: null,
  negocioId: null,
  personas: 2,
  dias: [],
  presupuesto: 150,
  antojos: [],
  restricciones: [],
  electrodomesticos: [],
  comprados: [],
  preferenciasCompra: {},
};

type PlanWizardValue = {
  data: PlanData;
  // true cuando ya se leyó el plan guardado del usuario (o no había ninguno)
  listo: boolean;
  update: (patch: Partial<PlanData>) => void;
  toggle: (campo: ListaPlan, valor: string, max?: number) => void;
  elegirNegocioParaIngrediente: (ingredienteId: string, negocioId: string) => void;
  quitarDeCarrito: (ingredienteId: string) => void;
  reset: () => void;
};

const PlanWizardContext = createContext<PlanWizardValue | null>(null);

// Copia local del plan: sirve para abrir rápido y sin internet, y es de
// donde se sube el plan la primera vez (antes solo existía esta copia).
function claveDe(userId: string) {
  return `mikhuna:plan:${userId}`;
}

// Se mezcla con INICIAL por si el plan se guardó con una versión que no
// tenía algún campo nuevo.
function completar(guardado: Partial<PlanData>): PlanData {
  return { ...INICIAL, ...guardado };
}

async function leerLocal(userId: string) {
  const guardado = await AsyncStorage.getItem(claveDe(userId)).catch(() => null);
  return guardado ? completar(JSON.parse(guardado) as Partial<PlanData>) : null;
}

const ESPERA_GUARDADO_MS = 800;

export function PlanWizardProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [data, setData] = useState<PlanData>(INICIAL);
  // De quién es el plan que está en `data`: se guarda solo cuando coincide con
  // el usuario actual, así no se escribe INICIAL encima del plan guardado
  // antes de terminar de leerlo.
  const [duenio, setDuenio] = useState<string | null>(null);
  // Solo se escribe en Supabase si se pudo leer de ahí: sin conexión, un plan
  // viejo del celular no debe pisar uno más nuevo hecho en otro dispositivo.
  const [remotoOk, setRemotoOk] = useState(false);

  useEffect(() => {
    setData(INICIAL);
    setDuenio(null);
    setRemotoOk(false);
    if (!userId) return;
    let vigente = true;
    (async () => {
      const { data: fila, error } = await supabase
        .from("planes")
        .select("datos")
        .eq("user_id", userId)
        .maybeSingle();
      const local = await leerLocal(userId);
      if (!vigente) return;
      if (error) {
        if (local) setData(local);
      } else {
        // Sin fila en Supabase todavía: se usa (y se sube) la copia local.
        const remoto = fila ? completar(fila.datos as Partial<PlanData>) : null;
        const elegido = remoto ?? local;
        if (elegido) setData(elegido);
        setRemotoOk(true);
      }
      setDuenio(userId);
    })();
    return () => {
      vigente = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || duenio !== userId) return;
    AsyncStorage.setItem(claveDe(userId), JSON.stringify(data)).catch(() => {});
    if (!remotoOk) return;
    // Los toggles del wizard cambian el plan muchas veces seguidas: se sube
    // cuando el usuario deja de tocar por un momento.
    const t = setTimeout(() => {
      supabase
        .from("planes")
        .upsert({ user_id: userId, datos: data, actualizado_en: new Date().toISOString() })
        .then(() => {});
    }, ESPERA_GUARDADO_MS);
    return () => clearTimeout(t);
  }, [data, duenio, userId, remotoOk]);

  function update(patch: Partial<PlanData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function toggle(campo: ListaPlan, valor: string, max?: number) {
    setData((prev) => {
      const actual = prev[campo];
      const yaEsta = actual.includes(valor);
      if (!yaEsta && max !== undefined && actual.length >= max) return prev;
      return {
        ...prev,
        [campo]: yaEsta ? actual.filter((v) => v !== valor) : [...actual, valor],
      };
    });
  }

  function elegirNegocioParaIngrediente(ingredienteId: string, negocioId: string) {
    setData((prev) => ({
      ...prev,
      preferenciasCompra: { ...prev.preferenciasCompra, [ingredienteId]: negocioId },
    }));
  }

  function quitarDeCarrito(ingredienteId: string) {
    setData((prev) => {
      const siguiente = { ...prev.preferenciasCompra };
      delete siguiente[ingredienteId];
      return { ...prev, preferenciasCompra: siguiente };
    });
  }

  function reset() {
    setData(INICIAL);
  }

  return (
    <PlanWizardContext.Provider
      value={{
        data,
        listo: userId === null || duenio === userId,
        update,
        toggle,
        elegirNegocioParaIngrediente,
        quitarDeCarrito,
        reset,
      }}
    >
      {children}
    </PlanWizardContext.Provider>
  );
}

export function usePlanWizard() {
  const ctx = useContext(PlanWizardContext);
  if (!ctx) throw new Error("usePlanWizard debe usarse dentro de PlanWizardProvider");
  return ctx;
}
