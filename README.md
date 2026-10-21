<div align="center">

<img src="src/assets/images/logo_wordmark.png" alt="Mikhuna" width="300" />

### Planea tu semana, compra en tu barrio y pide cuando no quieras cocinar 🥔🌽🐹

<sub>*Mikhuna* viene del quechua y significa **"comida"**.</sub>

<br />

![Expo](https://img.shields.io/badge/Expo-SDK%2057-241F21?style=for-the-badge&logo=expo&logoColor=FDF3E7)
![React Native](https://img.shields.io/badge/React%20Native-0.86-E5131B?style=for-the-badge&logo=react&logoColor=FDF3E7)
![TypeScript](https://img.shields.io/badge/TypeScript-6-7A1220?style=for-the-badge&logo=typescript&logoColor=FDF3E7)
![Supabase](https://img.shields.io/badge/Supabase-auth%20%2B%20db-F7941D?style=for-the-badge&logo=supabase&logoColor=241F21)
![Gemini](https://img.shields.io/badge/IA-Gemini-FFC993?style=for-the-badge&logo=googlegemini&logoColor=241F21)

</div>

---

## 🍲 ¿Qué es Mikhuna?

Una app peruana de **planificación de comidas y delivery**. Le dices qué se te antoja, para cuántos cocinas, cuánta
plata tienes para la semana y qué hay en tu cocina, y Mikhuna te arma el menú. Después compara los precios de los
ingredientes entre bodegas, mercados y supermercados, y si un día no tienes ganas de cocinar, pides algo al toque.

<table>
  <tr>
    <td align="center" width="33%">
      <img src="src/assets/mascots/papi_papa_saludo.png" width="110" alt="Papi Papa" /><br />
      <b>Papi Papa</b><br />
      <sub>Te arma el plan de la semana</sub>
    </td>
    <td align="center" width="33%">
      <img src="src/assets/mascots/choclito.png" width="110" alt="Choclito" /><br />
      <b>Choclito</b><br />
      <sub>Te lleva a explorar negocios del barrio</sub>
    </td>
    <td align="center" width="33%">
      <img src="src/assets/mascots/cuy_delivery.png" width="100" alt="Cuy Delivery" /><br />
      <b>Cuy Delivery</b><br />
      <sub>Te trae el pedido hasta tu puerta</sub>
    </td>
  </tr>
</table>

## ✨ Lo que puedes hacer

| | |
|---|---|
| 🗓️ **Plan semanal** | Wizard de 7 pasos: tienda, personas, días, presupuesto, antojos, restricciones y electrodomésticos. |
| 🤖 **Recetas con IA** | Gemini propone el menú desde una Edge Function de Supabase. |
| 💰 **Billetera** | Cuánto te queda de presupuesto, con una barra que pasa de verde a rojo. |
| 🛒 **Lista de compras** | Compara el precio de cada ingrediente entre tiendas o márcalo como comprado. |
| 🔎 **Explorar** | Busca negocios o productos ("pollo" encuentra el mercado que lo vende) y filtra por categoría. |
| 🛵 **Delivery** | Carrito → checkout → seguimiento en vivo con el cuy → calificación. |
| 📦 **Tus pedidos** | Historial, seguimiento de lo que está en camino y "Volver a pedir" con un toque. |
| ☁️ **En la nube** | Tu plan y tus pedidos se guardan en Supabase: cambias de celular y siguen ahí. |

## 🚀 Arráncalo en 2 minutos

```bash
npm install
npx expo start --web      # o sin --web para Expo Go / emulador
```

Crea un `.env.local` (no se sube a git):

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# opcional: entra solo en desarrollo con una cuenta de pruebas
EXPO_PUBLIC_DEV_EMAIL=...
EXPO_PUBLIC_DEV_PASSWORD=...
```

¿Primera vez con la base de datos? Crea las tablas:

```bash
npx supabase link --project-ref lvkweyiwzkqtojlylinc
npx supabase db push
```

> 💡 Para verlo con tamaño de celular en el navegador, o si Supabase está pausado, mira
> [docs/LOCALHOST.md](docs/LOCALHOST.md). Para sacar el APK de Android:
> [docs/COMPILACION_APK_ANDROID.md](docs/COMPILACION_APK_ANDROID.md).

## 🎨 La marca

| Color | Hex | Para qué |
|---|---|---|
| ![](https://img.shields.io/badge/-%20%20%20%20-E5131B?style=flat-square) **chili** | `#E5131B` | Acciones, precios, botones |
| ![](https://img.shields.io/badge/-%20%20%20%20-F7941D?style=flat-square) **mango** | `#F7941D` | Estados, badges, íconos |
| ![](https://img.shields.io/badge/-%20%20%20%20-FFC993?style=flat-square) **peach** | `#FFC993` | Chips y resaltados suaves |
| ![](https://img.shields.io/badge/-%20%20%20%20-FDF3E7?style=flat-square) **cream** | `#FDF3E7` | Fondo de toda la app |
| ![](https://img.shields.io/badge/-%20%20%20%20-7A1220?style=flat-square) **maroon** | `#7A1220` | Texto sobre fondos claros |
| ![](https://img.shields.io/badge/-%20%20%20%20-241F21?style=flat-square) **ink** | `#241F21` | Texto y contornos |

Títulos en **Baloo 2**, textos en **Nunito Sans**. Todo el detalle está en [docs/BRANDING.md](docs/BRANDING.md).

## 🧰 Stack

- **Expo SDK 57** (bare workflow, `android/` en el repo) + **expo-router** con grupos de rutas
- **NativeWind v4** — Tailwind para React Native
- **Supabase** — auth, tablas `planes` y `pedidos` con RLS, y la Edge Function `generar-plan` (solo `anon key` en el cliente)
- **React Context** para el estado global (sin Redux ni Zustand)
- **TypeScript** de punta a punta

## 🗂️ Cómo está armado

```
app/            pantallas (expo-router, agrupadas por flujo)
components/     piezas reutilizables (WizardScreen, BrandButton, CampoTexto, KitchenScene)
context/        estado global (Auth, PlanWizard, Cart, Orders)
lib/            catálogo (negocios, ingredientes, recetas), theme, cliente de Supabase
src/assets/     arte de marca: mascotas, íconos, fondos de cocina, fotos de platos
supabase/       migraciones SQL y la Edge Function `generar-plan` (Deno + Gemini)
scripts/        pipeline en Python del dataset de recetas y su visor HTML
android/        proyecto nativo
docs/           documentación
```

## 📚 Documentación

| Doc | De qué va |
|---|---|
| [ENFOQUE](docs/ENFOQUE.md) | Qué promete Mikhuna, qué falta y cómo debe funcionar la IA |
| [BRANDING](docs/BRANDING.md) | Colores, tipografía, mascotas y tono de voz |
| [ARQUITECTURA](docs/ARQUITECTURA.md) | Carpetas, rutas, contexts y datos |
| [FLUJOS](docs/FLUJOS.md) | Onboarding, plan semanal, delivery, pedidos y perfil |
| [IA](docs/IA.md) | Planes con Gemini vía Supabase Edge Function |
| [DATASET](docs/DATASET.md) | Dataset de recetas: fuentes, limpieza y cantidades |
| [LOCALHOST](docs/LOCALHOST.md) | Correr en web, verlo como celular y problemas conocidos |
| [COMPILACION_APK_ANDROID](docs/COMPILACION_APK_ANDROID.md) | Generar un APK de prueba |
| [CHANGELOG](docs/CHANGELOG.md) | Qué cambió en cada commit y cómo regresarlo |

## 🤝 Equipo

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/EdwardPM05"><img src="https://github.com/EdwardPM05.png" width="80" alt="EdwardPM05" /><br /><b>EdwardPM05</b></a><br />
      <sub>Autor</sub>
    </td>
    <td align="center">
      <img src="src/assets/mascots/papi_papa.png" width="80" alt="" /><br /><b>Abner Gonzales</b><br />
      <sub>Contribuidor</sub>
    </td>
  </tr>
</table>

<div align="center">
<br />
<sub>Hecho en Perú con harto ají 🌶️</sub>
</div>
