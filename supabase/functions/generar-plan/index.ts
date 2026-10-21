// Edge Function: generar-plan
//
// Recibe el perfil del wizard (quién es, qué puede comer, qué tiene en su
// cocina, días, antojos, presupuesto) y devuelve un plato por día con una frase
// de por qué le sirve. Gemini NO inventa recetas: las reglas compartidas con la
// app (_shared/plan.ts) filtran primero lo que no se negocia (restricciones,
// electrodomésticos) y Gemini solo puede elegir ids de esa lista. Si Gemini
// falla, responde el plan de las reglas. Los precios los pone la app.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  ANTOJOS_IDS,
  DIAS,
  ELECTRODOMESTICOS_IDS,
  NIVELES_COCINA,
  OBJETIVOS,
  PERFILES,
  REGIONES,
  RESTRICCIONES_IDS,
  armarPlanLocal,
  candidatas,
  esReceta,
  razonDe,
  respetaRestricciones,
  sePuedePreparar,
  type DiaPlan,
  type PreferenciasPlan,
} from "../_shared/plan.ts";
import { RECETAS, type Receta } from "../_shared/recetas.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// Las cuentas nuevas de Google AI Studio ya no tienen acceso a gemini-2.5-flash;
// cada proyecto de Supabase puede fijar otro con `supabase secrets set GEMINI_MODEL=...`.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
// Modelo liviano de respaldo: elige igual de bien entre ids y responde rápido.
const GEMINI_MODEL_RAPIDO = Deno.env.get("GEMINI_MODEL_RAPIDO") ?? "gemini-flash-lite-latest";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cuántas recetas ve Gemini para elegir: suficientes para variar la semana,
// pocas para que el prompt sea corto, rápido y barato.
const MAX_CANDIDATAS = 20;

// Elegir 7 ids de una lista no necesita que el modelo "piense" mucho, y
// pensando tardaba más que el plazo. Cada generación de Gemini lo configura
// distinto; para otros modelos no se manda nada.
function configPensamiento(modelo: string, nivel: "minimal" | "low") {
  if (modelo.startsWith("gemini-2.5-flash")) return { thinkingConfig: { thinkingBudget: 0 } };
  if (modelo.startsWith("gemini-3")) return { thinkingConfig: { thinkingLevel: nivel } };
  return {};
}

function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function listaDe(valor: unknown, permitidos: string[]): valor is string[] {
  return (
    Array.isArray(valor) &&
    valor.length <= permitidos.length &&
    valor.every((v) => typeof v === "string" && permitidos.includes(v))
  );
}

function unoDe<T extends string>(valor: unknown, permitidos: readonly T[]): T | null | undefined {
  if (valor === null || valor === undefined) return null;
  return typeof valor === "string" && (permitidos as readonly string[]).includes(valor) ? (valor as T) : undefined;
}

// Todo lo que llega termina en el prompt, así que solo se aceptan los valores
// que la app puede mandar: nada de texto libre que cambie las instrucciones ni
// listas enormes que disparen el costo en tokens.
function validar(body: unknown): PreferenciasPlan | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const antojos = b.antojos ?? [];
  const restricciones = b.restricciones ?? [];
  const electrodomesticos = b.electrodomesticos ?? [];
  if (!listaDe(b.dias, DIAS) || b.dias.length === 0) return null;
  if (!listaDe(antojos, ANTOJOS_IDS)) return null;
  if (!listaDe(restricciones, RESTRICCIONES_IDS)) return null;
  if (!listaDe(electrodomesticos, ELECTRODOMESTICOS_IDS)) return null;
  if (typeof b.presupuesto !== "number" || !Number.isFinite(b.presupuesto)) return null;
  if (b.presupuesto < 0 || b.presupuesto > 10000) return null;
  if (!Number.isInteger(b.personas) || (b.personas as number) < 1 || (b.personas as number) > 12) return null;
  const perfil = unoDe(b.perfil, PERFILES);
  const region = unoDe(b.region, REGIONES);
  const objetivo = unoDe(b.objetivo, OBJETIVOS);
  const nivelCocina = unoDe(b.nivelCocina, NIVELES_COCINA);
  if (perfil === undefined || region === undefined || objetivo === undefined || nivelCocina === undefined) {
    return null;
  }
  return {
    dias: b.dias,
    antojos,
    restricciones,
    electrodomesticos,
    presupuesto: b.presupuesto,
    personas: b.personas as number,
    perfil,
    region,
    objetivo,
    nivelCocina,
  };
}

