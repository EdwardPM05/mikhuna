// Reglas para armar el plan semanal. Las usan la app (para armar el plan sin
// internet o si la IA falla) y la Edge Function generar-plan (para elegir qué
// recetas puede ver Gemini). Ver docs/ENFOQUE.md.
//
// 1. Lo que no se negocia (restricciones, electrodomésticos) es un filtro:
//    una receta que no cumple nunca llega al plan, ni a la IA.
// 2. Lo demás (quién eres, antojos, presupuesto) da puntos para ordenar.
import { RECETAS, type Receta, type Region } from "./recetas.ts";

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Deben coincidir con los ids de ANTOJOS, RESTRICCIONES y ELECTRODOMESTICOS de
// lib/catalogo.ts (allá están con sus íconos).
export const ANTOJOS_IDS = [
  "criolla",
  "rapida",
  "saludable",
  "menu-dia",
  "vegetariana",
  "proteica",
  "economica",
  "antojo-chifa",
];
export const RESTRICCIONES_IDS = ["ninguna", "vegetariano", "vegano", "sin-gluten", "sin-lactosa", "pescetariano"];
export const ELECTRODOMESTICOS_IDS = ["cocina", "horno", "microondas", "licuadora", "arrocera", "freidora"];

export type Perfil = "estudiante" | "foraneo" | "objetivo" | "comer-rico";
export type Objetivo = "sano" | "musculo" | "bajar";
export type NivelCocina = "principiante" | "me-defiendo" | "experto";

export const PERFILES: Perfil[] = ["estudiante", "foraneo", "objetivo", "comer-rico"];
export const REGIONES: Region[] = ["costa", "sierra", "selva"];
export const OBJETIVOS: Objetivo[] = ["sano", "musculo", "bajar"];
export const NIVELES_COCINA: NivelCocina[] = ["principiante", "me-defiendo", "experto"];

export type PreferenciasPlan = {
  dias: string[];
  antojos: string[];
  restricciones: string[];
  electrodomesticos: string[];
  presupuesto: number;
  personas: number;
  perfil: Perfil | null;
  region: Region | null; // la comida que extraña, si es foráneo
  objetivo: Objetivo | null;
  nivelCocina: NivelCocina | null;
};

// `receta` va solo cuando la receta es del dataset (tabla public.recetas): la
// app no la tiene, así que el plan guarda una copia para mostrarla sin internet.
export type DiaPlan = { dia: string; recetaId: string; razon: string; receta?: Receta };

const DIETAS = ["carne", "pescado", "vegetariana", "vegana"];
const esTexto = (x: unknown, max: number) => typeof x === "string" && x.length > 0 && x.length <= max;
const esListaDe = (x: unknown, ok: (v: unknown) => boolean, max: number) =>
  Array.isArray(x) && x.length <= max && x.every(ok);

// Una receta que llega de afuera (la base o la respuesta de la función) se
// revisa campo por campo antes de usarla: si algo no cuadra, no entra al plan.
export function esReceta(x: unknown): x is Receta {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    esTexto(r.id, 40) &&
    esTexto(r.nombre, 120) &&
    esListaDe(r.etiquetas, (e) => ANTOJOS_IDS.includes(e as string), ANTOJOS_IDS.length) &&
    (r.etiquetas as string[]).includes(r.antojoId as string) &&
    (r.cocina === "peruana" || r.cocina === "internacional") &&
    (r.region === null || REGIONES.includes(r.region as Region)) &&
    DIETAS.includes(r.dieta as string) &&
    typeof r.conGluten === "boolean" &&
    typeof r.conLactosa === "boolean" &&
    esListaDe(r.requiere, (e) => ELECTRODOMESTICOS_IDS.includes(e as string), ELECTRODOMESTICOS_IDS.length) &&
    [1, 2, 3].includes(r.dificultad as number) &&
    esTexto(r.ingredienteIcono, 40) &&
    Number.isFinite(r.tiempoMin) &&
    Number.isFinite(r.precio) &&
    esListaDe(r.ingredientes, (i) => !!i && typeof i === "object" && esTexto((i as { texto?: unknown }).texto, 600), 80) &&
    esListaDe(r.pasos, (p) => esTexto(p, 600), 30)
  );
}

const NOMBRE_ANTOJO: Record<string, string> = {
  criolla: "criolla",
  rapida: "rápida",
  saludable: "saludable",
  "menu-dia": "de menú",
  vegetariana: "vegetariana",
  proteica: "fit",
  economica: "económica",
  "antojo-chifa": "chifa",
};

export function respetaRestricciones(receta: Receta, restricciones: string[]): boolean {
  if (restricciones.includes("vegano") && receta.dieta !== "vegana") return false;
  if (restricciones.includes("vegetariano") && receta.dieta !== "vegetariana" && receta.dieta !== "vegana") return false;
  if (restricciones.includes("pescetariano") && receta.dieta === "carne") return false;
  if (restricciones.includes("sin-gluten") && receta.conGluten) return false;
  if (restricciones.includes("sin-lactosa") && receta.conLactosa) return false;
  return true;
}

