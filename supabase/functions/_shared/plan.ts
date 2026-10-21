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
    esListaDe(r.pasos, (p) => esTexto(p, 600), 30) &&
    (r.claves === undefined || esListaDe(r.claves, (c) => esTexto(c, 40), 30))
  );
}

// ---------- Ingredientes clave ----------
// Lo que identifica a cada ingrediente para comparar recetas ("400g de
// pechuga de pollo" y "1 pollo entero" son "pollo"). La misma regla está en
// scripts/dataset/exportar_recetas.py: si cambias una, cambia la otra.
const PALABRAS_SUELTAS = new Set(
  ("de del la el los las en y o con para al a sin un una unidad unidades sopera soperas cucharada cucharadas " +
    "cucharadita cucharaditas taza tazas vaso vasos lata latas diente dientes hoja hojas rama ramas ramita " +
    "ramitas manojo manojos atado atados trozo trozos rodaja rodajas filete filetes pechuga pechugas muslo " +
    "muslos jugo zumo salsa g gr grs gramos kg kilo kilos ml litro litros pizca chorro chorrito paquete " +
    "paquetes sobre sobres bolsa pieza piezas cabeza cabezas tallo tallos punado gran grande grandes mediano " +
    "mediana medianos medianas pequeno pequena pequenos pequenas fresco fresca frescos frescas picado picada " +
    "picados picadas molido molida rallado rallada cocido cocida cocidos cocidas entero entera natural " +
    "naturales media medio cuarto presa presas pierna piernas tajada tajadas postre cuchara cucharas cucharilla cucharillas " +
    "cda cdas cdta cdtas").split(" "),
);
// Lo que está en casi toda receta: compartirlo no dice nada.
const DESPENSA = new Set(
  ("sal pimienta ajo cebolla aceite agua azucar laurel harina vino perejil oregano comino vinagre tomillo nuez " +
    "canela mostaza pimenton manteca mantequilla caldo levadura maicena romero curry paprika clavo albahaca " +
    "hierbabuena mayonesa soja soya sillao sillau pan colorante sazonador ajinomoto culantro").split(" "),
);
const SINONIMOS: Record<string, string> = {
  aguacate: "palta", cilantro: "culantro", patata: "papa", judia: "frejol", frijol: "frejol",
  gamba: "langostino", camaron: "langostino", res: "carne", ternera: "carne", vacuno: "carne",
  chancho: "cerdo", maiz: "choclo", ajos: "ajo",
};
const MAX_CLAVES = 15;

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function singular(palabra: string): string {
  let p = palabra;
  if (p.length > 4 && p.endsWith("es") && "lnrdzi".includes(p[p.length - 3])) p = p.slice(0, -2);
  else if (p.length > 3 && p.endsWith("s")) p = p.slice(0, -1);
  return SINONIMOS[p] ?? p;
}

export function claveDe(texto: string): string | null {
  const palabras = sinTildes(texto.replace(/\(.*?\)/g, " ")).match(/[a-z]+/g) ?? [];
  for (const palabra of palabras) {
    if (!PALABRAS_SUELTAS.has(palabra) && palabra.length > 2) {
      const clave = singular(palabra);
      return DESPENSA.has(clave) ? null : clave;
    }
  }
  return null;
}