// El anon key va dentro del APK, así que pasar la verificación de JWT del
// gateway no basta: exigimos una sesión de usuario real para no regalar
// la cuota de Gemini a cualquiera que lo extraiga. Con ese mismo cliente (y
// los permisos de ese usuario) se leen las recetas del dataset.
async function clienteDelUsuario(req: Request): Promise<SupabaseClient | null> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return null;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await supabase.auth.getUser();
  return !error && data.user ? supabase : null;
}

// Qué dietas puede comer, en los términos de la columna `dieta`.
function dietasPermitidas(restricciones: string[]): string[] {
  if (restricciones.includes("vegano")) return ["vegana"];
  if (restricciones.includes("vegetariano")) return ["vegetariana", "vegana"];
  if (restricciones.includes("pescetariano")) return ["pescado", "vegetariana", "vegana"];
  return ["carne", "pescado", "vegetariana", "vegana"];
}

// Cuántas recetas del dataset se traen para que las reglas elijan las mejores.
const MAX_DEL_DATASET = 80;

// Recetas del dataset que la base ya filtró por lo que no se negocia (ver la
// migración recetas_del_dataset). Se revisan de nuevo con las mismas reglas
// que la app: si la base y las reglas no coinciden, gana la más estricta. Si
// la consulta falla, el plan sale solo con las recetas fijas de la app.
async function recetasDelDataset(supabase: SupabaseClient, p: PreferenciasPlan): Promise<Receta[]> {
  const principiante = p.nivelCocina === "principiante" || p.perfil === "estudiante";
  const { data, error } = await supabase.rpc("recetas_candidatas", {
    dietas: dietasPermitidas(p.restricciones),
    sin_gluten: p.restricciones.includes("sin-gluten"),
    sin_lactosa: p.restricciones.includes("sin-lactosa"),
    electrodomesticos: p.electrodomesticos,
    antojos: p.antojos,
    region: p.perfil === "foraneo" ? p.region : null,
    max_dificultad: principiante ? 2 : 3,
    max_precio: p.presupuesto / Math.max(1, p.dias.length),
    cuantas: MAX_DEL_DATASET,
  });
  if (error) {
    console.error("No se pudieron leer las recetas del dataset", error.message);
    return [];
  }
  return (Array.isArray(data) ? data : []).filter(
    (r): r is Receta =>
      esReceta(r) && respetaRestricciones(r, p.restricciones) && sePuedePreparar(r, p.electrodomesticos),
  );
}

// La app solo conoce las recetas fijas; a las del dataset les manda la copia.
function conCopias(plan: DiaPlan[], lista: Receta[]): DiaPlan[] {
  const fijas = new Set(RECETAS.map((r) => r.id));
  const porId = new Map(lista.map((r) => [r.id, r]));
  return plan.map((d) => (fijas.has(d.recetaId) ? d : { ...d, receta: porId.get(d.recetaId) }));
}

const PERFIL_TEXTO: Record<string, string> = {
  estudiante: "Es estudiante y recién está aprendiendo a cocinar solo.",
  foraneo: "Vive lejos de su tierra y extraña su comida de siempre.",
  objetivo: "Tiene un objetivo con su alimentación.",
  "comer-rico": "Solo quiere comer rico durante la semana.",
};
const REGION_TEXTO: Record<string, string> = {
  costa: "Extraña la comida de la costa.",
  sierra: "Extraña la comida de la sierra.",
  selva: "Extraña la comida de la selva.",
};
const OBJETIVO_TEXTO: Record<string, string> = {
  sano: "Quiere comer más sano.",
  musculo: "Quiere ganar masa muscular.",
  bajar: "Quiere bajar de peso.",
};
const NIVEL_TEXTO: Record<string, string> = {
  principiante: "En la cocina es principiante.",
  "me-defiendo": "En la cocina se defiende.",
  experto: "Le encanta cocinar y se anima con recetas elaboradas.",
};

function describirReceta(r: Receta): string {
  const ingredientes = r.ingredientes.slice(0, 4).map((i) => i.texto).join("; ");
  return `- ${r.id} | ${r.nombre} | ${r.region ?? r.pais ?? r.cocina} | dificultad ${r.dificultad}/3 | ${r.tiempoMin} min | ` +
    `S/ ${r.precio} | ${r.etiquetas.join(", ")} | ${ingredientes}`;
}

