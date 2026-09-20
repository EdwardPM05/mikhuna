# Registro de cambios

Del más reciente al más antiguo. Cada entrada corresponde a un commit; el hash permite ver el detalle con `git show <hash>`.

## Dataset de recetas (`scripts/dataset/`)

### `bab8317` — Tabla de peso por unidad
- Nueva [`pesos_por_unidad.csv`](../scripts/dataset/pesos_por_unidad.csv) (~90 reglas) que estima gramos o ml de los conteos ("2 limones" ≈ 120 g) con mínimo, máximo y confianza. Cobertura: 71.6 % de los conteos; peso total conocido en 47.9 % de los ingredientes (20.9 % medido, 27.1 % estimado).
- Reglas por país donde el producto cambia (limón = lima pequeña en Perú, México y Colombia; "pimentón" = pimiento en varios países sudamericanos).
- Las estimaciones se guardan **aparte** de la medida real (`origen_gramos`).
- `k` se interpreta como kilo ("1 k (2 lb)") con salvaguarda: "500 k" solo puede ser gramos.
- Nuevas unidades reconocidas: pieza, rebanada, lámina, bote, tarro, botella, barra, copa, pellizco, ramito.
- Corrección: la regla del ají no calzaba con el singular; el emoji 🧄 salía dañado (mojibake de 4 bytes).
- Nuevo [`docs/DATASET.md`](DATASET.md).

### `4786f1f` — Cantidades normalizadas
- Todo se lleva a `g`, `ml`, conteo o `al_gusto`, con `metodo_cantidad` para saber si es directa, aproximada, por equivalencia `(400 g)`, conteo o supuesto.
- Cucharadas/tazas/vasos se convierten a **ml** (no a gramos: una taza de harina y una de agua no pesan igual).
- Cantidades que la fuente trae mal ("400 kilogramos de nueces") se marcan como sospechosas (1,302), no se corrigen.
- `cantidad_por_racion` solo cuando la receta declara comensales.
- El visor muestra cantidad normalizada, método y por persona.

### `be45ca4` — Filtro de líneas que no son ingredientes
- Elimina créditos ("Enviada por…"), encabezados de sección ("Para la masa:", "Ingredientes secos") y utensilios ("Palillos", "Rallador"). Los fragmentos tipo "para freír" se pegan al ingrediente anterior.
- Salvaguarda: "Para la masa 200 g de harina" (con número) se conserva.

### `29e420f` — Visor HTML local
- `build_viewer.py` + `visor_template.html`: visor sin servidor con búsqueda por título o ingrediente, filtros de calidad y detalle por receta. Datos en fragmentos de 500 recetas.
- Detectó un defecto que los conteos no mostraban: modificadores ("cocidos", "picado") como ingredientes sueltos; ahora se fusionan.

### `ee75a20` — Endurecimiento tras una auditoría completa
- Parser de ingredientes reescrito (fracciones, rangos "1 o 2", paréntesis, conectores).
- Texto dañado (`orÃ©gano`) reparado en 620 recetas de ingredientes y 704 de pasos.
- Basura de scraping en pasos ("Calorías 572", "Maridaje") eliminada; títulos en MAYÚSCULAS normalizados (836 → 1).
- **Dietas verificadas contra ingredientes:** la fuente marcaba 1,917 vegetarianas y 1,259 veganas; solo 1,841 y 1,153 se sostienen. Las contradicciones quedan en `dieta_en_conflicto`.
- Banderas de revisión: ingredientes incompletos, duración/comensales sospechosos, posibles duplicados.

### `162bede` — Constructor del dataset
- `build_recipes.py`: une 5 CSV (~67 mil filas) en ~28.8 mil recetas únicas con `recipes.csv` e `ingredients.csv`.
- Corrección de un bug propio: las URLs de portada (`https://www.yanuq.com/`) fusionaban recetas distintas y se perdían ~800 peruanas (Perú: 1,166 → 1,955).
- `data/` y `__pycache__/` en `.gitignore`.

## IA (Gemini + Supabase)

### `23c279c` — Reintentos ante 503/429
- La Edge Function reintenta hasta 3 veces con espera creciente cuando Gemini está sobrecargado o sin cuota. Ver [IA.md](IA.md).

### `e85f744` — Edge Function `generar-plan`
- Función desplegada en Supabase que pide a Gemini un plato por día en JSON estructurado (`responseSchema`). La API key es un secreto del proyecto.
- El precio **nunca** lo decide la IA: `lib/ia.ts` lo estima cruzando con `INGREDIENTES`.
- Corrección: Gemini devolvía el nombre del ingrediente en vez de su id; se restringió con un `enum` en el schema.
- `tsconfig.json` excluye `supabase/functions` (Deno).
- Aún no está conectada al wizard.

## App

### `ae6355d` — Commit inicial
Estado de la app al subirla a GitHub, con su documentación (`README.md`, `BRANDING.md`, `ARQUITECTURA.md`, `FLUJOS.md`). Incluye:
- Onboarding, autenticación y los dos flujos (plan semanal y delivery inmediato).
- Lista de compras multi-tienda con comparación de precios por ingrediente y carrito por tienda.
- Pantalla **Plan** rediseñada: saludo con Papi Papa, billetera con presupuesto (barra verde/naranja/roja), misión del día y semana de platos.
- **Detalle de receta** (`app/(plan)/receta/[id].tsx`): ingredientes con estado "Ya comprado" cruzado con la lista de compras, pasos numerados y foto real del plato cuando existe (por ahora solo Causa limeña).
- Arte de marca integrado: mascotas (saludo, apunta, regionales), billetera, íconos de antojos/restricciones/ingredientes.
- Modal flotante `transparentModal` para elegir cómo conseguir los ingredientes.

## Pendiente conocido
- Cargar el dataset a Supabase (con pgvector) tras revisarlo.
- Conectar `generarPlanConIA()` al wizard, con caché y respaldo.
- Categorizar recetas y ampliar el catálogo de ingredientes (solo ~12 % de los ingredientes del dataset calza con `INGREDIENTES`).
- Ampliar `pesos_por_unidad.csv` (28 % de los conteos sigue sin regla) y revisar sus valores contra mercados reales.
