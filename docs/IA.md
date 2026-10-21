# Generación de planes con IA (Gemini)

Estado: **la Edge Function ya está desplegada y probada, pero el wizard todavía no la usa.** `generarPlanSemana()` (en `lib/catalogo.ts`) sigue siendo lo que arma el plan por defecto. Esto es intencional: primero se valida que la IA responda bien de forma aislada, y recién después se conecta al flujo real.

## Cómo funciona

```
App (RN)  →  supabase.functions.invoke("generar-plan")  →  Edge Function (Deno)  →  Gemini API
```

- La API key de Gemini vive como **secreto del proyecto de Supabase** (`GEMINI_API_KEY`), nunca en el cliente ni en el repo. Se configura con `supabase secrets set GEMINI_API_KEY=...`.
- El modelo se puede cambiar por proyecto con el secreto `GEMINI_MODEL` (por defecto `gemini-2.5-flash`). Las cuentas nuevas de Google AI Studio ya no tienen acceso a `gemini-2.5-flash` y responden `404`; en ese caso: `supabase secrets set GEMINI_MODEL=gemini-3.8-flash` y volver a desplegar.
- La Edge Function está en [`supabase/functions/generar-plan/index.ts`](../supabase/functions/generar-plan/index.ts), desplegada con:
  ```bash
  npx supabase link --project-ref lvkweyiwzkqtojlylinc
  npx supabase functions deploy generar-plan --no-verify-jwt
  ```
- El cliente de la app está en [`lib/ia.ts`](../lib/ia.ts): `generarPlanConIA({ dias, antojos, restricciones, presupuesto, personas })` devuelve el mismo shape (`DiaConReceta[]`) que `generarPlanSemana()`, así que es un reemplazo directo cuando se decida usarlo.

## Por qué el precio NO lo decide la IA

Le pedimos a Gemini nombre del plato, ingredientes y pasos — nunca precios. Los precios se calculan del lado de la Edge Function/app cruzando cada ingrediente contra `INGREDIENTES` (el catálogo real de tiendas y precios en `lib/catalogo.ts`):

- Si el ingrediente que sugiere la IA calza con uno de nuestro catálogo (se lo pasamos en el prompt con sus ids, y el `responseSchema` de Gemini restringe `ingredienteId` a esa lista exacta con un `enum`), se usa el precio más barato disponible.
- Si no calza (carne, condimentos, arroz, etc. — cosas que hoy no están en `INGREDIENTES`), se usa un estimado fijo por ítem, claramente marcado como estimado en el código (`ESTIMADO_INGREDIENTE_SIN_CATALOGO` en `lib/ia.ts`).

Esto evita que un modelo alucine un precio y engañe al usuario sobre su presupuesto real.

## Probarla manualmente

```bash
curl -s -X POST "https://lvkweyiwzkqtojlylinc.supabase.co/functions/v1/generar-plan" \
  -H "Content-Type: application/json" \
  -d '{"dias":["Lunes","Martes"],"antojos":["criolla"],"restricciones":[],"presupuesto":150,"personas":2}'
```

## Limitaciones conocidas

- La capa gratuita de Gemini (Google AI Studio) tiene límite de requests por minuto y por día — no hay caché todavía, así que cada llamada gasta cuota. Antes de conectarla al wizard en producción conviene cachear el plan generado (por ejemplo, por hash de las respuestas del wizard) para no volver a pedirle a Gemini el mismo plan dos veces.
- La función está desplegada con `--no-verify-jwt` (no exige sesión de usuario) para simplificar las pruebas iniciales. No devuelve ni modifica datos sensibles, pero antes de dejarla en uso real conviene evaluar si debe exigir JWT como el resto de la API.
- **Reintentos:** la Edge Function reintenta hasta 3 veces con espera creciente (0.8 s, 1.6 s, 3.2 s) cuando Gemini responde `503` (sobrecargado) o `429` (cuota); son errores transitorios frecuentes en la capa gratis, sobre todo en horas pico. Si se agotan los reintentos responde `502` con un mensaje claro.
- **Sin fallback automático todavía:** si Gemini sigue fallando, `generarPlanConIA()` lanza un error — quien lo use debe decidir si cae de vuelta a `generarPlanSemana()`. Una cadena de respaldo (otro proveedor gratuito como Groq u OpenRouter) es una mejora posible, pero requiere otra API key.
- **Sin caché:** cada llamada gasta cuota; conviene cachear por hash de las respuestas del wizard antes de conectarlo.

## Página de prueba

Para probar la función con opciones reales (días, antojos, restricciones, presupuesto) sin escribir `curl`, se puede servir una página HTML estática que le pegue directo a la Edge Function (el CORS ya está abierto). No está en el repo porque solo es una herramienta local de pruebas.
