// Recetas del dataset (tabla public.recetas) que la app no trae consigo: la
// que se abre desde "Recetas parecidas" y las parecidas en sí. Todo lo que
// llega se revisa con las mismas reglas del plan antes de mostrarse.
import { supabase } from "./supabase";
import type { Receta } from "./catalogo";
import type { PlanData } from "../context/PlanWizardContext";
import {
  clavesDe,
  dietasPermitidas,
  esReceta,
  respetaRestricciones,
  sePuedePreparar,
} from "../supabase/functions/_shared/plan.ts";

function leSirve(r: unknown, data: PlanData): r is Receta {
  return esReceta(r) && respetaRestricciones(r, data.restricciones) && sePuedePreparar(r, data.electrodomesticos);
}

// Una receta del dataset por id. null si no existe, no hay sesión o no pasa la revisión.
export async function buscarReceta(id: string): Promise<Receta | null> {
  const { data, error } = await supabase.from("recetas").select("datos").eq("id", id).maybeSingle();
  if (error || !data || !esReceta(data.datos)) return null;
  return data.datos;
}

// Recetas reales que comparten ingredientes con esta, de la que más comparte
// a la que menos, respetando lo que la persona puede comer y su cocina.
export async function recetasParecidas(receta: Receta, data: PlanData, cuantas = 6): Promise<Receta[]> {
  const claves = clavesDe(receta);
  if (claves.length === 0) return [];
  const { data: filas, error } = await supabase.rpc("recetas_parecidas", {
    claves,
    excluir: receta.id,
    dietas: dietasPermitidas(data.restricciones),
    sin_gluten: data.restricciones.includes("sin-gluten"),
    sin_lactosa: data.restricciones.includes("sin-lactosa"),
    electrodomesticos: data.electrodomesticos,
    cuantas,
  });
  if (error || !Array.isArray(filas)) return [];
  return filas.filter((r): r is Receta => leSirve(r, data));
}

// Ingredientes que dos recetas tienen en común, para decir por qué se parecen.
export function enComun(a: Receta, b: Receta): string[] {
  const deA = clavesDe(a);
  return clavesDe(b).filter((c) => deA.includes(c));
}
