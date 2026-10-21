# Registro de cambios — Mikhuna

Cada cambio medianamente importante (pantalla, flujo, función de IA, dataset o documentación) queda aquí con su commit,
lo que tocó fuera del código y **cómo regresarlo**. Lo más reciente va arriba. El hash permite ver el detalle con
`git show <hash>`. Cómo correr el proyecto: [LOCALHOST.md](LOCALHOST.md).

## Cómo regresar un cambio
- **Código:** `git revert <commit>` (deja un commit nuevo que lo deshace; no borra historia). Si el cambio tiene varios
  commits, revertir del más nuevo al más viejo.
- **Edge Function (`generar-plan`):** vive en el servidor, no en la app. Después de revertir el archivo hay que volver a
  desplegarla: `npx supabase functions deploy generar-plan --no-verify-jwt`. Para quitarla del servidor:
  `npx supabase functions delete generar-plan`. Su clave es un secreto del proyecto (`npx supabase secrets set/unset GEMINI_API_KEY`).
- **Base de datos:** el repo **no tiene migraciones SQL** (en `supabase/` solo está la función). Hay **un único proyecto de
  Supabase** (ref `lpnujzuatgnekirfdxru`, creado el 15 sep 2026) que sirve a desarrollo y a producción: no hay copia de pruebas.
- **Dataset:** `data/` está en `.gitignore` y se regenera. Tras revertir un commit de `scripts/dataset/`, volver a correr
  `python scripts/dataset/build_recipes.py` (y `build_viewer.py` si se usa el visor).

---

## 20 oct 2026

### Modelo de Gemini configurable (`GEMINI_MODEL`)
- **Qué:** `generar-plan` lee el modelo del secreto `GEMINI_MODEL`; si no está, sigue usando `gemini-2.5-flash` (sin
  cambio para el proyecto actual). Motivo: con una clave de Google AI Studio nueva, `gemini-2.5-flash` responde `404`
  ("no longer available to new users"). Probado en un proyecto de Supabase nuevo con `GEMINI_MODEL=gemini-3.8-flash`:
  devolvió un plan válido con `ingredienteId` del catálogo.
- **Cómo regresar:** `git revert` del commit y volver a desplegar la función; `npx supabase secrets unset GEMINI_MODEL`.

---

## 6 oct 2026

### Web: padding lateral corregido y app limitada al ancho de un celular
- **Qué:**
  - Nuevo `components/SafeAreaView.tsx` (en el celular es el de la librería, sin cambios) y `components/SafeAreaView.web.tsx`
    (en web es un `View` plano). Las 21 pantallas y componentes que usaban `SafeAreaView` ahora lo importan de ahí; es una
    sola línea por archivo. Causa: en web el de la librería emite `padding: 0` explícito y pisaba clases como `px-6`.
  - Nuevo `PhoneFrame` en `app/_layout.tsx`: solo en web, limita la app a 430 px de ancho, la centra, deja los lados en
    `ink` y recorta lo que se salga (por ejemplo las transiciones entre pantallas). En el celular no hace nada.
  - Comprobado en el navegador: a 1024 px de ventana el login queda en una columna de 430 px, con padding de 24 px (antes
    0 px) y campos de 382 px (antes 1024 px). Registro, modo, mapa, perfil, pedidos y explorar también miden 24 px; la
    pantalla de receta (usa `edges`) no da avisos en consola; Plan se ve bien; `npx tsc --noEmit` sin errores.
  - **No comprobado:** el wizard completo y la pantalla "Generando" (Supabase pausado y animación que no avanza en el panel),
    ni el comportamiento en el celular (no debería cambiar: reexporta la librería).
- **Cómo regresar:** `git revert` del commit. A mano: borrar los dos `SafeAreaView*.tsx`, volver a poner
  `import { SafeAreaView } from "react-native-safe-area-context";` en las 21 pantallas y quitar `PhoneFrame` de `app/_layout.tsx`.

### Guía de localhost y changelog en formato por fecha (solo documentación)
- **Qué:** nuevo [`LOCALHOST.md`](LOCALHOST.md) (cómo correr la app en web, cómo verla con tamaño de celular, problemas
  conocidos). Este registro pasa a organizarse por fecha, con "Qué / Cómo regresar" en cada entrada. El `README.md` enlaza
  la guía. No se tocó código de la app.
