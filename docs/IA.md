# Generación de planes con IA (Gemini)

Estado: **la Edge Function ya está desplegada y probada, pero el wizard todavía no la usa.** `generarPlanSemana()` (en `lib/catalogo.ts`) sigue siendo lo que arma el plan por defecto. Esto es intencional: primero se valida que la IA responda bien de forma aislada, y recién después se conecta al flujo real.

## Cómo funciona

```
App (RN)  →  supabase.functions.invoke("generar-plan")  →  Edge Function (Deno)  →  Gemini API
```

- La API key de Gemini vive como **secreto del proyecto de Supabase** (`GEMINI_API_KEY`), nunca en el cliente ni en el repo. Se configura con `supabase secrets set GEMINI_API_KEY=...`.
- La Edge Function está en [`supabase/functions/generar-plan/index.ts`](../supabase/functions/generar-plan/index.ts), desplegada con:
  ```bash
  npx supabase link --project-ref lpnujzuatgnekirfdxru
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
curl -s -X POST "https://lpnujzuatgnekirfdxru.supabase.co/functions/v1/generar-plan" \
  -H "Content-Type: application/json" \
  -d '{"dias":["Lunes","Martes"],"antojos":["criolla"],"restricciones":[],"presupuesto":150,"personas":2}'
```

## Limitaciones conocidas

- La capa gratuita de Gemini (Google AI Studio) tiene límite de requests por minuto y por día — no hay caché todavía, así que cada llamada gasta cuota. Antes de conectarla al wizard en producción conviene cachear el plan generado (por ejemplo, por hash de las respuestas del wizard) para no volver a pedirle a Gemini el mismo plan dos veces.
- La función está desplegada con `--no-verify-jwt` (no exige sesión de usuario) para simplificar las pruebas iniciales. No devuelve ni modifica datos sensibles, pero antes de dejarla en uso real conviene evaluar si debe exigir JWT como el resto de la API.
- No hay reintentos ni fallback automático todavía: si Gemini falla o se acaba la cuota, `generarPlanConIA()` lanza un error — quien lo use debe decidir si cae de vuelta a `generarPlanSemana()`.
