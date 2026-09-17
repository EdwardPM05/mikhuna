export const TOTAL_PASOS = 7;

export type TipoNegocio = "Restaurante" | "Bodega" | "Mercado" | "Supermercado";

export type Negocio = {
  id: string;
  nombre: string;
  tipo: TipoNegocio;
  inicial: string;
  color: string;
  deBarrio: boolean;
  calificacion: number;
  tiempoEntregaMin: number;
  pedidoMinimo: number;
  categorias: string[];
};

export const NEGOCIOS: Negocio[] = [
  {
    id: "don-jose",
    nombre: "Bodega Don José",
    tipo: "Bodega",
    inicial: "DJ",
    color: "#E5131B",
    deBarrio: true,
    calificacion: 4.8,
    tiempoEntregaMin: 20,
    pedidoMinimo: 15,
    categorias: ["bodegas"],
  },
  {
    id: "mercado-surquillo",
    nombre: "Mercado de Surquillo",
    tipo: "Mercado",
    inicial: "MS",
    color: "#F7941D",
    deBarrio: true,
    calificacion: 4.6,
    tiempoEntregaMin: 35,
    pedidoMinimo: 25,
    categorias: ["mercados"],
  },
  {
    id: "mercado-central",
    nombre: "Mercado Central",
    tipo: "Mercado",
    inicial: "MC",
    color: "#7A1220",
    deBarrio: true,
    calificacion: 4.5,
    tiempoEntregaMin: 40,
    pedidoMinimo: 25,
    categorias: ["mercados"],
  },
  {
    id: "la-esquina",
    nombre: "Minimarket La Esquina",
    tipo: "Bodega",
    inicial: "LE",
    color: "#E5131B",
    deBarrio: true,
    calificacion: 4.7,
    tiempoEntregaMin: 15,
    pedidoMinimo: 10,
    categorias: ["bodegas", "ofertas"],
  },
  {
    id: "sazon-criolla",
    nombre: "Sazón Criolla de Barrio",
    tipo: "Restaurante",
    inicial: "SC",
    color: "#E5131B",
    deBarrio: true,
    calificacion: 4.9,
    tiempoEntregaMin: 30,
    pedidoMinimo: 20,
    categorias: ["restaurantes", "recetas-rapidas"],
  },
  {
    id: "chifa-feliz",
    nombre: "Chifa Felicidad",
    tipo: "Restaurante",
    inicial: "CF",
    color: "#7A1220",
    deBarrio: false,
    calificacion: 4.4,
    tiempoEntregaMin: 35,
    pedidoMinimo: 25,
    categorias: ["restaurantes", "ofertas"],
  },
  {
    id: "plaza-vea",
    nombre: "Plaza Vea",
    tipo: "Supermercado",
    inicial: "PV",
    color: "#241F21",
    deBarrio: false,
    calificacion: 4.3,
    tiempoEntregaMin: 45,
    pedidoMinimo: 30,
    categorias: ["mercados"],
  },
  {
    id: "metro",
    nombre: "Metro",
    tipo: "Supermercado",
    inicial: "M",
    color: "#241F21",
    deBarrio: false,
    calificacion: 4.2,
    tiempoEntregaMin: 45,
    pedidoMinimo: 30,
    categorias: ["mercados"],
  },
];

export type CategoriaExplorar = { id: string; nombre: string; emoji: string };

export const CATEGORIAS_EXPLORAR: CategoriaExplorar[] = [
  { id: "restaurantes", nombre: "Restaurantes", emoji: "🍽️" },
  { id: "mercados", nombre: "Mercados", emoji: "🥬" },
  { id: "bodegas", nombre: "Bodegas", emoji: "🏪" },
  { id: "ofertas", nombre: "Ofertas del día", emoji: "🏷️" },
  { id: "recetas-rapidas", nombre: "Recetas rápidas", emoji: "⚡" },
];

export type Producto = {
  id: string;
  negocioId: string;
  nombre: string;
  precio: number;
};