- **Estado comprobado ese día:**
  - Git limpio y sincronizado con `origin/main`; `npx tsc --noEmit` pasa con 0 errores; el servidor web levanta en `:8081`.
  - El proyecto de Supabase figuraba **`INACTIVE`** (pausado por inactividad del plan gratuito). Con el proyecto pausado,
    la app gira unos segundos y cae al login, no se puede registrar ni ingresar, y `generar-plan` no responde. Se restaura
    desde el dashboard (*Restore project*). Detalle en [LOCALHOST.md](LOCALHOST.md) §0.
- **Hallazgos de esa revisión:** padding lateral perdido en web (corregido en la entrada de arriba), credenciales de prueba
  en el código y aviso de `userInterfaceStyle` (estos dos quedan en *Pendiente conocido*).
- **Cómo regresar:** `git revert` del commit (vuelven el `CHANGELOG.md` y el `README.md` anteriores y desaparece
  `LOCALHOST.md`). No hay cambios de base de datos.

---

## 19 sep 2026 — Documentación, IA y dataset de recetas

### Documentación del backend y del dataset (`b0b5d4b`)
- **Qué:** primer `CHANGELOG.md`; `IA.md` y `ARQUITECTURA.md` actualizados (reintentos de Gemini, sección de scripts de datos);
  el `README.md` enlaza `IA.md`, `DATASET.md` y el changelog.
- **Cómo regresar:** `git revert b0b5d4b` (solo documentación).

### Tabla de peso por unidad (`bab8317`)
- **Qué:** nueva [`pesos_por_unidad.csv`](../scripts/dataset/pesos_por_unidad.csv) (~90 reglas) que estima gramos o ml de los
  conteos ("2 limones" ≈ 120 g) con mínimo, máximo y confianza. Cobertura: 71.6 % de los conteos; peso total conocido en
  47.9 % de los ingredientes (20.9 % medido, 27.1 % estimado).
- Reglas por país donde el producto cambia (limón = lima pequeña en Perú, México y Colombia; "pimentón" = pimiento en varios
  países sudamericanos).
- Las estimaciones se guardan **aparte** de la medida real (`origen_gramos`).
- `k` se interpreta como kilo ("1 k (2 lb)") con salvaguarda: "500 k" solo puede ser gramos.
- Nuevas unidades reconocidas: pieza, rebanada, lámina, bote, tarro, botella, barra, copa, pellizco, ramito.
- Corrección: la regla del ají no calzaba con el singular; el emoji 🧄 salía dañado (mojibake de 4 bytes).
- Nuevo [`DATASET.md`](DATASET.md).
- **Cómo regresar:** `git revert bab8317` y volver a correr `build_recipes.py`.

### Cantidades normalizadas (`4786f1f`)
- **Qué:** todo se lleva a `g`, `ml`, conteo o `al_gusto`, con `metodo_cantidad` para saber si es directa, aproximada, por
  equivalencia `(400 g)`, conteo o supuesto.
- Cucharadas/tazas/vasos se convierten a **ml** (no a gramos: una taza de harina y una de agua no pesan igual).
- Cantidades que la fuente trae mal ("400 kilogramos de nueces") se marcan como sospechosas (1,302), no se corrigen.
- `cantidad_por_racion` solo cuando la receta declara comensales.
- El visor muestra cantidad normalizada, método y por persona.
- **Cómo regresar:** `git revert 4786f1f` y regenerar `data/`.

### Filtro de líneas que no son ingredientes (`be45ca4`)
- **Qué:** elimina créditos ("Enviada por…"), encabezados de sección ("Para la masa:", "Ingredientes secos") y utensilios
  ("Palillos", "Rallador"). Los fragmentos tipo "para freír" se pegan al ingrediente anterior.
- Salvaguarda: "Para la masa 200 g de harina" (con número) se conserva.
- **Cómo regresar:** `git revert be45ca4` y regenerar `data/`.

### Visor HTML local (`29e420f`)
- **Qué:** `build_viewer.py` + `visor_template.html`: visor sin servidor con búsqueda por título o ingrediente, filtros de
  calidad y detalle por receta. Datos en fragmentos de 500 recetas.
- Detectó un defecto que los conteos no mostraban: modificadores ("cocidos", "picado") como ingredientes sueltos; ahora se
  fusionan.
- **Cómo regresar:** `git revert 29e420f` (el visor se genera en `data/`, no se versiona).

### Endurecimiento tras una auditoría completa (`ee75a20`)
- **Qué:** parser de ingredientes reescrito (fracciones, rangos "1 o 2", paréntesis, conectores).
- Texto dañado (`orÃ©gano`) reparado en 620 recetas de ingredientes y 704 de pasos.
- Basura de scraping en pasos ("Calorías 572", "Maridaje") eliminada; títulos en MAYÚSCULAS normalizados (836 → 1).
- **Dietas verificadas contra ingredientes:** la fuente marcaba 1,917 vegetarianas y 1,259 veganas; solo 1,841 y 1,153 se
  sostienen. Las contradicciones quedan en `dieta_en_conflicto`.