export function clavesDe(r: Receta): string[] {
  if (r.claves) return r.claves;
  const claves: string[] = [];
  for (const { texto } of r.ingredientes) {
    const clave = claveDe(texto);
    if (clave && !claves.includes(clave)) claves.push(clave);
  }
  return claves.slice(0, MAX_CLAVES);
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

// Qué dietas puede comer, en los términos de la columna `dieta` de public.recetas.
export function dietasPermitidas(restricciones: string[]): string[] {
  if (restricciones.includes("vegano")) return ["vegana"];
  if (restricciones.includes("vegetariano")) return ["vegetariana", "vegana"];
  if (restricciones.includes("pescetariano")) return ["pescado", "vegetariana", "vegana"];
  return ["carne", "pescado", "vegetariana", "vegana"];
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

// Puntos por reusar ingredientes de días anteriores: lo que se compra para
// una receta sirve para otra y no se malogra. Tope bajo para que no gane a lo
// que la persona pidió (antojos, objetivo, restricciones ya filtradas).
const PUNTOS_POR_INGREDIENTE_REUSADO = 2;
const MAX_PUNTOS_REUSO = 4;

// Qué ingredientes de esta receta ya se compraron para un día anterior, y para cuál.
export function ingredientesReusados(r: Receta, anteriores: { dia: string; receta: Receta }[]) {
  const reusados: { clave: string; dia: string }[] = [];
  for (const clave of clavesDe(r)) {
    const previo = anteriores.find((a) => a.receta.id !== r.id && clavesDe(a.receta).includes(clave));
    if (previo) reusados.push({ clave, dia: previo.dia });
  }
  return reusados;
}

// Las claves van sin tildes; para mostrarlas se les devuelve la tilde y el artículo.
const CON_TILDE: Record<string, string> = {
  aji: "ají", limon: "limón", champinon: "champiñón", platano: "plátano", brocoli: "brócoli", atun: "atún",
  salmon: "salmón", jamon: "jamón", frejol: "frejol", pimenton: "pimentón", calabacin: "calabacín",
};
// Cómo se muestra una clave: "aji" -> "ají".
export function nombreDeClave(clave: string): string {
  return CON_TILDE[clave] ?? clave;
}
function conArticulo(clave: string): string {
  const nombre = nombreDeClave(clave);
  return `${clave.endsWith("a") || clave === "carne" || clave === "leche" ? "la" : "el"} ${nombre}`;
}

function razonConReuso(r: Receta, p: PreferenciasPlan, reusados: { clave: string; dia: string }[]): string {
  if (reusados.length === 0) return razonDe(r, p);
  const { clave, dia } = reusados[0];
  return `Aprovecha ${conArticulo(clave)} del ${dia.toLowerCase()} · ${razonDe(r, p).split(" · ")[0]}`;
}

// Plan sin IA: para cada día, la receta con más puntos, castigando las que ya
// salieron para que la semana varíe y premiando las que reusan ingredientes
// de días anteriores. Si ninguna receta cumple las restricciones, devuelve []
// en vez de saltárselas.
export function armarPlanLocal(p: PreferenciasPlan, recetas: Receta[] = RECETAS): DiaPlan[] {
  const posibles = candidatas(p, Number.POSITIVE_INFINITY, recetas);
  if (posibles.length === 0) return [];
  const usos = new Map<string, number>();
  const elegidas: { dia: string; receta: Receta }[] = [];
  const plan: DiaPlan[] = [];
  for (const dia of DIAS.filter((d) => p.dias.includes(d))) {
    const anterior = elegidas.at(-1)?.receta;
    let mejor = posibles[0];
    let mejorPuntos = Number.NEGATIVE_INFINITY;
    let mejorReusados: { clave: string; dia: string }[] = [];
    for (const r of posibles) {
      const reusados = ingredientesReusados(r, elegidas);
      const puntos =
        puntaje(r, p) -
        6 * (usos.get(r.id) ?? 0) -
        (anterior && anterior.antojoId === r.antojoId ? 1 : 0) +
        Math.min(MAX_PUNTOS_REUSO, PUNTOS_POR_INGREDIENTE_REUSADO * reusados.length);
      if (puntos > mejorPuntos) {
        mejor = r;
        mejorPuntos = puntos;
        mejorReusados = reusados;
      }
    }
    usos.set(mejor.id, (usos.get(mejor.id) ?? 0) + 1);
    elegidas.push({ dia, receta: mejor });
    plan.push({ dia, recetaId: mejor.id, razon: razonConReuso(mejor, p, mejorReusados) });
  }
  return plan;
}
