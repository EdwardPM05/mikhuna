# Flujos de usuario

## 1. Onboarding y autenticación

1. `app/index.tsx` revisa si hay sesión de Supabase (`AuthContext`).
   - Sin sesión → `(auth)/login` (o `(auth)/registro` desde "Regístrate").
   - **Registro** → al crear la cuenta pide el código que llega al correo (`verifyOtp` tipo `email`) y entra directo
     a la app; se puede reenviar cada 60 s. Si alguien intenta entrar con una cuenta sin confirmar, el login le ofrece
     "Confirmar con un código", que abre ese mismo paso. Usa la plantilla `supabase/templates/confirmar-registro.html`
     (más abajo, cómo subirla).
   - Con sesión y distrito ya elegido → `(tabs)` directo.
   - Con sesión y sin distrito (primera vez) → `(onboarding)/ubicacion`.
   - **"¿Olvidaste tu contraseña?"** en el login → `(auth)/recuperar`: el usuario escribe su correo, Supabase le manda un
     código (`resetPasswordForEmail`), y con el código y la contraseña nueva (`verifyOtp` tipo `recovery` +
     `updateUser`) entra directo a la app. Se usa código y no enlace porque la app no tiene deep links configurados.

     Los correos de registro y recuperación tienen diseño propio (logo, Papi Papa y el código grande): sus plantillas
     están en `supabase/templates/` y se suben a Supabase con
     `powershell -ExecutionPolicy Bypass -File scripts/supabase/aplicar-plantillas-correo.ps1` (usa la sesión de
     `npx supabase login`). Si se editan en el dashboard en vez de aquí, se pierden al volver a correr el script.

     **Requiere SMTP propio.** Con el servidor de correo por defecto, Supabase (plan gratuito) no deja cambiar las
     plantillas ("Email template modification is not available for free tier projects using the default email
     provider"): el correo llega con un enlace y no con código, y además solo se envía a los miembros del equipo.
     Con eso el registro funciona igual (abrir el enlace confirma la cuenta), pero "Olvidé mi contraseña" no.

     Configuración con Gmail:
     1. Activar la verificación en 2 pasos de la cuenta de Google y crear una contraseña de aplicación en
        https://myaccount.google.com/apppasswords.
     2. Supabase → Authentication → Emails → SMTP Settings → *Enable custom SMTP*: host `smtp.gmail.com`, puerto
        `465`, usuario y remitente = el Gmail, contraseña = la de aplicación (16 letras, sin espacios), nombre
        `Mikhuna`.
     3. Correr `scripts/supabase/aplicar-plantillas-correo.ps1`.

     Gmail permite unos 500 envíos al día; Supabase además limita los correos por hora (Authentication → Rate Limits).
2. **`(onboarding)/ubicacion`** — el usuario elige su distrito (o usa su ubicación actual), para saber qué negocios mostrarle cerca.
3. **`(onboarding)/modo`** — "¿Qué quieres hacer hoy?", la bifurcación central de la app:
   - **"Quiero planear mi semana"** → entra al Flujo A (`(plan)/negocio`).
   - **"Quiero pedir algo ahora"** → entra al Flujo B (`(tabs)/explorar`).

Desde el tab "Plan" siempre se puede volver a armar un plan nuevo, y desde cualquier lado se puede ir a "Explorar" para el Flujo B — no es una elección de una sola vez.

## 2. Flujo A — Plan semanal

Wizard de 7 pasos, todos usando `WizardScreen` (barra de progreso + Papi Papa caminando), guardando cada respuesta en `PlanWizardContext`:

1. **`negocio`** — ¿dónde haces tus compras? (negocio de referencia para el distrito).
2. **`hogar`** — ¿para cuántos cocinas? (número de personas).
3. **`dias`** — ¿qué días cocinarás esta semana?
4. **`presupuesto`** — presupuesto semanal (slider S/40–S/600).
5. **`antojo`** — hasta 3 antojos (criolla, rápida, saludable, menú del día, vegetariana, fit/proteica, económica, chifa).
6. **`restricciones`** — alergias/restricciones alimentarias.
7. **`electrodomesticos`** — qué tiene en su cocina, con la escena interactiva `KitchenScene` (niveles básica/promedio/avanzada).

Al terminar, **`generando`** simula armar el plan (Papi Papa cocinando, con una variante regional al azar) y llama a `generarPlanSemana()`, que cruza los días elegidos con las recetas que matchean los antojos.

### Home del plan (`(tabs)/index.tsx`)

Con el plan ya armado, la pantalla "Plan" muestra:

- Saludo + racha (días planeados) + comidas listas.
- Tarjeta de **billetera**: disponible para gastar, gastado vs. presupuesto, con una barra de color dinámico (verde/naranja/rojo según qué tan cerca está del límite).
- **Misión del día**: marcar 3 ingredientes de la lista como comprados — dato real de `PlanWizardContext`, no inventado.
- **Tu semana**: un plato por día. Tocar un plato abre `(plan)/receta/[id]` con ingredientes y pasos de preparación; los ingredientes que también existen en `INGREDIENTES` se marcan como "Ya comprado" si ya se marcaron en la lista de compras.

### Lista de compras

Desde el home, "Lista de compras" abre **`(plan)/lista-compras`** — un modal flotante (no pantalla completa) con dos caminos:

- **"Pedir por delivery"** → `(plan)/comprar-delivery`: el usuario elige una tienda principal; lo que esa tienda no vende se reparte automáticamente entre las demás tiendas que sí lo tienen, agrupado por negocio.
- **"Voy a comprarlo yo"** → `(plan)/comprar-yo-mismo`: checklist plano de todos los ingredientes, cada uno se puede marcar como comprado. Tocar un ingrediente abre `(plan)/ingrediente/[id]`, que compara el precio en cada tienda que lo vende y deja asignarlo a una (sin salir de la pantalla, para poder seguir comparando el resto).

Las asignaciones (`preferenciasCompra`) alimentan **`(plan)/carrito-ingredientes`**: un carrito agrupado por tienda, con buscador, donde cada grupo tiene su propio botón de "Pedir de [tienda]".

## 3. Flujo B — Delivery inmediato

`(tabs)/explorar` muestra negocios y categorías cercanas. Entrar a un negocio (`(delivery)/negocio/[id]`) muestra su catálogo de platos/productos, se arma el carrito (`CartContext`) y se pasa por `(delivery)/carrito` → `checkout` → `seguimiento` → `calificar` al terminar.

Este flujo comparte `CartContext` y las pantallas de `(delivery)` con el Flujo A: cuando el usuario pide delivery de ingredientes desde el plan semanal, termina en el mismo carrito/checkout/seguimiento que un pedido armado desde Explorar.

## 4. Perfil y pedidos

- **`(tabs)/pedidos`** — arriba los pedidos en curso (chip de estado y barra de pasos, abren el seguimiento) y debajo los
  entregados, con fecha, productos, total, estrellas o "Calificar" y "Volver a pedir" (rellena el carrito). La pestaña
  muestra un contador cuando hay pedidos en curso.
- **`(tabs)/perfil`** — nombre, correo, personas, presupuesto y número de pedidos; accesos para cambiar de distrito,
  rehacer el plan y ver pedidos; restricciones elegidas; y "Cerrar sesión" (pide un segundo toque). Cerrar sesión
  vacía el carrito pero el plan queda guardado para la próxima vez.