export const PRODUCTOS: Producto[] = [
  { id: "p1", negocioId: "don-jose", nombre: "Canasta de verduras", precio: 22 },
  { id: "p2", negocioId: "don-jose", nombre: "Pan del día (x10)", precio: 8 },
  { id: "p3", negocioId: "don-jose", nombre: "Leche evaporada", precio: 5.5 },
  { id: "p4", negocioId: "don-jose", nombre: "Huevos (x30)", precio: 18 },
  { id: "p5", negocioId: "mercado-surquillo", nombre: "Pollo entero", precio: 24 },
  { id: "p6", negocioId: "mercado-surquillo", nombre: "Palta fuerte (kg)", precio: 7 },
  { id: "p7", negocioId: "mercado-surquillo", nombre: "Camote amarillo (kg)", precio: 3.5 },
  { id: "p8", negocioId: "mercado-central", nombre: "Choclo desgranado (kg)", precio: 6 },
  { id: "p9", negocioId: "mercado-central", nombre: "Ají amarillo (kg)", precio: 9 },
  { id: "p10", negocioId: "la-esquina", nombre: "Arroz (kg)", precio: 4.5 },
  { id: "p11", negocioId: "la-esquina", nombre: "Aceite vegetal 1L", precio: 12 },
  { id: "p12", negocioId: "sazon-criolla", nombre: "Lomo saltado", precio: 22 },
  { id: "p13", negocioId: "sazon-criolla", nombre: "Ají de gallina", precio: 18 },
  { id: "p14", negocioId: "sazon-criolla", nombre: "Menú del día", precio: 14 },
  { id: "p15", negocioId: "chifa-feliz", nombre: "Arroz chaufa mixto", precio: 19 },
  { id: "p16", negocioId: "chifa-feliz", nombre: "Tallarín saltado", precio: 20 },
  { id: "p17", negocioId: "chifa-feliz", nombre: "Wantán frito (10u)", precio: 12 },
  { id: "p18", negocioId: "plaza-vea", nombre: "Pack familiar de fideos", precio: 15 },
  { id: "p19", negocioId: "plaza-vea", nombre: "Papel higiénico (x12)", precio: 22 },
  { id: "p20", negocioId: "metro", nombre: "Detergente 3kg", precio: 28 },
  { id: "p21", negocioId: "metro", nombre: "Gaseosa 3L", precio: 9 },
];

// Ingredientes para la lista de compras: cada uno se vende en uno o más
// negocios, a precios distintos — no asumimos que un solo negocio tenga
// todo lo que necesita una receta.
export type OfertaIngrediente = { negocioId: string; precio: number; unidad: string };
export type Ingrediente = { id: string; nombre: string; icono: number; ofertas: OfertaIngrediente[] };

// La oferta que el usuario eligió a mano para este ingrediente (si sigue
// existiendo entre las disponibles), o si no, la más barata por defecto.
export function ofertaElegida(
  ingrediente: Ingrediente,
  preferencias: Record<string, string>
): OfertaIngrediente {
  const preferida = preferencias[ingrediente.id];
  const encontrada = preferida && ingrediente.ofertas.find((o) => o.negocioId === preferida);
  if (encontrada) return encontrada;
  return [...ingrediente.ofertas].sort((a, b) => a.precio - b.precio)[0];
}

export const INGREDIENTES: Ingrediente[] = [
  {
    id: "tomate",
    nombre: "Tomate",
    icono: require("../src/assets/ingredientes/tomate.png"),
    ofertas: [
      { negocioId: "don-jose", precio: 1.5, unidad: "unidad" },
      { negocioId: "mercado-surquillo", precio: 1.0, unidad: "unidad" },
    ],
  },
  {
    id: "cebolla",
    nombre: "Cebolla morada",
    icono: require("../src/assets/ingredientes/cebolla.png"),
    ofertas: [
      { negocioId: "mercado-surquillo", precio: 1.2, unidad: "unidad" },
      { negocioId: "mercado-central", precio: 1.0, unidad: "unidad" },
    ],
  },
  {
    id: "aji",
    nombre: "Ají amarillo",
    icono: require("../src/assets/ingredientes/aji.png"),
    ofertas: [{ negocioId: "mercado-central", precio: 0.8, unidad: "unidad" }],
  },
  {
    id: "ajo",
    nombre: "Ajo",
    icono: require("../src/assets/ingredientes/ajo.png"),
    ofertas: [
      { negocioId: "don-jose", precio: 2.0, unidad: "cabeza" },
      { negocioId: "la-esquina", precio: 1.8, unidad: "cabeza" },
    ],
  },
  {
    id: "palta",
    nombre: "Palta fuerte",
    icono: require("../src/assets/ingredientes/palta.png"),
    ofertas: [{ negocioId: "mercado-surquillo", precio: 6.5, unidad: "kg" }],
  },
  {
    id: "limon",
    nombre: "Limón",
    icono: require("../src/assets/ingredientes/limon.png"),
    ofertas: [
      { negocioId: "mercado-surquillo", precio: 4.0, unidad: "kg" },
      { negocioId: "mercado-central", precio: 3.5, unidad: "kg" },
    ],
  },
  {
    id: "choclo",
    nombre: "Choclo",
    icono: require("../src/assets/ingredientes/choclo.png"),
    ofertas: [
      { negocioId: "mercado-central", precio: 2.0, unidad: "unidad" },
      { negocioId: "mercado-surquillo", precio: 2.2, unidad: "unidad" },
    ],
  },
  {
    id: "culantro",
    nombre: "Culantro",
    icono: require("../src/assets/ingredientes/culantro.png"),
    ofertas: [{ negocioId: "mercado-surquillo", precio: 1.5, unidad: "atado" }],
  },
];

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export type Antojo = { id: string; nombre: string; icono: number };

