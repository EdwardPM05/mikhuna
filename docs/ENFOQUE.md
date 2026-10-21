# Enfoque de Mikhuna y cómo debe funcionar la IA

Revisión de la presentación del equipo (21 oct 2026) contra lo que hace hoy la app, y la propuesta de cómo cerrar la
diferencia. Para el detalle técnico de lo que ya existe: [FLUJOS.md](FLUJOS.md), [IA.md](IA.md), [DATASET.md](DATASET.md).

## Lo que promete la presentación

> Las apps de delivery parten de "¿qué restaurante pido?". Mikhuna empieza un paso antes: **"según quién soy o qué puedo
> comer, ¿qué me conviene cocinar o pedir esta semana?"**

1. **Para quién:** quien no sabe qué cocinar. Tres perfiles concretos: el **estudiante** que recién cocina solo, el
   **foráneo** lejos de su comida de siempre, y quien tiene una **restricción u objetivo** (fitness, intolerancias, dietas)
   para quien "cualquier receta" no sirve.
2. **Qué entrega:** un **plan de comidas concreto** para la semana, **peruano o de otra cocina**, según lo que el usuario
   elija.
3. **Y sobre ese plan:** **dónde conviene comprar cada ingrediente**, para cocinarlo o pedirlo.
4. **Con qué:** React Native, Expo, TypeScript, Supabase y **Gemini**.

## Lo que hace la app hoy

| Promesa | Hoy | Brecha |
|---|---|---|
| "Según quién eres" | El wizard pregunta personas, días, presupuesto, antojos, restricciones y electrodomésticos. | No pregunta **quién es** (estudiante, foráneo, objetivo) ni su **nivel en la cocina**. |
| Plan que respeta lo que puedes comer | `generarPlanSemana()` reparte **8 recetas fijas** según los antojos. | Ignora restricciones, presupuesto, personas y electrodomésticos. Un vegano puede recibir lomo saltado. |
| "Peruano o de otra cocina" | Las 8 recetas son peruanas. | No hay otras cocinas ni la comida "de tu tierra" para el foráneo. |
| IA (Gemini) | La función `generar-plan` existe, está desplegada y protegida, pero **el wizard no la usa**. | La pantalla "Generando" es solo una animación. |
| Dónde comprar cada ingrediente | Funciona bien, pero solo para **8 ingredientes** del catálogo. | Una receta real tiene 10–15 ingredientes; casi ninguno está en el catálogo. |
| Cocinar o pedir | Funciona: lista de compras, comparar tiendas, delivery, seguimiento. | — |

**Diagnóstico:** la parte de "qué hago con el plan" (comprar, pedir, seguir el pedido) está bien resuelta. Lo que flojea
es justo lo que diferencia a Mikhuna: **el plan en sí**. Hoy no depende de quién eres, y eso es lo primero que va a notar
alguien que pruebe la app o un jurado.

## Cómo debe funcionar la IA

La regla de fondo: **la IA no inventa recetas ni precios; elige entre recetas reales y explica por qué te sirven.** Un
modelo que inventa platos puede saltarse una alergia o proponer algo que no existe; uno que elige de una lista cerrada,
no.

```
Wizard (quién eres + qué puedes comer)
        │
        ▼
1. Filtro duro (SQL en Supabase, sin IA)      ← dataset de ~28 800 recetas reales
   restricciones, electrodomésticos, dificultad, cocina/país
        │  ~40 recetas candidatas
        ▼
2. Gemini elige y explica (Edge Function)
   recibe el perfil + las candidatas (id, nombre, ingredientes)
   devuelve 1 id por día + "por qué te va" en una frase
   el esquema de respuesta solo admite ids de la lista → no puede inventar
        │
        ▼
3. La app arma todo lo demás (sin IA)
   precios contra el catálogo de tiendas, lista de compras sumando cantidades,
   porciones según personas, dónde conviene comprar
        │
        └─ si Gemini falla o no hay cuota: el mismo paso 2 con reglas (puntaje)
```

- **Paso 1, lo que no se negocia, lo decide código:** si eres vegano o celíaco, el filtro saca esas recetas antes de que
  la IA las vea. El dataset ya trae `apta_vegana` / `apta_vegetariana` calculadas desde los ingredientes, no desde la
  etiqueta de la fuente.
- **Paso 2, lo que es criterio, lo decide la IA:** "soy estudiante y es mi primera vez", "quiero subir masa muscular",
  "extraño la comida de Arequipa", "algo rapidito entre semana". Ahí Gemini aporta lo que unas reglas no pueden: entender
  la intención y variar la semana (no tres sopas seguidas).
- **Paso 3, los números, los calcula la app:** precios, cantidades y presupuesto siempre salen del catálogo, nunca de la
  IA (ya funciona así en `lib/ia.ts`).