function construirPrompt(p: PreferenciasPlan, lista: Receta[]): string {
  const sobreElUsuario = [
    p.perfil ? PERFIL_TEXTO[p.perfil] : "",
    p.region ? REGION_TEXTO[p.region] : "",
    p.objetivo ? OBJETIVO_TEXTO[p.objetivo] : "",
    p.nivelCocina ? NIVEL_TEXTO[p.nivelCocina] : "",
  ].filter(Boolean).join(" ");

  return `Eres el asistente de Mikhuna, una app peruana que arma el plan de comidas de la semana.

Sobre el usuario: ${sobreElUsuario || "No dijo nada más sobre sí mismo."}
Antojos de esta semana: ${p.antojos.length ? p.antojos.join(", ") : "ninguno en especial"}
Cocina para ${p.personas} persona(s). Presupuesto aproximado de la semana: S/ ${p.presupuesto}.
Días que va a cocinar: ${p.dias.join(", ")}

Estas son las ÚNICAS recetas que puedes usar. Ya cumplen sus restricciones alimentarias y se pueden hacer con lo que
tiene en su cocina (id | nombre | origen | dificultad | tiempo | precio | estilo | ingredientes):
${lista.map(describirReceta).join("\n")}

Elige una receta por cada día, usando exactamente el id de la lista. Piensa en esta persona: su nivel en la cocina, su
objetivo, la comida que extraña, sus antojos y su presupuesto. Varía la semana (no repitas una receta si hay otras que
le sirvan) y evita poner dos días seguidos platos muy parecidos.

Para cada día escribe en "razon" una frase corta en español (máximo 90 caracteres), hablándole de tú, de por qué ese
plato le sirve (por ejemplo: "Fácil y con proteína para después del gym"). No inventes datos que no estén en la lista.

Responde SOLO con este JSON, sin texto antes ni después:
{"platos":[{"dia":"${p.dias[0]}","recetaId":"<id de la lista>","razon":"<frase>"}]}`;
}

function esquemaRespuesta(p: PreferenciasPlan, lista: Receta[]) {
  return {
    type: "object",
    properties: {
      platos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dia: { type: "string", enum: p.dias },
            recetaId: { type: "string", enum: lista.map((r) => r.id) },
            razon: { type: "string" },
          },
          required: ["dia", "recetaId", "razon"],
        },
      },
    },
    required: ["platos"],
  };
}

// Cuánto se le espera a Gemini en total. Tiene que ser bastante menos que el
// límite de Supabase (~150 s, si no la función muere con 546) y que lo que la
// app espera (lib/ia.ts): pasado esto se responde con las reglas.
const PLAZO_GEMINI_MS = 18000;

// Formas de pedirle el plan a Gemini. Se lanzan todas a la vez y gana la
// primera que devuelva un plan válido; las demás se cancelan. Así, si una
// configuración es lenta o el modelo está saturado, otra responde a tiempo.
type Variante = { nombre: string; modelo: string; conEsquema: boolean; config: Record<string, unknown> };

function variantes(): Variante[] {
  return [
    { nombre: "esquema", modelo: GEMINI_MODEL, conEsquema: true, config: configPensamiento(GEMINI_MODEL, "minimal") },
    { nombre: "libre", modelo: GEMINI_MODEL, conEsquema: false, config: configPensamiento(GEMINI_MODEL, "low") },
    { nombre: "rapido", modelo: GEMINI_MODEL_RAPIDO, conEsquema: false, config: {} },
  ];
}

class FalloGemini extends Error {}

// Sin esquema el modelo a veces envuelve el JSON en ```json ... ```.
function extraerJson(texto: string): unknown {
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(limpio);
}

async function pedirPlan(
  v: Variante,
  prompt: string,
  esquema: unknown,
  permitidos: Set<string>,
  signal: AbortSignal,
): Promise<unknown[]> {
  // La clave va en un header y no en la URL para que no aparezca en
  // mensajes de error de red ni en logs.
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${v.modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        ...(v.conEsquema ? { responseSchema: esquema } : {}),
        temperature: 0.7,
        // Los modelos que "piensan" gastan parte de este límite antes de
        // responder; con muy poco se cortan sin dar el plan.
        maxOutputTokens: 8192,
        ...v.config,
      },
    }),
  });
  if (!res.ok) {
    console.error(`Gemini (${v.nombre}, ${v.modelo}) falló`, res.status, await res.text());
    throw new FalloGemini(String(res.status));
  }
  const data = await res.json();
  const texto = data.candidates?.[0]?.content?.parts?.find((parte: { text?: string }) => parte.text)?.text;
  // finishReason dice por qué vino vacío (MAX_TOKENS, SAFETY...), sin datos internos.
  if (!texto) throw new FalloGemini(`sin_texto_${data.candidates?.[0]?.finishReason ?? "vacia"}`);
  let platos: unknown;
  try {
    platos = (extraerJson(texto) as { platos?: unknown }).platos;
  } catch {
    throw new FalloGemini("json_invalido");
  }
  const validos = Array.isArray(platos) &&
    platos.some((x) => x && typeof x === "object" && permitidos.has((x as { recetaId?: string }).recetaId ?? ""));
  if (!validos) throw new FalloGemini("ids_invalidos");
  return platos as unknown[];
}