export const ANTOJOS: Antojo[] = [
  { id: "criolla", nombre: "Criolla", icono: require("../src/assets/antojos/criolla.png") },
  { id: "rapida", nombre: "Rápida", icono: require("../src/assets/antojos/rapida.png") },
  { id: "saludable", nombre: "Saludable", icono: require("../src/assets/antojos/saludable.png") },
  { id: "menu-dia", nombre: "Menú del día", icono: require("../src/assets/antojos/menu-dia.png") },
  { id: "vegetariana", nombre: "Vegetariana", icono: require("../src/assets/antojos/vegetariana.png") },
  { id: "proteica", nombre: "Fit / Proteica", icono: require("../src/assets/antojos/proteica.png") },
  { id: "economica", nombre: "Económica", icono: require("../src/assets/antojos/economica.png") },
  { id: "antojo-chifa", nombre: "Chifa", icono: require("../src/assets/antojos/antojo-chifa.png") },
];

export type Restriccion = { id: string; nombre: string; icono: number };

export const RESTRICCIONES: Restriccion[] = [
  { id: "ninguna", nombre: "Ninguna", icono: require("../src/assets/restricciones/ninguna.png") },
  { id: "vegetariano", nombre: "Vegetariano", icono: require("../src/assets/restricciones/vegetariano.png") },
  { id: "vegano", nombre: "Vegano", icono: require("../src/assets/restricciones/vegano.png") },
  { id: "sin-gluten", nombre: "Sin gluten", icono: require("../src/assets/restricciones/sin-gluten.png") },
  { id: "sin-lactosa", nombre: "Sin lactosa", icono: require("../src/assets/restricciones/sin-lactosa.png") },
  { id: "pescetariano", nombre: "Pescetariano", icono: require("../src/assets/restricciones/pescetariano.png") },
];

export type Electrodomestico = { id: string; nombre: string };

export const ELECTRODOMESTICOS: Electrodomestico[] = [
  { id: "cocina", nombre: "Cocina a gas" },
  { id: "horno", nombre: "Horno" },
  { id: "microondas", nombre: "Microondas" },
  { id: "licuadora", nombre: "Licuadora" },
  { id: "arrocera", nombre: "Olla arrocera" },
  { id: "freidora", nombre: "Freidora de aire" },
];

export type IngredienteReceta = {
  texto: string;
  // id de INGREDIENTES cuando el ingrediente existe en el catálogo de compras,
  // así se puede saber si el usuario ya lo marcó como comprado.
  ingredienteId?: string;
};

export type Receta = {
  id: string;
  nombre: string;
  antojoId: string;
  ingredienteIcono: string; // id de INGREDIENTES, para mostrar su ícono
  tiempoMin: number;
  precio: number;
  ingredientes: IngredienteReceta[];
  pasos: string[];
  foto?: number; // foto real del plato, cuando la tengamos
};

