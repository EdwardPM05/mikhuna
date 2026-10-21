# Arquitectura

## Ruteo (expo-router)

Todas las pantallas viven en `app/`, agrupadas por paréntesis (route groups) que no afectan la URL pero organizan el flujo:

- **`(auth)`** — login, registro y recuperar contraseña.
- **`(onboarding)`** — ubicación del usuario (`ubicacion.tsx`, con `mapa.tsx` para confirmarla) y elección de modo ("quiero planear mi semana" vs "quiero pedir algo ahora", `modo.tsx`).
- **`(plan)`** — Flujo A completo: wizard de plan semanal de 8 pasos, generación del plan (`generando.tsx`), lista de compras y detalle de ingrediente y de receta. Ver [FLUJOS.md](FLUJOS.md).
- **`(tabs)`** — las 4 pestañas principales una vez el usuario ya tiene cuenta y ubicación: Plan, Explorar, Pedidos, Perfil.
- **`(delivery)`** — carrito, checkout, seguimiento, calificación y menú de un negocio (`negocio/[id]`). Lo usan tanto el Flujo A como el Flujo B.

Orden de los pasos del wizard (cada pantalla declara su `paso` para la barra de progreso): `quien-eres` (1), `negocio` (2), `hogar` (3), `dias` (4), `presupuesto` (5), `antojo` (6), `restricciones` (7), `electrodomesticos` (8).

`app/_layout.tsx` monta los providers y un `GuardiaSesion`: si la sesión se pierde fuera de `(auth)` (venció, se revocó o se cerró en otro lado), manda al login.

`app/index.tsx` es el punto de entrada: sin sesión va a `(auth)`; con sesión espera a que cargue el plan guardado y va a `(tabs)` si ya hay distrito elegido, o a `(onboarding)` si es la primera vez.

## Estado global (`context/`)

Cuatro contexts de React, sin librería externa de estado:

- **`AuthContext`** — sesión de Supabase. En `__DEV__` auto-loguea con la cuenta de pruebas de `.env.local` (`EXPO_PUBLIC_DEV_EMAIL` / `EXPO_PUBLIC_DEV_PASSWORD`) para iterar más rápido; sin esas variables muestra el login normal. No corre en producción: esa rama se quita del build de release. `loading` no termina hasta que se resuelve ese intento. Expone `nombre` (el del registro o, si falta, lo que va antes de la @ del correo) y traduce al español los errores de Supabase.
- **`PlanWizardContext`** — todas las respuestas del wizard de Flujo A: perfil ("¿Quién eres?"), distrito, negocio, días, presupuesto, antojos, restricciones, electrodomésticos, región (la comida que extraña, si es foráneo), objetivo, nivel de cocina, ingredientes marcados como comprados (`comprados`) y en qué tienda quiere comprar cada uno (`preferenciasCompra`). También guarda el plan ya elegido: `planSemana` (un plato por día) y `planFuente` (`"ia"` o `"reglas"`). Se guarda para que no cambie cada vez que se abre la app. Un plan hecho antes de que existiera `planSemana` tiene `planFuente: null`, y `platosDeLaSemana()` lo arma con las reglas al abrirlo.
  Se guarda en la tabla `planes` de Supabase (un plan por usuario, en `jsonb`) con un upsert 800 ms después del último cambio, y se mantiene una copia en AsyncStorage (`mikhuna:plan:<userId>`) para abrir rápido y sin internet. Si no se pudo leer del servidor, los cambios quedan solo en el celular y no se suben, para que un plan viejo no pise uno más nuevo hecho en otro dispositivo. `listo` indica que ya se leyó.
