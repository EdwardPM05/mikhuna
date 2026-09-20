# Mikhuna

Mikhuna es una app de planificación de comidas y delivery para el mercado peruano. Le ayuda al usuario a armar su semana de comidas según lo que se le antoja y lo que tiene en casa, comparar precios de ingredientes entre varias tiendas, y pedir delivery inmediato cuando no quiere cocinar.

"Mikhuna" viene del quechua y significa "comida".

## Stack

- **Expo SDK 57** (bare workflow, `android/` committeado)
- **expo-router** — ruteo por archivos, con grupos de rutas
- **NativeWind v4** (Tailwind para React Native)
- **Supabase** — auth y base de datos (solo `anon key` en el cliente)
- **React Context** — estado global (sin Redux/Zustand)
- **TypeScript**

## Puesta en marcha

```bash
npm install
npx expo start --web      # o sin --web para abrir en Expo Go / emulador
```

Variables de entorno en `.env.local` (no se sube a git):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Para generar el APK de Android, ver [docs/COMPILACION_APK_ANDROID.md](docs/COMPILACION_APK_ANDROID.md).

## Documentación

- [docs/BRANDING.md](docs/BRANDING.md) — identidad visual, colores, tipografía, mascotas, tono de voz.
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — estructura de carpetas, rutas, contexts, capa de datos.
- [docs/FLUJOS.md](docs/FLUJOS.md) — onboarding, autenticación, Flujo A (plan semanal) y Flujo B (delivery inmediato), lista de compras.
- [docs/IA.md](docs/IA.md) — generación de planes con Gemini vía Supabase Edge Function.
- [docs/DATASET.md](docs/DATASET.md) — dataset de recetas: fuentes, limpieza, cantidades normalizadas y tabla de peso por unidad.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — registro de cambios por commit, con lo aprendido en cada uno.
- [docs/COMPILACION_APK_ANDROID.md](docs/COMPILACION_APK_ANDROID.md) — cómo generar un APK de prueba localmente.

## Estructura rápida

```
app/            pantallas (expo-router, agrupadas por flujo)
components/     componentes reutilizables (WizardScreen, BrandButton, KitchenScene)
context/        estado global (Auth, PlanWizard, Cart)
lib/            catálogo de datos (negocios, ingredientes, recetas), theme, cliente de Supabase
src/assets/     arte de marca: mascotas, íconos, fondos de cocina, fotos de platos
docs/           documentación del proyecto
```
