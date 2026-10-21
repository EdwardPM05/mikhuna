import { RECETAS as RECETAS_BASE, type Receta as RecetaBase } from "../supabase/functions/_shared/recetas.ts";
import { DIAS } from "../supabase/functions/_shared/plan.ts";

export const TOTAL_PASOS = 8;

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

export { DIAS };

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

// Las recetas viven en supabase/functions/_shared/recetas.ts porque la Edge
// Function generar-plan usa exactamente las mismas: la IA solo elige entre
// ellas. Aquí se les agrega lo que solo existe en la app, como la foto.
export type { IngredienteReceta, Region } from "../supabase/functions/_shared/recetas.ts";

const FOTOS: Record<string, number> = {
  "causa-limena": require("../src/assets/platos/causa-limena.jpg"),
};

export type Receta = RecetaBase & { foto?: number };

export const RECETAS: Receta[] = RECETAS_BASE.map((r) => ({ ...r, foto: FOTOS[r.id] }));

export const DISTRITOS = [
  "Ate", "Barranco", "Breña", "Carabayllo", "Chorrillos", "Comas", "El Agustino",
  "Independencia", "Jesús María", "La Molina", "La Victoria", "Lince", "Los Olivos",
  "Magdalena del Mar", "Miraflores", "Pueblo Libre", "Puente Piedra", "Rímac",
  "San Borja", "San Isidro", "San Juan de Lurigancho", "San Juan de Miraflores",
  "San Luis", "San Martín de Porres", "San Miguel", "Santa Anita",
  "Santiago de Surco", "Surquillo", "Villa El Salvador", "Villa María del Triunfo",
];