- **`CartContext`** — carrito de delivery, agnóstico de si el pedido viene de Flujo A (ingredientes) o Flujo B (platos de un negocio): cada ítem es autocontenido (`{ id, nombre, precio, cantidad }`), sin necesitar volver a buscar en un catálogo. `llenarCon(negocioId, items)` reemplaza el carrito por los ingredientes de una tienda ("Pedir de X" en la lista de compras). El carrito se vacía al cambiar de usuario.
- **`OrdersContext`** — historial de pedidos del usuario: checkout crea el pedido, `seguimiento` avanza su `estado` (`confirmado` → `preparando` → `en-camino` → `entregado`) y `calificar` guarda las estrellas. Vive en la tabla `pedidos` de Supabase: crear un pedido espera la respuesta del servidor (checkout muestra el error si falla); estado y calificación se guardan por detrás. Los pedidos que hubieran quedado en AsyncStorage de la versión anterior se suben una vez.

## Capa de datos (`lib/`)

### `lib/catalogo.ts` — catálogo y datos de prueba

Negocios e ingredientes son datos de prueba en el celular (todavía no hay backend de catálogo):

- **`NEGOCIOS`** — bodegas, mercados, restaurantes y supermercados, cada uno con categoría, rating, tiempo de entrega.
- **`INGREDIENTES`** — catálogo de ingredientes con **ofertas multi-tienda**: cada ingrediente tiene un array `ofertas: { negocioId, precio, unidad }[]`, y `ofertaElegida()` resuelve cuál usar (la preferencia guardada del usuario, o la más barata por defecto).
- **`RECETAS`** — re-exportadas desde `supabase/functions/_shared/recetas.ts` y con la foto agregada (`foto`, solo donde existe). Ver la sección siguiente.
- **`TOTAL_PASOS`** (= 8) — cantidad de pasos del wizard, para la barra de progreso de `WizardScreen`.
- **`ANTOJOS`, `RESTRICCIONES`, `ELECTRODOMESTICOS`, `DISTRITOS`, `DIAS`** — catálogos de opciones del wizard. `DIAS` viene de `_shared/plan.ts`.

### `supabase/functions/_shared/` — recetas y reglas compartidas

La app y la Edge Function `generar-plan` usan los mismos dos archivos, así la IA solo puede elegir entre recetas que la app conoce:

- **`recetas.ts`** — las 20 recetas (`RECETAS`). Cada una tiene antojo principal y etiquetas, región, dieta (`carne`, `pescado`, `vegetariana`, `vegana`), sin gluten / sin lactosa, electrodomésticos que requiere, dificultad (1-3), tiempo, precio, `ingredientes: { texto, ingredienteId? }[]` y `pasos: string[]`. El `ingredienteId` es opcional y solo existe cuando ese ingrediente también está en `INGREDIENTES`, lo que permite cruzarlo con `comprados` y mostrar "Ya comprado" en la pantalla de receta.
- **`plan.ts`** — las reglas: ids válidos (`ANTOJOS_IDS`, `RESTRICCIONES_IDS`, `ELECTRODOMESTICOS_IDS`, `PERFILES`, `OBJETIVOS`, `NIVELES_COCINA`), `recetasPosibles()` (filtro duro: restricciones y electrodomésticos), `candidatas()`, `puntaje()` (quién eres, antojos, presupuesto y nivel de cocina dan puntos para ordenar), `razonDe()` y `armarPlanLocal()`.

Esos archivos no importan nada de React Native, así que corren también en Deno. Por eso se importan con extensión `.ts` (`allowImportingTsExtensions`).

### `lib/ia.ts` — armar el plan semanal

- **`armarPlan(prefs)`** — intenta `generarPlanConIA()`: llama a la Edge Function `generar-plan` (espera máxima de 22 s) y revisa la respuesta día por día (que cada receta exista y esté permitida). Si algo falla, arma el plan con `armarPlanLocal()` y devuelve `fuente: "reglas"`. Si ninguna receta cumple las restricciones, devuelve `[]`. La usa `app/(plan)/generando.tsx`.
- **`preferenciasDe(data)`** — convierte las respuestas del wizard (`PlanData`) en `PreferenciasPlan`.
- **`platosDeLaSemana(data)`** — lo que muestra "Tu semana": el `planSemana` guardado, o las reglas al vuelo si el plan es de antes de `planFuente`.

