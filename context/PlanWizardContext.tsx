import { createContext, useContext, useState, type ReactNode } from "react";

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
  update: (patch: Partial<PlanData>) => void;
  toggle: (campo: ListaPlan, valor: string, max?: number) => void;
  elegirNegocioParaIngrediente: (ingredienteId: string, negocioId: string) => void;
  quitarDeCarrito: (ingredienteId: string) => void;
  reset: () => void;
};

const PlanWizardContext = createContext<PlanWizardValue | null>(null);

export function PlanWizardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlanData>(INICIAL);

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
      value={{ data, update, toggle, elegirNegocioParaIngrediente, quitarDeCarrito, reset }}
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
