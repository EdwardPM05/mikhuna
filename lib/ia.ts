// Arma el plan semanal: primero le pide a la Edge Function `generar-plan` que
// Gemini elija entre las recetas que cumplen lo que el usuario puede comer, y
// si eso falla (sin internet, sin cuota, respuesta rara) lo arma con las
// mismas reglas aquí en el celular. Ver docs/ENFOQUE.md.
import { supabase } from "./supabase";
import { RECETAS, type Receta } from "./catalogo";
import type { PlanData } from "../context/PlanWizardContext";
import {
  DIAS,
  armarPlanLocal,
  recetasPosibles,
  type DiaPlan,
  type PreferenciasPlan,
} from "../supabase/functions/_shared/plan.ts";

// Lo que espera el usuario mirando la pantalla "Generando" antes de que se
// use el plan de las reglas. Un poco más que el plazo que la función le da a
// Gemini (PLAZO_GEMINI_MS), para que alcance a responder con su propio respaldo.
const ESPERA_MAXIMA_MS = 22000;

// fuente "reglas": la función no pudo usar a Gemini y armó el plan con las reglas.
type RespuestaPlan = { platos: DiaPlan[]; fuente?: "ia" | "reglas" } | { error: string };

function conLimiteDeTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("La IA tardó demasiado")), ms);
    promesa.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

// La respuesta se revisa de nuevo aquí: cada día pedido, en orden, con una
// receta que exista y que cumpla las restricciones. Si algo no cuadra, ese
// plan no se usa.
function validar(platos: unknown, p: PreferenciasPlan): DiaPlan[] | null {
  if (!Array.isArray(platos)) return null;
  const permitidas = new Set(recetasPosibles(p, RECETAS).map((r) => r.id));
  const dias = DIAS.filter((d) => p.dias.includes(d));
  const plan: DiaPlan[] = [];
  for (const dia of dias) {
    const plato = platos.find((x) => x && typeof x === "object" && x.dia === dia);
    if (!plato || typeof plato.recetaId !== "string" || !permitidas.has(plato.recetaId)) return null;
    plan.push({ dia, recetaId: plato.recetaId, razon: typeof plato.razon === "string" ? plato.razon : "" });
  }
  return plan;
}

export async function generarPlanConIA(
  p: PreferenciasPlan
): Promise<{ plan: DiaPlan[]; fuente: "ia" | "reglas" }> {
  const { data, error } = await conLimiteDeTiempo(
    supabase.functions.invoke<RespuestaPlan>("generar-plan", { body: p }),
    ESPERA_MAXIMA_MS
  );
  if (error) throw new Error(`No se pudo generar el plan con IA: ${error.message}`);
  if (!data || "error" in data) {
    throw new Error(`La IA no devolvió un plan válido: ${data && "error" in data ? data.error : "respuesta vacía"}`);
  }
  const plan = validar(data.platos, p);
  if (!plan) throw new Error("La IA devolvió recetas que no calzan con el plan");
  return { plan, fuente: data.fuente === "reglas" ? "reglas" : "ia" };
}

export function preferenciasDe(data: PlanData): PreferenciasPlan {
  return {
    dias: data.dias,
    antojos: data.antojos,
    restricciones: data.restricciones,
    electrodomesticos: data.electrodomesticos,
    presupuesto: data.presupuesto,
    personas: data.personas,
    perfil: data.perfil,
    region: data.region,
    objetivo: data.objetivo,
    nivelCocina: data.nivelCocina,
  };
}

export type PlatoDelDia = { dia: string; receta: Receta; razon: string };

// Lo que se muestra en "Tu semana". Un plan hecho antes de que existiera
// planSemana se arma con las reglas al vuelo (y respeta sus restricciones).
export function platosDeLaSemana(data: PlanData): PlatoDelDia[] {
  const plan = data.planFuente === null ? armarPlanLocal(preferenciasDe(data), RECETAS) : data.planSemana;
  return plan.flatMap(({ dia, recetaId, razon }) => {
    const receta = RECETAS.find((r) => r.id === recetaId);
    return receta ? [{ dia, receta, razon }] : [];
  });
}

// El plan que se guarda: el de la IA si funcionó, si no el de las reglas.
// Nunca falla; si ninguna receta cumple las restricciones devuelve [].
export async function armarPlan(p: PreferenciasPlan): Promise<{ plan: DiaPlan[]; fuente: "ia" | "reglas" }> {
  if (recetasPosibles(p, RECETAS).length === 0) return { plan: [], fuente: "reglas" };
  try {
    return await generarPlanConIA(p);
  } catch {
    return { plan: armarPlanLocal(p, RECETAS), fuente: "reglas" };
  }
}