## Componentes compartidos (`components/`)

- **`WizardScreen`** — wrapper de las 8 pantallas del wizard de Flujo A: header con barra de progreso + mascota caminando sincronizada al paso actual, y contenido centrado verticalmente.
- **`BrandButton`** — botón primario/outline reutilizado en toda la app.
- **`CampoTexto`** — campo de texto de login, registro y recuperar contraseña.
- **`SafeAreaView`** — envoltorio de `react-native-safe-area-context`. En el celular es el original; en web (`SafeAreaView.web.tsx`) es un `View` plano para que las clases de Tailwind (`px-6`) no se pierdan. Todas las pantallas lo importan de acá.
- **`PhoneFrame`** (en `app/_layout.tsx`) — solo en web: limita la app a 430 px de ancho y la centra. Ver [LOCALHOST.md](LOCALHOST.md).
- **`KitchenScene`** — la escena interactiva de "¿qué tienes en tu cocina?": fondo de cocina + electrodomésticos posicionados a mano (por nivel: básica/promedio/avanzada), tocables para marcar cuáles tiene el usuario.

## Multi-store: por qué existe `preferenciasCompra`

El modelo evitó a propósito depender de "un solo negocio vende todo el plan": cada ingrediente puede venderse en varias tiendas a distinto precio, y el usuario decide (o deja que se elija automáticamente la más barata) dónde comprar cada uno. `preferenciasCompra: Record<ingredienteId, negocioId>` guarda esa decisión, y tanto la lista de compras como el carrito de delivery la leen para agrupar por tienda.

## Backend (`supabase/`)

- **`functions/generar-plan/index.ts`** — Edge Function (Deno). Valida las preferencias que llegan, toma hasta 20 recetas candidatas con `_shared/plan.ts` y le pide a Gemini un plato por día, eligiendo solo entre esas recetas (plazo de 18 s; modelo configurable con `GEMINI_MODEL` y `GEMINI_MODEL_RAPIDO`). Si Gemini no responde o su respuesta no sirve, responde el plan de las reglas (`fuente: "reglas"`). La API key es un secreto del proyecto (`GEMINI_API_KEY`), nunca va al cliente. Ver [IA.md](IA.md).
- **`functions/_shared/`** — `plan.ts` y `recetas.ts`, compartidos con la app (ver arriba).
- **`migrations/`** — `20261021020000_planes_y_pedidos.sql` crea las tablas `planes` y `pedidos`, con RLS. `20261021030000_limites_de_tamano.sql` pone topes de tamaño a los campos de `pedidos` y a `planes.datos`.
- **`templates/`** — plantillas de correo de confirmar registro y recuperar contraseña. Se suben al proyecto con [`scripts/supabase/aplicar-plantillas-correo.ps1`](../scripts/supabase/aplicar-plantillas-correo.ps1), que también puede configurar el SMTP (Resend o Gmail) con las variables de `.env.local`.
- `tsconfig.json` excluye `supabase/functions` porque corre en Deno, no en React Native.
- `supabase/.temp/` (estado local del CLI) está en `.gitignore`.

## Pruebas (`scripts/pruebas/`)

- **`plan.test.ts`** — pruebas de las reglas del plan (`_shared/plan.ts`). Se corren con `npm test` (Node con `--experimental-strip-types`). `tsconfig.json` también excluye esta carpeta.

## Scripts de datos (`scripts/dataset/`)

Pipeline en Python que arma la base de recetas en español a partir de CSV externos (dedupe, limpieza, ingredientes separados, cantidades normalizadas, tabla de peso por unidad) y un visor HTML local para revisarla. Los resultados van a `data/` (ignorado por git). Ver [DATASET.md](DATASET.md).