// Sin electrodomésticos marcados (un plan viejo) no se filtra: no sabemos qué tiene.
export function sePuedePreparar(receta: Receta, electrodomesticos: string[]): boolean {
  if (electrodomesticos.length === 0) return true;
  return receta.requiere.every((e) => electrodomesticos.includes(e));
}

export function recetasPosibles(p: PreferenciasPlan, recetas: Receta[] = RECETAS): Receta[] {
  return recetas.filter((r) => respetaRestricciones(r, p.restricciones) && sePuedePreparar(r, p.electrodomesticos));
}

function presupuestoPorDia(p: PreferenciasPlan) {
  return p.presupuesto / Math.max(1, p.dias.length);
}

export function puntaje(r: Receta, p: PreferenciasPlan): number {
  let puntos = 0;

  if (p.antojos.includes(r.antojoId)) puntos += 4;
  else if (r.etiquetas.some((e) => p.antojos.includes(e))) puntos += 2;

  const principiante = p.nivelCocina === "principiante" || p.perfil === "estudiante";
  if (principiante) {
    puntos += r.dificultad === 1 ? 3 : r.dificultad === 3 ? -4 : 0;
    if (r.tiempoMin > 45) puntos -= 2;
  } else if (p.nivelCocina === "experto" && r.dificultad === 3) {
    puntos += 1;
  }

  if (p.perfil === "foraneo" && p.region && r.region === p.region) puntos += 5;

  if (p.objetivo === "musculo" && r.etiquetas.includes("proteica")) puntos += 4;
  if ((p.objetivo === "bajar" || p.objetivo === "sano") && r.etiquetas.includes("saludable")) puntos += 4;

  if (p.perfil === "comer-rico" && r.etiquetas.includes("criolla")) puntos += 1;

  if (p.presupuesto > 0 && r.precio > presupuestoPorDia(p)) puntos -= 4;

  return puntos;
}

// Las mejores recetas posibles, de más a menos puntaje. Los empates conservan
// el orden de `recetas`: con la lista fija de la app el mismo perfil da siempre
// el mismo plan, y con las que manda la base (ya mezcladas) la semana varía.
export function candidatas(p: PreferenciasPlan, max = 30, recetas: Receta[] = RECETAS): Receta[] {
  return recetasPosibles(p, recetas)
    .map((r, i) => ({ r, i, puntos: puntaje(r, p) }))
    .sort((a, b) => b.puntos - a.puntos || a.i - b.i)
    .slice(0, max)
    .map(({ r }) => r);
}

const NOMBRE_REGION: Record<Region, string> = { costa: "la costa", sierra: "la sierra", selva: "la selva" };

// Por qué esta receta le sirve a esta persona, en una frase corta. Es lo que
// se muestra cuando el plan lo arman las reglas; la IA escribe el suyo.
export function razonDe(r: Receta, p: PreferenciasPlan): string {
  const motivos: string[] = [];
  if (p.perfil === "foraneo" && p.region && r.region === p.region) {
    motivos.push(`Sabor de ${NOMBRE_REGION[p.region]}, como en casa`);
  }
  if (p.objetivo === "musculo" && r.etiquetas.includes("proteica")) motivos.push("Alto en proteína");
  if ((p.objetivo === "bajar" || p.objetivo === "sano") && r.etiquetas.includes("saludable")) {
    motivos.push("Ligero y saludable");
  }
  if ((p.nivelCocina === "principiante" || p.perfil === "estudiante") && r.dificultad === 1) {
    motivos.push("Fácil, ideal para empezar");
  }
  const antojo = p.antojos.find((a) => r.etiquetas.includes(a));
  if (antojo) motivos.push(`Va con tu antojo ${NOMBRE_ANTOJO[antojo] ?? antojo}`);
  if (motivos.length === 0) {
    motivos.push(p.presupuesto > 0 && r.precio <= presupuestoPorDia(p) ? "Rico y dentro de tu presupuesto" : "Para variar la semana");
  }
  return motivos.slice(0, 2).join(" · ");
}

// Plan sin IA: para cada día, la receta con más puntos, castigando las que ya
// salieron para que la semana varíe. Si ninguna receta cumple las
// restricciones, devuelve [] en vez de saltárselas.
export function armarPlanLocal(p: PreferenciasPlan, recetas: Receta[] = RECETAS): DiaPlan[] {
  const posibles = candidatas(p, Number.POSITIVE_INFINITY, recetas);
  if (posibles.length === 0) return [];
  const usos = new Map<string, number>();
  let anterior: Receta | null = null;
  const plan: DiaPlan[] = [];
  for (const dia of DIAS.filter((d) => p.dias.includes(d))) {
    let mejor = posibles[0];
    let mejorPuntos = Number.NEGATIVE_INFINITY;
    for (const r of posibles) {
      const puntos =
        puntaje(r, p) - 6 * (usos.get(r.id) ?? 0) - (anterior && anterior.antojoId === r.antojoId ? 1 : 0);
      if (puntos > mejorPuntos) {
        mejor = r;
        mejorPuntos = puntos;
      }
    }
    usos.set(mejor.id, (usos.get(mejor.id) ?? 0) + 1);
    anterior = mejor;
    plan.push({ dia, recetaId: mejor.id, razon: razonDe(mejor, p) });
  }
  return plan;
}