export const RECETAS: Receta[] = [
  {
    id: "lomo-saltado",
    nombre: "Lomo saltado",
    antojoId: "criolla",
    ingredienteIcono: "tomate",
    tiempoMin: 25,
    precio: 22,
    ingredientes: [
      { texto: "400g de lomo de res en tiras" },
      { texto: "2 tomates en gajos", ingredienteId: "tomate" },
      { texto: "1 cebolla roja en tiras", ingredienteId: "cebolla" },
      { texto: "2 ajíes amarillos en tiras", ingredienteId: "aji" },
      { texto: "3 cucharadas de sillao" },
      { texto: "Papas fritas y arroz para acompañar" },
    ],
    pasos: [
      "Sazona la carne con sal y pimienta y séllala en la sartén bien caliente.",
      "Retira la carne y en la misma sartén saltea la cebolla y el ají amarillo.",
      "Agrega el tomate y saltea unos segundos más sin que se deshaga.",
      "Regresa la carne, añade el sillao y mezcla todo a fuego alto.",
      "Sirve de inmediato con papas fritas y arroz blanco.",
    ],
  },
  {
    id: "aji-gallina",
    nombre: "Ají de gallina",
    antojoId: "rapida",
    ingredienteIcono: "aji",
    tiempoMin: 30,
    precio: 18,
    ingredientes: [
      { texto: "1 pechuga de pollo deshilachada" },
      { texto: "4 cucharadas de ají amarillo licuado", ingredienteId: "aji" },
      { texto: "3 panes remojados en leche" },
      { texto: "1 cebolla picada", ingredienteId: "cebolla" },
      { texto: "2 dientes de ajo", ingredienteId: "ajo" },
      { texto: "Queso parmesano y nueces al gusto" },
    ],
    pasos: [
      "Sancocha la pechuga y deshílachala en tiras finas.",
      "Licúa el pan remojado en leche hasta obtener una crema.",
      "Sofríe la cebolla y el ajo, luego añade el ají amarillo licuado.",
      "Incorpora la crema de pan y el pollo deshilachado, cocina a fuego bajo.",
      "Sirve sobre arroz blanco con una papa sancochada y una aceituna.",
    ],
  },
  {
    id: "causa-limena",
    nombre: "Causa limeña",
    antojoId: "saludable",
    ingredienteIcono: "palta",
    tiempoMin: 20,
    precio: 16,
    foto: require("../src/assets/platos/causa-limena.jpg"),
    ingredientes: [
      { texto: "6 papas amarillas sancochadas" },
      { texto: "3 limones", ingredienteId: "limon" },
      { texto: "4 cucharadas de ají amarillo licuado", ingredienteId: "aji" },
      { texto: "1 palta en láminas", ingredienteId: "palta" },
      { texto: "Pollo o atún para el relleno" },
      { texto: "Mayonesa al gusto" },
    ],
    pasos: [
      "Prensa las papas aún calientes hasta lograr un puré fino.",
      "Mezcla el puré con el jugo de limón, el ají amarillo y sal al gusto.",
      "Divide la masa en dos y coloca una capa en un molde.",
      "Agrega el relleno de pollo o atún con mayonesa y cubre con la palta.",
      "Cierra con la otra capa de masa, desmolda y refrigera antes de servir.",
    ],
  },
  {
    id: "tallarin-verde",
    nombre: "Tallarín verde",
    antojoId: "menu-dia",
    ingredienteIcono: "choclo",
    tiempoMin: 25,
    precio: 14,
    ingredientes: [
      { texto: "300g de tallarines" },
      { texto: "2 tazas de hojas de espinaca y albahaca" },
      { texto: "1/2 taza de queso fresco" },
      { texto: "1 choclo desgranado y sancochado", ingredienteId: "choclo" },
      { texto: "1 diente de ajo", ingredienteId: "ajo" },
      { texto: "Un chorrito de leche evaporada" },
    ],
    pasos: [
      "Cocina los tallarines en agua con sal hasta que estén al dente.",
      "Licúa las hojas verdes con el queso fresco, el ajo y la leche.",
      "Vierte la mezcla en una sartén y calienta sin dejar hervir.",
      "Mezcla la salsa con los tallarines escurridos.",
      "Sirve con el choclo desgranado y un huevo frito encima si gustas.",
    ],
  },
  {
    id: "arroz-chaufa",
    nombre: "Arroz chaufa",
    antojoId: "antojo-chifa",
    ingredienteIcono: "cebolla",
    tiempoMin: 20,
    precio: 17,
    ingredientes: [
      { texto: "3 tazas de arroz cocido y frío" },
      { texto: "150g de pollo en cubos" },
      { texto: "2 huevos batidos" },
      { texto: "1 cebolla china picada" },
      { texto: "1 cebolla roja en cubos", ingredienteId: "cebolla" },
      { texto: "3 cucharadas de sillao y aceite de ajonjolí" },
    ],
    pasos: [
      "Saltea el pollo hasta dorar y resérvalo.",
      "En la misma sartén, cocina los huevos batidos y trocéalos.",
      "Agrega la cebolla roja y saltea a fuego alto.",
      "Incorpora el arroz frío y el sillao, mezclando bien para que no se pegue.",
      "Añade el pollo, la cebolla china y unas gotas de aceite de ajonjolí antes de servir.",
    ],
  },
  {
    id: "quinotto-palta",
    nombre: "Quinotto de palta",
    antojoId: "vegetariana",
    ingredienteIcono: "palta",
    tiempoMin: 30,
    precio: 15,
    ingredientes: [
      { texto: "1 taza de quinua lavada" },
      { texto: "1 palta madura", ingredienteId: "palta" },
      { texto: "1/2 cebolla picada", ingredienteId: "cebolla" },
      { texto: "2 dientes de ajo", ingredienteId: "ajo" },
      { texto: "2 tazas de caldo de verduras" },
      { texto: "Queso parmesano al gusto" },
    ],
    pasos: [
      "Sofríe la cebolla y el ajo hasta que estén transparentes.",
      "Agrega la quinua y tuéstala un par de minutos.",
      "Vierte el caldo poco a poco, removiendo como un risotto, hasta que la quinua esté cocida.",
      "Licúa la mitad de la palta con un poco de caldo e incorpórala a la olla.",
      "Sirve con láminas de la palta restante y queso parmesano.",
    ],
  },
  {
    id: "pollo-fit",
    nombre: "Pollo a la plancha fit",
    antojoId: "proteica",
    ingredienteIcono: "limon",
    tiempoMin: 20,
    precio: 19,
    ingredientes: [
      { texto: "1 pechuga de pollo" },
      { texto: "1 limón", ingredienteId: "limon" },
      { texto: "1 diente de ajo picado", ingredienteId: "ajo" },
      { texto: "Ensalada de hojas verdes" },
      { texto: "1 camote sancochado" },
      { texto: "Sal, pimienta y orégano al gusto" },
    ],
    pasos: [
      "Marina la pechuga con jugo de limón, ajo, sal, pimienta y orégano.",
      "Deja reposar 10 minutos para que tome sabor.",
      "Cocina en una plancha o sartén caliente hasta dorar ambos lados.",
      "Corta el camote sancochado en rodajas.",
      "Sirve el pollo con la ensalada y el camote al lado.",
    ],
  },
  {
    id: "menestron",
    nombre: "Menestrón",
    antojoId: "economica",
    ingredienteIcono: "culantro",
    tiempoMin: 35,
    precio: 10,
    ingredientes: [
      { texto: "1 zanahoria en cubos" },
      { texto: "1 taza de habas o frejoles" },
      { texto: "2 papas en cubos" },
      { texto: "1 taza de fideos" },
      { texto: "Culantro fresco picado", ingredienteId: "culantro" },
      { texto: "1 trozo de choclo en rodajas", ingredienteId: "choclo" },
    ],
    pasos: [
      "Hierve agua con sal y agrega la zanahoria y las habas primero.",
      "Suma las papas y el choclo, y cocina hasta que ablanden.",
      "Añade los fideos y cocina hasta que estén al dente.",
      "Sazona con sal y pimienta al gusto.",
      "Sirve bien caliente con culantro fresco picado por encima.",
    ],
  },
];

export type DiaConReceta = { dia: string; receta: Receta };

export function generarPlanSemana(diasSeleccionados: string[], antojosSeleccionados: string[]): DiaConReceta[] {
  const candidatas = antojosSeleccionados.length
    ? RECETAS.filter((r) => antojosSeleccionados.includes(r.antojoId))
    : RECETAS;
  const pool = candidatas.length ? candidatas : RECETAS;
  const diasOrdenados = DIAS.filter((d) => diasSeleccionados.includes(d));
  return diasOrdenados.map((dia, i) => ({ dia, receta: pool[i % pool.length] }));
}

export const DISTRITOS = [
  "Ate", "Barranco", "Breña", "Carabayllo", "Chorrillos", "Comas", "El Agustino",
  "Independencia", "Jesús María", "La Molina", "La Victoria", "Lince", "Los Olivos",
  "Magdalena del Mar", "Miraflores", "Pueblo Libre", "Puente Piedra", "Rímac",
  "San Borja", "San Isidro", "San Juan de Lurigancho", "San Juan de Miraflores",
  "San Luis", "San Martín de Porres", "San Miguel", "Santa Anita",
  "Santiago de Surco", "Surquillo", "Villa El Salvador", "Villa María del Triunfo",
];
