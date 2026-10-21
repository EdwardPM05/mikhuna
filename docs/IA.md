# Plan semanal con IA (Gemini) y reglas

Estado: **conectado al wizard.** Al terminar el wizard, la pantalla "Generando" arma el plan: primero con Gemini y, si
eso falla, con las reglas en el mismo celular. El plan queda guardado en `planSemana` (con `planFuente: "ia"` o
`"reglas"`) y "Tu semana" lo muestra con una frase de por qué cada plato le sirve. Por qué se diseñó así:
[ENFOQUE.md](ENFOQUE.md).

## Cómo funciona

```
Wizard ("¿Quién eres?", días, presupuesto, antojos, restricciones, electrodomésticos)
   │
   ▼  lib/ia.ts → armarPlan()
App ──supabase.functions.invoke("generar-plan")──▶ Edge Function (Deno)
                                                     1. valida el perfil (solo valores conocidos)
                                                     2. _shared/plan.ts: filtra restricciones y cocina,
                                                        ordena por perfil → hasta 30 candidatas
                                                     3. Gemini elige 1 id por día + "por qué te va"
                                                        (el esquema solo admite ids de las candidatas)
                                                     4. completa lo que falte con las reglas
   ◀────────────── { platos: [{ dia, recetaId, razon }], fuente: "ia" | "reglas" }
   │
   └─ si no responde en 15 s, falla o devuelve algo que no calza: armarPlanLocal() en el celular
```

- **La IA no inventa recetas ni precios.** Solo elige entre las recetas de
  [`supabase/functions/_shared/recetas.ts`](../supabase/functions/_shared/recetas.ts), las mismas que muestra la app.
  Precios, cantidades y la lista de compras salen siempre del catálogo.
- **Lo que no se negocia lo decide código.** [`_shared/plan.ts`](../supabase/functions/_shared/plan.ts) saca antes de
  llegar a Gemini toda receta que choque con las restricciones (vegano, vegetariano, pescetariano, sin gluten, sin
  lactosa) o que pida un electrodoméstico que la persona no tiene. La app vuelve a revisar la respuesta antes de usarla.
- **Lo que es criterio lo decide la IA:** quién es (estudiante, foráneo, con un objetivo), su nivel en la cocina, sus
  antojos y su presupuesto, y que la semana varíe.
- **Las reglas son el respaldo y también la base:** sin internet, sin cuota o sin `GEMINI_API_KEY`, el plan sale igual.
  `armarPlanLocal()` da puntos por perfil, castiga repetir y nunca se salta una restricción: si nada cumple, devuelve un
  plan vacío y la app le dice a la persona qué ajustar.
- **Un solo código para la app y la función.** `supabase/functions/_shared/` lo importan `lib/catalogo.ts`, `lib/ia.ts`
  y la Edge Function. Por eso importa con extensión `.ts` (Deno lo exige) y el `tsconfig.json` de la app tiene
  `allowImportingTsExtensions`.

## Configuración

- La API key de Gemini vive como **secreto del proyecto de Supabase** (`GEMINI_API_KEY`), nunca en el cliente ni en el
  repo: `npx supabase secrets set GEMINI_API_KEY=...`.
- El modelo se cambia con el secreto `GEMINI_MODEL` (por defecto `gemini-2.5-flash`). Las cuentas nuevas de Google AI
  Studio ya no tienen acceso a `gemini-2.5-flash` y responden `404`; en ese caso:
  `npx supabase secrets set GEMINI_MODEL=gemini-3.8-flash`.
- Desplegar (después de cambiar la función **o** cualquier archivo de `_shared/`):
  ```bash
  npx supabase functions deploy generar-plan --no-verify-jwt
  ```
  Si la función desplegada es más vieja que la app, la respuesta no calza y la app usa las reglas: el plan sale igual,
  pero sin "✨ Elegida para ti con IA".

## Probarla

**Las reglas**, sin internet ni Supabase: `npm test`. Prueba, entre otras cosas, todas las combinaciones de
restricciones con varios tipos de cocina y perfiles: ningún plan puede traer algo que la persona no pueda comer o
preparar.

**La función**, que exige la sesión de un usuario real, así que hace falta su `access_token`. El más fácil de sacar es
el de la app web en modo desarrollo: en la consola del navegador,
`JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.includes("auth-token")))).access_token`.

```bash
curl -s -X POST "https://lvkweyiwzkqtojlylinc.supabase.co/functions/v1/generar-plan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"dias":["Lunes","Martes"],"antojos":["criolla"],"restricciones":["vegano"],"electrodomesticos":["cocina"],
       "presupuesto":150,"personas":2,"perfil":"foraneo","region":"sierra","objetivo":null,"nivelCocina":"principiante"}'
```

Sin token responde `401`; con valores que la app no manda (un día mal escrito, un antojo inventado, más de 12
personas) responde `400`. Cuando responde con las reglas trae `motivo` (`gemini_tardo`, `gemini_429`, `gemini_sin_texto_MAX_TOKENS`…). El detalle queda en los logs del dashboard: https://supabase.com/dashboard/project/lvkweyiwzkqtojlylinc/functions/generar-plan/logs.

## Seguridad y costo

- **Quién puede llamarla:** se despliega con `--no-verify-jwt`, pero la propia función pide un usuario con sesión
  (`auth.getUser()` con el header `Authorization`) y responde `401` si no lo hay. El anon key solo no basta: va dentro
  del APK y cualquiera podría gastarse la cuota de Gemini con él.
- **Entrada cerrada:** solo acepta días, antojos, restricciones, electrodomésticos, perfil, región, objetivo y nivel que
  existen en la app, un presupuesto entre 0 y 10 000 y de 1 a 12 personas. En el prompt no entra texto libre del
  usuario, así que no se le pueden meter instrucciones.
- **Velocidad:** `gemini-3.8-flash` tardaba más de 18 s en elegir. Por eso la función le pide el plan de tres formas a
  la vez (con esquema, sin esquema y con el modelo liviano `gemini-flash-lite-latest`, que se cambia con el secreto
  `GEMINI_MODEL_RAPIDO`) y usa la primera que dé un plan válido; las otras se cancelan. Si ninguna llega en 18 s,
  responde con las reglas. La respuesta trae `variante` y `ms` (o `motivo` con lo que le pasó a cada una).
  Medido el 21 oct 2026: ganó el modelo liviano en 4.7 s.
- **Costo:** cada plan puede gastar hasta 3 llamadas (cada modelo tiene su propia cuota). El prompt lleva como mucho
  20 recetas resumidas.
- **Falta todavía:** un límite de llamadas por usuario (por ejemplo, una tabla `uso_ia` con un máximo por hora) y
  cachear el plan por perfil para no pedirle a Gemini dos veces lo mismo.

## Agregar recetas

Se agregan en `_shared/recetas.ts` con todos sus campos (dieta, gluten, lactosa, electrodomésticos, dificultad,
región, etiquetas) y `npm test` revisa que sean coherentes. Si es un antojo, restricción o electrodoméstico nuevo,
también va en `ANTOJOS_IDS` / `RESTRICCIONES_IDS` / `ELECTRODOMESTICOS_IDS` de `_shared/plan.ts` y en
`lib/catalogo.ts`. Después, volver a desplegar la función. Cuando el dataset se cargue a Supabase, esta lista se
reemplaza por esa tabla ([DATASET.md](DATASET.md)).
