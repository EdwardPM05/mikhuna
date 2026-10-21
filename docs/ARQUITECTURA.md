# Arquitectura

## Ruteo (expo-router)

Todas las pantallas viven en `app/`, agrupadas por paréntesis (route groups) que no afectan la URL pero organizan el flujo:

- **`(auth)`** — login y registro. `app/_layout.tsx` redirige acá si no hay sesión.
- **`(onboarding)`** — ubicación del usuario y elección de modo ("quiero planear mi semana" vs "quiero pedir algo ahora").
- **`(plan)`** — Flujo A completo: wizard de plan semanal + lista de compras + detalle de receta. Ver [FLUJOS.md](FLUJOS.md).
- **`(tabs)`** — las 4 pestañas principales una vez el usuario ya tiene cuenta y ubicación: Plan, Explorar, Pedidos, Perfil.
- **`(delivery)`** — carrito, checkout y seguimiento de un pedido de delivery (usado tanto por Flujo A como Flujo B).

`app/index.tsx` es el punto de entrada: sin sesión va a `(auth)`; con sesión espera a que cargue el plan guardado y va a `(tabs)` si ya hay distrito elegido, o a `(onboarding)` si es la primera vez.

## Estado global (`context/`)

Tres contexts de React, sin librería externa de estado:

- **`AuthContext`** — sesión de Supabase. En `__DEV__` auto-loguea con la cuenta de pruebas de `.env.local` (`EXPO_PUBLIC_DEV_EMAIL` / `EXPO_PUBLIC_DEV_PASSWORD`) para iterar más rápido; sin esas variables muestra el login normal. No corre en producción. `loading` no termina hasta que se resuelve ese intento. Expone `nombre` (el del registro o, si falta, lo que va antes de la @ del correo) y traduce al español los errores de Supabase.
- **`PlanWizardContext`** — todas las respuestas del wizard de Flujo A: distrito, negocio, días, presupuesto, antojos, restricciones, electrodomésticos, ingredientes marcados como comprados (`comprados`) y en qué tienda quiere comprar cada uno (`preferenciasCompra`). Se guarda por usuario en AsyncStorage (`mikhuna:plan:<userId>`) y se vuelve a leer al iniciar sesión; `listo` indica que ya se leyó.
- **`CartContext`** — carrito de delivery, agnóstico de si el pedido viene de Flujo A (ingredientes) o Flujo B (platos de un negocio): cada ítem es autocontenido (`{ id, nombre, precio, cantidad }`), sin necesitar volver a buscar en un catálogo.
- **`OrdersContext`** — historial de pedidos del usuario: checkout crea el pedido, `seguimiento` avanza su `estado` (`confirmado` → `preparando` → `en-camino` → `entregado`) y `calificar` guarda las estrellas. Mientras no exista una tabla en Supabase vive en AsyncStorage (`mikhuna:pedidos:<userId>`), así que es por dispositivo.

## Capa de datos (`lib/catalogo.ts`)

Todo el contenido de prueba (sin backend real aún) vive en un solo archivo:

- **`NEGOCIOS`** — bodegas, mercados, restaurantes y supermercados, cada uno con categoría, rating, tiempo de entrega.
- **`INGREDIENTES`** — catálogo de ingredientes con **ofertas multi-tienda**: cada ingrediente tiene un array `ofertas: { negocioId, precio, unidad }[]`, y `ofertaElegida()` resuelve cuál usar (la preferencia guardada del usuario, o la más barata por defecto).
- **`RECETAS`** — las recetas que puede sugerir el plan semanal. Cada una tiene `ingredientes: { texto, ingredienteId? }[]` — el `ingredienteId` es opcional y solo existe cuando ese ingrediente también está en `INGREDIENTES`, lo que permite cruzarlo con `comprados` y mostrar "Ya comprado" en la pantalla de receta. También tiene `pasos: string[]` (preparación) y, opcionalmente, `foto` (imagen real del plato en vez del ícono genérico).
- **`generarPlanSemana()`** — dado los días y antojos elegidos, arma la lista de `{ dia, receta }` de la semana (cíclico sobre las recetas que matchean los antojos).
- **`ANTOJOS`, `RESTRICCIONES`, `ELECTRODOMESTICOS`, `DISTRITOS`, `DIAS`** — catálogos de opciones del wizard.

Este archivo es el que se reemplazaría por llamadas reales a Supabase / un modelo de IA cuando haya backend de generación de planes.

## Componentes compartidos (`components/`)

- **`WizardScreen`** — wrapper de las 7 pantallas del wizard de Flujo A: header con barra de progreso + mascota caminando sincronizada al paso actual, y contenido centrado verticalmente.
- **`BrandButton`** — botón primario/outline reutilizado en toda la app.
- **`SafeAreaView`** — envoltorio de `react-native-safe-area-context`. En el celular es el original; en web (`SafeAreaView.web.tsx`) es un `View` plano para que las clases de Tailwind (`px-6`) no se pierdan. Todas las pantallas lo importan de acá.
- **`PhoneFrame`** (en `app/_layout.tsx`) — solo en web: limita la app a 430 px de ancho y la centra. Ver [LOCALHOST.md](LOCALHOST.md).
- **`KitchenScene`** — la escena interactiva de "¿qué tienes en tu cocina?": fondo de cocina + electrodomésticos posicionados a mano (por nivel: básica/promedio/avanzada), tocables para marcar cuáles tiene el usuario.

## Multi-store: por qué existe `preferenciasCompra`

El modelo evitó a propósito depender de "un solo negocio vende todo el plan": cada ingrediente puede venderse en varias tiendas a distinto precio, y el usuario decide (o deja que se elija automáticamente la más barata) dónde comprar cada uno. `preferenciasCompra: Record<ingredienteId, negocioId>` guarda esa decisión, y tanto la lista de compras como el carrito de delivery la leen para agrupar por tienda.

## Backend (`supabase/`)

- **`supabase/functions/generar-plan/`** — Edge Function (Deno) que le pide a Gemini un plan semanal en JSON estructurado. La API key vive como secreto del proyecto, nunca en el cliente. Ver [IA.md](IA.md).
- **`lib/ia.ts`** — cliente de esa función en la app (`generarPlanConIA()`); todavía no está conectado al wizard.
- `tsconfig.json` excluye `supabase/functions` porque corre en Deno, no en React Native.
- `supabase/.temp/` (estado local del CLI) está en `.gitignore`.

## Scripts de datos (`scripts/dataset/`)

Pipeline en Python que arma la base de recetas en español a partir de CSV externos (dedupe, limpieza, ingredientes separados, cantidades normalizadas, tabla de peso por unidad) y un visor HTML local para revisarla. Los resultados van a `data/` (ignorado por git). Ver [DATASET.md](DATASET.md).
