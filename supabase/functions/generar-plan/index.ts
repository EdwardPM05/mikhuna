// Edge Function: generar-plan
//
// Recibe las respuestas del wizard de Flujo A (días, antojos, restricciones,
// presupuesto, personas) y le pide a Gemini una lista de platos peruanos que
// calcen, uno por día. La IA nunca decide precios: solo devuelve nombres de
// plato, ingredientes y pasos; el precio se resuelve del lado de la app
// contra el catálogo real de ingredientes (lib/catalogo.ts).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// Las cuentas nuevas de Google AI Studio ya no tienen acceso a gemini-2.5-flash;
// cada proyecto de Supabase puede fijar otro con `supabase secrets set GEMINI_MODEL=...`.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Catálogo mínimo para que la IA reutilice nuestros ids cuando el
// ingrediente que sugiere ya existe en nuestra base de datos de compras.
// Si mantienes lib/catalogo.ts, mantén esta lista en sincronía a mano.
const INGREDIENTES_CATALOGO: Record<string, string> = {
  tomate: "Tomate",
  cebolla: "Cebolla morada",
  aji: "Ají amarillo",
  ajo: "Ajo",
  palta: "Palta fuerte",
  limon: "Limón",
  choclo: "Choclo",
  culantro: "Culantro",
};

const ANTOJOS_VALIDOS = [
  "criolla",
  "rapida",
  "saludable",
  "menu-dia",
  "vegetariana",
  "proteica",
  "economica",
  "antojo-chifa",
];

type PlatoRequest = {
  dias: string[];
  antojos: string[];
  restricciones: string[];
  presupuesto: number;
  personas: number;
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    platos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dia: { type: "string" },
          nombre: { type: "string" },
          antojoId: { type: "string", enum: ANTOJOS_VALIDOS },
          tiempoMin: { type: "integer" },
          ingredientes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                texto: { type: "string" },
                ingredienteId: { type: "string", enum: Object.keys(INGREDIENTES_CATALOGO) },
              },
              required: ["texto"],
            },
          },
          pasos: { type: "array", items: { type: "string" } },
        },
        required: ["dia", "nombre", "antojoId", "tiempoMin", "ingredientes", "pasos"],
      },
    },
  },
  required: ["platos"],
};

function construirPrompt(body: PlatoRequest): string {
  const catalogoTexto = Object.entries(INGREDIENTES_CATALOGO)
    .map(([id, nombre]) => `- ${id}: ${nombre}`)
    .join("\n");

  return `Eres un chef peruano armando el plan de comidas semanal de un usuario en una app llamada Mikhuna.

Días que quiere cocinar: ${body.dias.join(", ")}
Antojos elegidos (usa SOLO estos valores para "antojoId", uno por plato): ${body.antojos.length ? body.antojos.join(", ") : ANTOJOS_VALIDOS.join(", ")}
Restricciones alimentarias: ${body.restricciones.length ? body.restricciones.join(", ") : "ninguna"}
Presupuesto semanal aproximado: S/ ${body.presupuesto}
Número de personas por plato: ${body.personas}

Propón un plato peruano real y distinto para cada día de la lista de arriba, que respete las restricciones alimentarias y calce con alguno de los antojos elegidos.

Para cada ingrediente de cada plato: si el ingrediente corresponde a uno de estos ids de nuestro catálogo, inclúyelo como "ingredienteId" exacto (en minúsculas, tal cual aparece aquí); si no corresponde a ninguno, omite el campo "ingredienteId" y deja solo el texto.

Catálogo de ingredientes con id conocido:
${catalogoTexto}

No inventes precios ni los incluyas en la respuesta. Responde solo con platos peruanos reales y pasos de preparación breves y claros en español.`;
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini en la capa gratis devuelve 503 (sobrecargado) o 429 (cuota) seguido,
// sobre todo en horas pico. Son errores transitorios: unos segundos después
// suele funcionar, así que reintentamos con backoff antes de rendirnos.
async function llamarGeminiConReintentos(prompt: string, intentos = 3): Promise<Response> {
  let ultimaRespuesta: Response | null = null;
  for (let intento = 0; intento < intentos; intento++) {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.8,
        },
      }),
    });

    if (res.ok) return res;

    const reintentable = res.status === 503 || res.status === 429;
    ultimaRespuesta = res;
    if (!reintentable || intento === intentos - 1) return res;

    await esperar(800 * Math.pow(2, intento)); // 800ms, 1.6s, 3.2s...
  }
  return ultimaRespuesta!;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY no configurada" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: PlatoRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(body.dias) || body.dias.length === 0) {
    return new Response(JSON.stringify({ error: "Falta el arreglo 'dias'" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const prompt = construirPrompt(body);

  try {
    const geminiRes = await llamarGeminiConReintentos(prompt);

    if (!geminiRes.ok) {
      const detalle = await geminiRes.text();
      const sobrecargado = geminiRes.status === 503 || geminiRes.status === 429;
      return new Response(
        JSON.stringify({
          error: sobrecargado
            ? "Gemini está saturado ahora mismo, intenta de nuevo en unos segundos"
            : "Gemini falló",
          status: geminiRes.status,
          detalle,
        }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const data = await geminiRes.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) {
      return new Response(JSON.stringify({ error: "Respuesta vacía de Gemini", data }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const plan = JSON.parse(texto);
    return new Response(JSON.stringify(plan), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error inesperado", detalle: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