- **"IA local":** no conviene un modelo dentro del celular (cientos de MB, lento, gasta batería). Lo "local" es el filtro
  y el respaldo por reglas: el plan se arma aunque Gemini esté caído.
- **Costo:** mandar 40 candidatas resumidas son pocos tokens; cabe holgado en la capa gratis de Gemini. Falta un límite
  de llamadas por usuario (ver IA.md).

### ¿Qué quiere decir "modo híbrido"?

En el grupo se habló de que la IA funcione en "modo híbrido". La palabra se usa para tres cosas distintas; esto es lo
que significa cada una para Mikhuna:

| Significado | Qué es | ¿Lo usamos? |
|---|---|---|
| **Reglas + IA** | El código filtra lo que no se negocia y calcula los números; Gemini elige y explica; si Gemini falla, las reglas eligen solas. | **Sí, es la propuesta de arriba.** |
| **Búsqueda híbrida** | Buscar recetas por palabras ("pollo", "Arequipa") y por significado con vectores (pgvector: "algo ligero para la noche"). | **Sí, más adelante**, para encontrar las candidatas del paso 1 en el dataset. |
| **Celular + nube** | Un modelo chico dentro del teléfono (Gemini Nano) para lo simple y Gemini en la nube para lo difícil. | **No.** Hoy solo corre en algunos celulares de gama alta. |

Cuando digamos "modo híbrido" en el proyecto, nos referimos al primero.

## Qué construir, en orden

Puntaje = impacto × confianza ÷ esfuerzo (1–5 cada uno).

| # | Qué | Por qué | Puntaje |
|---|---|---|---|
| 1 | **Paso "¿Quién eres?"** en el wizard: estudiante que recién cocina / lejos de casa (qué cocina extraña) / tengo un objetivo (fit, bajar, subir) / solo quiero comer rico. Más nivel en la cocina. | Es la promesa central de la presentación y hoy no existe. Barato: una pantalla y dos campos. | 5×5÷1 = **25** |
| 2 | **Plan local que respete restricciones, presupuesto y electrodomésticos** (aunque sea con las recetas actuales). | Hoy un vegano recibe carne. Arreglarlo no depende de nada. | 5×5÷2 = **12.5** |
| 3 | **Cargar un subconjunto del dataset a Supabase**: recetas con ingredientes bien separados, peruanas primero y algunas de otras cocinas (unas 2 000–5 000), con dificultad estimada y electrodomésticos detectados en los pasos. | Sin recetas reales no hay plan "según quién eres". **Necesita los CSV** (no están en esta compu). | 5×4÷3 ≈ **6.7** |
| 4 | **`generar-plan` v2**: filtro SQL → Gemini elige por id con "por qué te va" → respaldo por reglas. Conectarla al wizard. | Es la IA de la presentación, hecha sin que pueda inventar. | 5×4÷3 ≈ **6.7** |
| 5 | **Ampliar el catálogo de ingredientes** con los ~50 más frecuentes del dataset, con precios de referencia marcados como demo. | "Dónde comprar cada ingrediente" solo convence si la lista sale completa. | 4×4÷3 ≈ **5.3** |

Los puntos 1 y 2 se pueden hacer ya. El 3, apenas estén los CSV. El 4 depende del 3.

## Lo que no vamos a hacer (por ahora)

- **Un modelo de IA dentro del celular.**
- **Dejar que la IA invente recetas, cantidades o precios.**
- **Prometer seguridad para alergias.** El filtro ayuda, pero los datos vienen de sitios de recetas: la app debe decir que
  revise los ingredientes si tiene una alergia seria.
- **Competir con Rappi o PedidosYa en "pedir algo ya".** El Flujo B sirve, pero la diferencia de Mikhuna es el plan;
  ahí va el esfuerzo.
- **Pagos reales.**

## Cómo sabremos que funciona

- **Plan aceptado:** de cada plan generado, cuántos el usuario deja sin cambiar recetas (meta inicial: más de la mitad).
- **Receta abierta:** cuántos platos del plan se abren para ver la preparación.
- **Del plan a la compra:** cuántos planes terminan en lista de compras marcada o pedido de ingredientes.
- **Cero violaciones:** ningún plan con una receta que choque con las restricciones del usuario (se puede probar
  automáticamente).

## Riesgos

- **Licencia del dataset.** Las recetas vienen de sitios comerciales; vale para el curso y el prototipo, no para publicar
  la app sin revisarlo (ver DATASET.md).
- **Calidad de los datos.** Cerca de la mitad de los ingredientes no tiene cantidad confiable; por eso conviene cargar solo
  el subconjunto con ingredientes bien separados.
- **Cuota de Gemini.** Sin límite por usuario, alguien con sesión puede agotarla; el respaldo por reglas evita que la app
  se quede sin plan.
