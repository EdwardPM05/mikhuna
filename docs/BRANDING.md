# Branding

## Nombre

**Mikhuna** — del quechua, "comida". La marca apuesta por lo peruano de verdad: platos criollos, mercados de barrio, bodegas, y un tono cercano y familiar, no corporativo.

## Paleta de colores

Definida en [`tailwind.config.js`](../tailwind.config.js) y espejada en [`lib/theme.ts`](../lib/theme.ts):

| Token    | Hex       | Uso                                                              |
| -------- | --------- | ----------------------------------------------------------------- |
| `chili`  | `#E5131B` | Color primario: botones, precios, acciones, barra de progreso     |
| `mango`  | `#F7941D` | Acento secundario: badges, íconos, estados intermedios            |
| `peach`  | `#FFC993` | Fondos suaves de chips/cápsulas, resaltados discretos             |
| `cream`  | `#FDF3E7` | Fondo base de toda la app                                         |
| `maroon` | `#7A1220` | Texto sobre fondos color peach/chili claro, acentos oscuros        |
| `ink`    | `#241F21` | Texto principal, contornos                                        |

Regla de mano: `chili` es la acción, `mango` es el estado, `peach`/`cream` son el fondo, `ink` es el texto.

## Tipografía

- **Baloo 2** (`font-display`, `font-display-bold`, `font-display-medium`) — títulos, montos, nombres de plato. Es la tipografía redondeada y juguetona que le da personalidad a la marca.
- **Nunito Sans** (`font-body`, `font-body-semibold`, `font-body-bold`, `font-body-extrabold`) — todo el texto de lectura: descripciones, labels, botones secundarios.

## Mascotas

En [`src/assets/mascots/`](../src/assets/mascots/):

- **Papi Papa** — la papa protagonista, mascota principal de la app. Cuerpo redondeado tipo sticker, guantes blancos, moño rojo. Tiene variantes:
  - `papi_papa.png` — versión base, en la elección de modo (onboarding).
  - `papi_papa_checklist.png` — caminando, usada en la barra de progreso del wizard (`WizardScreen`), en la pestaña Plan y en recuperar contraseña.
  - `papi_papa_saludo.png` — medio cuerpo, saludando, en login y registro.
  - `papi_papa_apunta.png` — medio cuerpo, señalando, en la pestaña Plan.
  - `papi_papa_costa.png`, `_sierra.png`, `_selva.png` — variantes regionales (con sombrero/vestimenta típica de cada región), para elegir la región en "¿Quién eres?" y en la pantalla "generando tu plan".
- **Choclito** — mascota secundaria (`choclito.png`), para el Flujo B (delivery inmediato): en Explorar y al calificar un pedido.
- **Cuy Delivery** (`cuy_delivery.png`) — mascota del repartidor/delivery: en seguimiento y en pedidos, y en la elección de modo.
- **Billetera** (`billetera.png`) — en la tarjeta de presupuesto de la pestaña Plan.

Los archivos `choclito_ref.jpg` y `papi_papa_ref.jpg` son referencias de arte; la app no los usa.

### Logos (`src/assets/images/`)

- `logo_wordmark.png` — logo con el nombre, en login, registro y ubicación.
- `logo_icon.png` — ícono de la app (`app.json` → `icon`).
- `logo_icon_foreground.png` — capa de primer plano del ícono adaptativo de Android (fondo `#FDF3E7`).
- `logo_splash_padded.png` — imagen de la pantalla de carga (`expo-splash-screen`).

Todo el arte de marca (mascotas, íconos de antojos/restricciones/ingredientes, fondos de cocina) es generado por el dueño del producto y entregado como PNG con transparencia — no se dibuja a mano en código. El estilo consistente en todos ellos: contorno grueso oscuro (`#241F21`), colores planos vibrantes, sombreado suave tipo cel-shading, borde blanco tipo sticker.

## Estilo visual general

- Tarjetas blancas redondeadas (`rounded-2xl`/`rounded-3xl`) sobre fondo `cream`.
- Sombras suaves (nunca bordes duros) para dar sensación de "objetos apilados".
- Íconos siempre a color, nunca monocromáticos genéricos (excepto la tab bar, que usa PNGs monocromos con `tintColor` para el estado activo/inactivo).
- Tono de la copy: cercano, en español peruano informal ("¿Qué se te antoja esta semana?", "Voy a comprarlo yo"), sin tecnicismos.
