// Cliente de la Edge Function `generar-plan` (Supabase → Gemini).
//
// Por ahora esto NO está conectado al wizard — `generarPlanSemana()` en
// catalogo.ts sigue siendo lo que arma el plan por defecto. Esta función
// queda lista para probarla o enchufarla cuando se decida.
import { supabase } from "./supabase";
import { DIAS, INGREDIENTES, type DiaConReceta, type IngredienteReceta, type Receta } from "./catalogo";

type RespuestaPlato = {
  dia: string;
  nombre: string;
  antojoId: string;
  tiempoMin: number;
  ingredientes: IngredienteReceta[];
  pasos: string[];
};

type RespuestaGeminiPlan = { platos: RespuestaPlato[] } | { error: string; detalle?: string };

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// La IA nunca decide precios: se estiman acá, contra el catálogo real de
// INGREDIENTES (la oferta más barata de cada uno). Los ingredientes que no
// están en el catálogo (carne, condimentos, etc.) se estiman con un monto
// fijo, dejando claro que es un estimado y no un precio real.
const ESTIMADO_INGREDIENTE_SIN_CATALOGO = 4;

function estimarPrecio(ingredientes: IngredienteReceta[]): number {
  return ingredientes.reduce((total, item) => {
    const ingrediente = item.ingredienteId
      ? INGREDIENTES.find((i) => i.id === item.ingredienteId)
      : undefined;
    if (!ingrediente) return total + ESTIMADO_INGREDIENTE_SIN_CATALOGO;
    const masBarato = Math.min(...ingrediente.ofertas.map((o) => o.precio));
    return total + masBarato;
  }, 0);
}

function iconoParaIngredientes(ingredientes: IngredienteReceta[]): string {
  const conCatalogo = ingredientes.find((i) => i.ingredienteId);
  return conCatalogo?.ingredienteId ?? INGREDIENTES[0].id;
}

export async function generarPlanConIA(input: {
  dias: string[];
  antojos: string[];
  restricciones: string[];
  presupuesto: number;
  personas: number;
}): Promise<DiaConReceta[]> {
  const { data, error } = await supabase.functions.invoke<RespuestaGeminiPlan>("generar-plan", {
    body: input,
  });

  if (error) throw new Error(`No se pudo generar el plan con IA: ${error.message}`);
  if (!data || "error" in data) {
    throw new Error(`Gemini no devolvió un plan válido: ${data && "error" in data ? data.error : "respuesta vacía"}`);
  }
  // Sin al menos un plato no hay con qué rellenar los días que falten.
  if (!Array.isArray(data.platos) || data.platos.length === 0) {
    throw new Error("Gemini no devolvió un plan válido: no propuso ningún plato");
  }

  const diasOrdenados = DIAS.filter((d) => input.dias.includes(d));

  return diasOrdenados.map((dia) => {
    const plato = data.platos.find((p) => p.dia === dia) ?? data.platos[0];
    const receta: Receta = {
      id: `ia-${slug(plato.nombre)}`,
      nombre: plato.nombre,
      antojoId: plato.antojoId,
      ingredienteIcono: iconoParaIngredientes(plato.ingredientes),
      tiempoMin: plato.tiempoMin,
      precio: Math.round(estimarPrecio(plato.ingredientes)),
      ingredientes: plato.ingredientes,
      pasos: plato.pasos,
    };
    return { dia, receta };
  });
}