// La primera variante que dé un plan válido gana. Si ninguna llega a tiempo,
// el error trae qué le pasó a cada una, para saber qué ajustar.
async function elegirConGemini(p: PreferenciasPlan, lista: Receta[]): Promise<{ platos: unknown[]; variante: string }> {
  const prompt = construirPrompt(p, lista);
  const esquema = esquemaRespuesta(p, lista);
  const permitidos = new Set(lista.map((r) => r.id));
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(new DOMException("plazo", "TimeoutError")), PLAZO_GEMINI_MS);
  const fallos: string[] = [];
  try {
    return await Promise.any(
      variantes().map((v) =>
        pedirPlan(v, prompt, esquema, permitidos, control.signal).then(
          (platos) => ({ platos, variante: `${v.nombre}:${v.modelo}` }),
          (err) => {
            const motivo = err instanceof FalloGemini ? err.message : control.signal.aborted ? "tardo" : "red";
            fallos.push(`${v.nombre}:${motivo}`);
            throw err;
          },
        )
      ),
    );
  } catch {
    throw new FalloGemini(fallos.sort().join(","));
  } finally {
    clearTimeout(reloj);
    control.abort(); // corta las variantes que siguen esperando
  }
}

// Lo que devuelve Gemini se revisa igual: cada día pedido con un id de la
// lista. Un día que falte o venga mal se completa con el plan de las reglas.
function completarPlan(p: PreferenciasPlan, lista: Receta[], platos: unknown): DiaPlan[] {
  const porId = new Map(lista.map((r) => [r.id, r]));
  const deReglas = armarPlanLocal(p, lista);
  return deReglas.map((porDefecto) => {
    const elegido = Array.isArray(platos)
      ? platos.find((x) => x && typeof x === "object" && x.dia === porDefecto.dia)
      : undefined;
    const receta = elegido && typeof elegido.recetaId === "string" ? porId.get(elegido.recetaId) : undefined;
    if (!receta) return porDefecto;
    const razon = typeof elegido.razon === "string" ? elegido.razon.trim().slice(0, 140) : "";
    return { dia: porDefecto.dia, recetaId: receta.id, razon: razon || razonDe(receta, p) };
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabase = await clienteDelUsuario(req);
  if (!supabase) return json({ error: "Inicia sesión para generar un plan" }, 401);

  let crudo: unknown;
  try {
    crudo = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const p = validar(crudo);
  if (!p) return json({ error: "Datos del plan inválidos" }, 400);

  // Primero las del dataset (vienen mezcladas), después las fijas: a igual
  // puntaje gana la del dataset, para que la semana no se repita.
  const lista = candidatas(p, MAX_CANDIDATAS, [...(await recetasDelDataset(supabase, p)), ...RECETAS]);
  // Nada cumple sus restricciones con su cocina: mejor un plan vacío que uno
  // que se las salte.
  if (lista.length === 0) return json({ platos: [], fuente: "reglas", motivo: "sin_recetas" });

  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY no configurada; se responde con las reglas");
    return json({ platos: conCopias(armarPlanLocal(p, lista), lista), fuente: "reglas", motivo: "sin_clave" });
  }

  const inicio = Date.now();
  try {
    const { platos, variante } = await elegirConGemini(p, lista);
    return json({ platos: conCopias(completarPlan(p, lista, platos), lista), fuente: "ia", variante, ms: Date.now() - inicio });
  } catch (err) {
    // El detalle de cada fallo queda en los logs; a la app solo le llega un
    // resumen corto (p. ej. "esquema:tardo,libre:429,rapido:404").
    const motivo = err instanceof FalloGemini ? err.message : "error";
    if (!(err instanceof FalloGemini)) console.error("Error inesperado en generar-plan", err);
    return json({ platos: conCopias(armarPlanLocal(p, lista), lista), fuente: "reglas", motivo, ms: Date.now() - inicio });
  }
});
