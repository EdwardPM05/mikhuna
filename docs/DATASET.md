# Dataset de recetas

Base de recetas en español para la búsqueda y la lista de compras. Se arma con dos scripts en [`scripts/dataset/`](../scripts/dataset/); los datos procesados viven en `data/` (ignorado por git, se regenera).

```bash
pip install pandas
python scripts/dataset/build_recipes.py    # une, limpia y normaliza  -> data/processed/recipes.csv + ingredients.csv
python scripts/dataset/build_viewer.py     # visor HTML para revisar  -> data/processed/visor/index.html
```

`build_recipes.py` lee los CSV de la carpeta de descargas (`--downloads`, por defecto `~/Downloads`) y escribe en `--out` (por defecto `data/processed`). `build_viewer.py` lee `--data` (por defecto `data/processed`).

## Fuentes

Cinco CSV descargados manualmente (no se versionan): `recetasdelaabuela.csv` y `main.csv` (~97 % solapados entre sí), y `train.csv` / `valid.csv` / `test.csv` (esquema de 5 columnas, ingredientes pegados sin separador). Resultado: ~67 mil filas de entrada → ~28.8 mil recetas únicas.

**Licencia:** las recetas vienen de sitios comerciales (recetasgratis.net, elmueble.com, etc.) y no se conocen los términos bajo los que se publicaron. Sirve para prototipo o curso; **antes de usarlo en un producto real hay que revisarlo**. Por eso no se sube al repo ni se publica el visor.

## Qué hace `build_recipes.py`

- **Deduplica** por URL específica (las URLs de portada, p. ej. `https://www.yanuq.com/`, no cuentan como identidad) o por título. Los títulos repetidos casi siempre son recetas distintas; solo ~20 son duplicados reales y se marcan en `posible_duplicado_de`.
- **Repara** texto dañado (`orÃ©gano` → `orégano`), limpia basura de scraping en los pasos ("Calorías 572", "Maridaje") y pasa títulos EN MAYÚSCULAS a formato normal.
- **Ingredientes:** los separa, quita créditos ("Enviada por…"), encabezados ("Para la masa:") y utensilios, y pega modificadores sueltos ("picado", "en cubos") al ingrediente anterior. En `train/valid/test` la separación es heurística (`parseo_heuristico`); lo dudoso lleva `parseo_dudoso`.
- **País:** normaliza las escrituras (`Peru`/`Perú`, `ESP`/`España`) y, si falta, lo infiere por dominio (`pais_inferido`).
- **Dietas:** las etiquetas vegetariana/vegana de la fuente **no se creen**: solo se marca `apta_*` si además ningún ingrediente es animal. Las que la fuente marcó y los ingredientes contradicen quedan en `dieta_en_conflicto`. Esto no es una verificación de alérgenos.

## Cantidades

Cada ingrediente tiene la cantidad original y una **normalizada**: `cantidad_base` + `unidad_base` (`g`, `ml`, `unidad`/`diente`/`lata`…, `pizca`, `al_gusto`). La columna `metodo_cantidad` dice de dónde salió:

| Método | Significado |
|---|---|
| `directa` | gramos, kg, ml, litros: conversión exacta |
| `conversion_aproximada` | cucharadas (15 ml), cucharaditas (5 ml), tazas (240 ml), vasos (200 ml); también "1 k" = kilo. **No** se convierten a gramos: una taza de harina y una de agua no pesan lo mismo |
| `equivalencia` | la fuente trae `(400 g)` junto a una lata o unidad |
| `conteo` | "2 limones", "3 dientes de ajo": se guarda el conteo |
| `al_gusto` / `al_gusto_supuesto` | "sal al gusto"; el segundo es un supuesto mío para "Sal" sin cantidad |
| `sin_dato` | la fuente no dice cuánto; **no se inventa** |

Valores que la fuente trae mal (p. ej. "400 kilogramos de nueces", "170 Harina" sin unidad) se marcan en `cantidad_sospechosa` en vez de corregirse por adivinanza, y se excluyen de `cantidad_por_racion`. Esta última solo existe si la receta declara comensales (≈ 47 % de las recetas).

### Tabla de peso por unidad

[`pesos_por_unidad.csv`](../scripts/dataset/pesos_por_unidad.csv) estima cuánto pesa cada conteo ("1 limón ≈ 60 g", "1 diente de ajo ≈ 4 g", "1 chorro de aceite ≈ 15 ml") para poder sumar cantidades entre recetas y compararlas con lo que se vende por kg.

- **Los valores son estimaciones culinarias estándar, no mediciones.** Cada fila trae mínimo, máximo y `confianza` (alta/media/baja); en la salida quedan como `gramos_estimados`, `gramos_est_min`, `gramos_est_max`, `ml_estimados` y `peso_confianza`.
- **Se guardan aparte de la medida real.** `gramos_totales` usa la medida real cuando existe y la estimada si no; `origen_gramos` (`medida` / `estimada`) dice cuál es.
- **Hay reglas por país** donde el producto cambia: el "limón" de Perú, México, Colombia y otros es una lima pequeña (≈ 30 g, no 60 g), y en varios países sudamericanos el "pimentón" es el pimiento morrón.
- **Confianza baja a propósito** en cosas muy variables (latas de atún, ajíes, pechugas, manojos de hierbas).
- **Cobertura actual:** ≈ 71 % de los conteos tiene peso o volumen estimado; se conoce el peso total de ≈ 48 % de todos los ingredientes (≈ 21 % medida real, ≈ 27 % estimada). Al final de cada corrida, `build_recipes.py` imprime las combinaciones frecuentes **sin regla**, para ir ampliando la tabla.

## Visor de revisión

`build_viewer.py` genera un visor local (doble clic en `index.html`, sin servidor): busca por título o ingrediente, filtra por país y fuente, y tiene casillas para las marcas de revisión (parseo dudoso, cantidad sospechosa, duración sospechosa, comensales sospechosos, posible duplicado). Muestra cada ingrediente con su texto original, la cantidad normalizada, el peso estimado y las etiquetas heurístico, dudoso, animal y catálogo. Está pensado para recorrer recetas antes de cargarlas a Supabase. Los datos van en fragmentos `datos/` que se cargan con `<script>`, por eso no necesita servidor.

## Pendiente

- Cargar a Supabase (con pgvector para búsqueda) una vez revisado.
- Categorizar cada receta y ampliar el catálogo de ingredientes (hoy solo 12 % de los ingredientes calza con `INGREDIENTES`).
- Ampliar `pesos_por_unidad.csv` con las combinaciones que siguen sin regla.