- Banderas de revisión: ingredientes incompletos, duración/comensales sospechosos, posibles duplicados.
- **Cómo regresar:** `git revert ee75a20` y regenerar `data/`.

### Reintentos ante 503/429 en la Edge Function (`23c279c`)
- **Qué:** `generar-plan` reintenta hasta 3 veces con espera creciente (0.8 s, 1.6 s, 3.2 s) cuando Gemini está sobrecargado
  (503) o sin cuota (429). Ver [IA.md](IA.md).
- **Cómo regresar:** `git revert 23c279c` y volver a desplegar la función (ver "Cómo regresar un cambio").

### Constructor del dataset (`162bede`)
- **Qué:** `build_recipes.py` une 5 CSV (~67 mil filas) en ~28.8 mil recetas únicas con `recipes.csv` e `ingredients.csv`.
- Corrección de un bug propio: las URLs de portada (`https://www.yanuq.com/`) fusionaban recetas distintas y se perdían ~800
  peruanas (Perú: 1,166 → 1,955).
- `data/` y `__pycache__/` pasan al `.gitignore`.
- **Cómo regresar:** `git revert 162bede` (los CSV de `data/` no están en git; se regeneran con el script).

---

## 17 sep 2026 — Edge Function de IA y commit inicial

### Edge Function `generar-plan` con Gemini (`e85f744`)
- **Qué:** función desplegada en Supabase que pide a Gemini un plato por día en JSON estructurado (`responseSchema`). La API
  key es un secreto del proyecto, nunca va en la app.
- El precio **nunca** lo decide la IA: `lib/ia.ts` lo estima cruzando con `INGREDIENTES`.
- Corrección: Gemini devolvía el nombre del ingrediente en vez de su id; se restringió con un `enum` en el schema.
- `tsconfig.json` excluye `supabase/functions` (Deno).
- Aún **no está conectada al wizard**.
- **Cómo regresar:** `git revert e85f744`; para quitarla del servidor `npx supabase functions delete generar-plan` y
  `npx supabase secrets unset GEMINI_API_KEY`.

### Commit inicial (`ae6355d`)
- **Qué:** estado de la app al subirla a GitHub, con su documentación (`README.md`, `BRANDING.md`, `ARQUITECTURA.md`, `FLUJOS.md`). Incluye:
  - Onboarding, autenticación y los dos flujos (plan semanal y delivery inmediato).
  - Lista de compras multi-tienda con comparación de precios por ingrediente y carrito por tienda.
  - Pantalla **Plan** rediseñada: saludo con Papi Papa, billetera con presupuesto (barra verde/naranja/roja), misión del día y
    semana de platos.
  - **Detalle de receta** (`app/(plan)/receta/[id].tsx`): ingredientes con estado "Ya comprado" cruzado con la lista de compras,
    pasos numerados y foto real del plato cuando existe (por ahora solo Causa limeña).
  - Arte de marca integrado: mascotas (saludo, apunta, regionales), billetera, íconos de antojos/restricciones/ingredientes.
  - Modal flotante `transparentModal` para elegir cómo conseguir los ingredientes.
- **Cómo regresar:** es el punto de partida del repo, no se revierte. Para ver cómo estaba, abrirlo en otra carpeta:
  `git worktree add ../mikhuna-inicial ae6355d`.

---

## Pendiente conocido
- **Reactivar el proyecto de Supabase** si figura `INACTIVE` (ver [LOCALHOST.md](LOCALHOST.md) §0).
- **Credenciales de prueba en el código:** `context/AuthContext.tsx` (constante `DEV_AUTO_LOGIN`) tiene un correo y una
  contraseña escritos, y ese archivo ya está en GitHub. Moverlos a variables de entorno y cambiar esa contraseña.
- **Aviso de Expo:** falta `userInterfaceStyle` a nivel `expo` en `app.json` (solo está en `ios` y `android`).
- Cargar el dataset a Supabase (con pgvector) tras revisarlo.
- Conectar `generarPlanConIA()` al wizard, con caché y respaldo.
- Categorizar recetas y ampliar el catálogo de ingredientes (solo ~12 % de los ingredientes del dataset calza con `INGREDIENTES`).
- Ampliar `pesos_por_unidad.csv` (28 % de los conteos sigue sin regla) y revisar sus valores contra mercados reales.
