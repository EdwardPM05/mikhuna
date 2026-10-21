"""Convierte el dataset procesado (recipes.csv + ingredients.csv) en recetas que el plan puede usar.

Cada receta sale con la misma forma que `Receta` en supabase/functions/_shared/recetas.ts: dieta, gluten,
lactosa, electrodomésticos que necesita, dificultad, tiempo, precio estimado, antojos y región. El dataset
no trae casi nada de eso, así que se deduce de los ingredientes y los pasos. La regla de fondo: **ante la
duda, se marca lo que más restringe** (si no sabemos si lleva gluten, lleva gluten), porque un falso
"apto" puede enfermar a alguien y un falso "no apto" solo saca una receta del plan.

Se descartan las recetas que no sirven como comida de la semana: postres, bebidas, salsas sueltas,
duplicados, con ingredientes incompletos o con muy pocos pasos.

Entradas (--data, por defecto data/processed): recipes.csv, ingredients.csv
Salida (--out, por defecto data/recetas_app.jsonl): una receta por línea, lista para subir_recetas.py

Uso:
  python scripts/dataset/exportar_recetas.py [--data RUTA] [--out RUTA]
"""
import argparse
import ast
import csv
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

csv.field_size_limit(10**9)


def sin_tildes(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto.lower()) if unicodedata.category(c) != "Mn")


def patron(*palabras: str) -> re.Pattern:
    """Palabras sin tildes; cada una calza al inicio de palabra ("pollo" calza "pollos")."""
    return re.compile(r"\b(?:" + "|".join(palabras) + r")")


# ---------- Dieta ----------
CARNE = patron(
    "carne", "res\\b", "vacun", "ternera", "buey", "cerdo", "chancho", "puerco", "lechon", "pollo", "gallina",
    "pavo", "pato", "cordero", "conejo", "cabrito", "cuy", "jamon", "tocino", "bacon", "panceta", "chorizo",
    "salchich", "longaniza", "morcilla", "salami", "mortadela", "chicharron", "lomo", "pechuga", "muslo",
    "costilla", "solomillo", "chuleta", "higado", "molleja", "rinon", "corazon(?:es)? de (?:res|pollo|vaca|cerdo|cordero)", "anticucho", "mondongo",
    "callos\\b", "guanciale", "pepperoni", "cecina", "charqui", "sobrebarriga", "entrana", "picana", "asado de",
    "hamburguesa", "albondiga", "caldo de (?:pollo|carne|res|gallina|huesos)", "fondo de (?:pollo|carne|ave)",
    "pastilla de caldo", "cubito", "manteca de cerdo", "gelatina", "codorniz", "perdiz", "venado", "jabali", "frango", "porco", "linguica",
)
PESCADO = patron(
    "pescado", "atun", "salmon", "merluza", "bacalao", "camaron", "langost", "gamba", "pulpo", "calamar",
    "mejillon", "almeja", "concha", "choro", "anchoa", "anchoveta", "sardina", "bonito", "trucha", "corvina",
    "lenguado", "tilapia", "cangrejo", "marisco", "caballa", "jurel", "pejerrey", "surimi", "perico",
    "dorado", "mero", "rape", "boqueron", "chipiron", "sepia", "vieira", "callos de hacha", "ostra", "erizo",
    "pota", "pargo", "robalo", "bagre", "paiche", "doncella", "palometa", "sierra\\b", "lisa\\b", "cojinova",
    "salsa de pescado", "dashi", "katsuobushi", "camarao", "bacalhau", "peixe", "polvo\b",
)

# ---------- Alérgenos ----------
GLUTEN = patron(
    "harina", "pan\\b", "panes", "pan de", "panecillo", "pan rallado", "panko", "pasta", "fideo", "espagueti",
    "spaghetti", "tallarin", "macarron", "lasana", "canelon", "ravioli", "tortellini", "noqui", "gnocchi",
    "galleta", "bizcoch", "trigo", "cebada", "centeno", "avena", "cuscus", "couscous", "semola", "seitan",
    "cerveza", "malta", "soja", "soya", "sillao", "salsa inglesa", "worcester", "empanad", "masa", "hojaldre",
    "tortilla de trigo", "tortillas de trigo", "wantan", "won ton", "croissant", "bulgur", "crutones",
    "biscocho", "rebozad", "apanad", "brioche", "baguette", "pita", "tostada", "chapata", "ciabatta",
    "levadura", "dumpling", "obleas",
)
SIN_GLUTEN_OK = patron("harina de maiz", "harina de arroz", "harina de garbanzo", "harina de yuca",
                       "maicena", "fecula", "harina sin gluten", "pan sin gluten", "pasta sin gluten",
                       "salsa de soja sin gluten", "tamari", "masa de maiz", "harina pan\\b")
LACTOSA = patron(
    "leche", "queso", "mantequilla", "nata", "crema", "yogur", "yoghurt", "requeson", "ricota", "ricotta",
    "mozzarella", "mozarella", "parmesano", "manchego", "cheddar", "mascarpone", "suero", "helado",
    "dulce de leche", "manjar", "ghee", "kefir", "cuajada", "burrata", "gouda", "emmental", "gruyere",
    "roquefort", "provolone", "paneer", "lacteo", "bechamel", "chantilly",
)
SIN_LACTOSA_OK = patron("leche de coco", "leche de almendra", "leche de soja", "leche de soya",
                        "leche de avena", "leche de arroz", "leche vegetal", "crema de coco", "sin lactosa",
                        "queso vegano", "mantequilla de mani", "mantequilla de cacahuate",
                        "crema de cacahuate", "crema de mani", "nata vegetal", "mantequilla vegana")

# ---------- Lo que no es un plato de la semana ----------
NO_ES_PLATO = patron(
    "torta", "pastel", "tarta", "galleta", "helado", "flan\b", "mousse", "bizcocho", "brownie", "cupcake",
    "magdalena", "muffin", "mermelada", "confitura", "batido", "jugo", "zumo", "coctel", "cocktail", "trago",
    "pisco sour", "chicha morada", "smoothie", "licuado", "limonada", "ponche", "licor", "sangria",
    "mojito", "margarita", "alfajor", "budin", "pudin", "postre", "suspiro", "mazamorra", "arroz con leche",
    "picarones", "turron", "churro", "infusion", "tisana", "caramelo", "bombon", "trufa", "natilla", "crepe",
    "panqueque", "hot cake", "waffle", "rosca", "roscon", "donut", "galletita", "merengue", "glaseado",
    "cobertura", "relleno para", "masa para", "compota", "almibar", "sirope", "jarabe", "golosina",
    "chupetin", "sorbete", "granizado", "frappe", "granola", "barrita", "chilcano", "tiramisu",
    "cheesecake", "profiterol", "bunuelo", "rosquilla", "polvoron", "mantecado", "king kong", "encanelado",
    "queque", "keke", "cake", "pionono", "torrija", "arequipe", "cocada", "melcocha", "fondant",
    "base para", "como hacer", "como preparar", "en almibar", "glaseada", "dulce de",
)
# Estas solo cuentan al inicio del nombre: "Salsa de ají" no es un plato, "Pollo en salsa" sí.
NO_ES_PLATO_INICIO = re.compile(
    r"^(?:salsas?|aderezo|vinagreta|alioli|mayonesa|masa|pan|panes|panecillos?|bollos?|leche|vino|cerveza|"
    r"cafe|te|chocolate|dulces?|caldo base|fondo|crema chantilly|yogur|cereal|gelatina|paletas?|polos?|"
    r"pie|tejas|galletas?|empanadillas dulces|mantequilla|queso crema|helados?|crema de (?:rocoto|aji)|jalea de|pate)\b"
)
TIPOS_FUERA = {"postre", "desayuno"}
# Un postre que no se delata en el nombre ("Delicia de frutas"): lleva algo dulce y nada salado.
DULCE = patron("azucar", "miel", "leche condensada", "chocolate", "cacao", "vainilla", "mermelada", "manjar",
               "dulce de leche", "panela", "chancaca", "stevia", "edulcorante", "gelatina", "crema chantilly")
SALADO = patron("sal\b", "cebolla", "ajo\b", "ajos", "pimienta", "caldo", "comino", "aji", "rocoto",
                "mostaza", "salsa de soja", "sillao", "vinagre", "oregano", "laurel")

# ---------- Antojos y región ----------
CHIFA = patron("chaufa", "chifa", "wantan", "won ton", "tallarin saltado", "kam lu", "tipakay", "chi jau",
               "aeropuerto", "pollo enrollado", "chijaukay", "taypa", "arroz frito", "pollo agridulce",
               "cerdo agridulce", "chap suey", "chop suey")
SALUDABLE = patron("ensalada", "al vapor", "a la plancha", "plancha", "light", "saludable", "integral",
                   "quinoa", "quinua", "verdura", "vegetal", "crema de", "sopa de", "brocoli", "espinaca",
                   "calabacin", "zapallo", "lenteja", "garbanzo", "bowl", "wrap", "al horno", "papillote",
                   "hervido", "sancochado", "caldo", "menestron", "pesque", "tarwi")
FRITO = patron("frito", "frita", "fritos", "fritas", "apanad", "rebozad", "empanizad", "chicharron",
               "tempura", "crocante", "frituras")
MENU_DIA = patron("seco", "guiso", "estofado", "arroz con", "tallarin", "sopa", "caldo", "sancochado",
                  "menestra", "tacu", "picante", "cau cau", "chanfainita", "carapulcra", "olluquito",
                  "aji de", "adobo", "sudado", "chupe", "lentejas", "frejoles", "pallares", "tortilla de",
                  "saltado", "escabeche", "parihuela", "chaufa", "locro", "sopa seca", "tamal", "humita")
# Platos peruanos de casa: un sitio peruano también publica fettuccine y souffles, y esos no son "criolla".
CRIOLLA = patron("saltad", "seco", "aji de", "causa", "cebiche", "ceviche", "tiradito", "chaufa", "tacu",
                 "carapulcra", "olluquito", "cau cau", "chanfainita", "adobo", "pachamanca", "rocoto",
                 "huancaina", "ocopa", "chupe", "sudado", "parihuela", "escabeche", "anticucho", "juane",
                 "tacacho", "cecina", "papa rellena", "arroz con pollo", "arroz con pato", "tamal", "humita",
                 "sopa seca", "menestr", "frejoles", "pallares", "tallarines verdes", "tallarines rojos",
                 "locro", "picante", "pepian", "solterito", "jalea", "chicharron", "pollo a la brasa", "chilcano de",
                 "aguadito", "sancochado", "estofado", "caldo de gallina", "aji\b", "huatia", "chairo", "cuy",
                 "patasca", "lomo saltado", "tortilla de", "arroz tapado", "majado", "inchicapi", "patarashca")
PROTEINA = patron("pollo", "pechuga", "carne", "res\\b", "lomo", "atun", "salmon", "pescado", "huevo",
                  "lenteja", "garbanzo", "frejol", "frijol", "pallar", "tofu", "quinua", "quinoa", "pavo",
                  "cerdo", "trucha", "bonito", "tarwi", "soya", "camaron", "langostino", "queso fresco")

REGION = {
    "costa": patron("ceviche", "cebiche", "tiradito", "causa", "aji de gallina", "lomo saltado", "arroz con pato",
                    "seco", "tacu", "carapulcra", "sopa seca", "chupe de camarones", "parihuela", "escabeche",
                    "anticucho", "cau cau", "chanfainita", "sudado", "jalea", "arroz con mariscos",
                    "cabrito", "sangrecita", "olluquito", "tallarines verdes", "tallarin verde",
                    "pescado a lo macho", "choros"),
    "sierra": patron("pachamanca", "rocoto relleno", "cuy", "adobo", "chairo", "patasca", "puca picante",
                     "ocopa", "chupe", "olluco", "trucha", "papa rellena", "quinua", "quinoa",
                     "chuno", "caldo de cabeza", "kapchi", "solterito", "pepian", "arequipa", "cusco", "puno",
                     "huancayo", "ayacucho", "cajamarca", "humita", "tamal", "chicharron colorado", "locro",
                     "papa a la huancaina", "huancaina", "chiri uchu", "timpu", "lawa"),
    "selva": patron("juane", "tacacho", "cecina", "patarashca", "inchicapi", "paiche", "doncella", "chonta",
                    "aguaje", "camu camu", "maduro", "platano", "majado", "sarapatera", "zarapatera",
                    "timbuche", "purtumute", "iquitos", "pucallpa", "tarapoto", "amazon", "selva", "cocona"),
}

# ---------- Electrodomésticos ----------
HORNO = patron("horno", "hornea", "hornear", "gratin", "gratina", "precalent")
LICUADORA = patron("licua", "licuadora", "batidora", "turmix", "procesador", "procesa", "tritura", "mixer",
                   "minipimer", "pasapure", "termomix", "thermomix", "robot de cocina")
MICROONDAS = patron("microondas", "micro-ondas")
FREIDORA = patron("freidora de aire", "airfryer", "air fryer")
FUEGO = patron("fuego", "sarten", "olla", "hierv", "herv", "cocin", "sofr", "frei", "frie", "fria", "saltea",
               "cuece", "cocer", "coce", "caldo", "plancha", "ebullicion", "cazuela", "wok", "dora", "calien",
               "rehoga", "cuez", "sancoch", "guis", "estof", "hirv", "reduc", "fogon", "hornilla", "brasa",
               "parrilla", "vapor", "tuesta", "tostar", "pochar", "escalfa", "blanquea", "frit")

# Precio aproximado por kilo en un mercado de Lima (S/), para estimar cuánto cuesta cada receta. Es una
# estimación gruesa: sirve para ordenar por presupuesto, no para cobrar. La primera regla que calza gana.
PRECIO_KG = [
    (patron("lomo fino", "solomillo", "salmon", "langost", "pulpo", "vieira", "callos de hacha", "cordero"), 60),
    (patron("res\\b", "carne", "ternera", "buey", "lomo", "bistec", "costilla", "cerdo", "chancho", "jamon",
            "tocino", "bacon", "chorizo", "pato", "pavo", "camaron", "gamba", "langostino", "marisco",
            "calamar", "pota", "conejo", "cabrito", "cuy", "queso", "mantequilla", "nuez", "almendra",
            "pinon", "pistacho", "mani", "aceituna", "alcaparra"), 32),
    (patron("pescado", "atun", "merluza", "bonito", "trucha", "corvina", "tilapia", "caballa", "jurel",
            "mejillon", "choro", "almeja", "concha", "anchoa", "sardina"), 22),
    (patron("pollo", "pechuga", "muslo", "gallina", "higado", "salchich", "hot dog"), 14),
    (patron("huevo", "lenteja", "garbanzo", "frejol", "frijol", "pallar", "quinua", "quinoa", "tofu",
            "champin", "hongo", "seta", "palta", "aguacate", "pimiento", "aji", "rocoto", "chocolate"), 9),
    (patron("leche", "crema", "nata", "yogur", "aceite", "vinagre", "vino", "salsa", "harina", "pasta",
            "fideo", "tallarin", "espagueti", "macarron", "pan\\b", "azucar"), 6),
    (patron("arroz", "papa", "patata", "camote", "yuca", "cebolla", "tomate", "zanahoria", "zapallo",
            "calabaza", "repollo", "col\\b", "lechuga", "pepino", "platano", "choclo", "maiz", "limon",
            "naranja", "manzana", "agua", "caldo"), 3.5),
]
PRECIO_KG_OTRO = 8
SAL_Y_ESPECIAS = patron("sal\\b", "pimienta", "comino", "oregano", "laurel", "canela", "clavo", "paprika",
                        "pimenton", "curry", "nuez moscada", "azafran", "tomillo", "romero", "perejil",
                        "culantro", "cilantro", "hierbabuena", "albahaca", "ajo\\b", "ajos", "agua\\b")

MAX_PASOS = 15
MAX_LARGO_PASO = 500
MAX_BYTES_RECETA = 4500  # 7 recetas copiadas en el plan del usuario tienen que entrar en planes.datos (50 KB)


def a_float(valor: str) -> float | None:
    try:
        f = float(valor)
    except (TypeError, ValueError):
        return None
    return f if f == f else None  # NaN


def verdad(valor: str) -> bool:
    return valor == "True"


def lista_json(valor: str) -> list[str]:
    """Los pasos vienen como lista JSON y, en algunas fuentes, como una lista de Python metida dentro."""
    try:
        items = json.loads(valor)
    except (TypeError, ValueError):
        return []
    if len(items) == 1 and isinstance(items[0], str) and items[0].lstrip().startswith("["):
        try:
            items = ast.literal_eval(items[0])
        except (ValueError, SyntaxError):
            pass
    pasos = []
    for paso in items:
        paso = re.sub(r"^\s*(?:paso\s*)?\d{1,2}\s*[.)\-:]?\s+", "", str(paso), flags=re.I).strip()
        if len(paso) >= 8:
            pasos.append(paso if len(paso) <= MAX_LARGO_PASO else paso[: MAX_LARGO_PASO - 1].rsplit(" ", 1)[0] + "…")
    return pasos


def es_dulce(ingredientes: list[dict]) -> bool:
    texto = " | ".join(sin_tildes(i["texto"]) for i in ingredientes)
    # La gelatina cuenta como carne para la dieta, pero en un postre no lo vuelve salado.
    salado = texto.replace("gelatina", "")
    return bool(DULCE.search(texto)) and not SALADO.search(salado) and not CARNE.search(salado) and not PESCADO.search(salado)


def dieta_de(nombres: list[str], animales: list[bool], apta_vegana: bool, apta_vegetariana: bool) -> str:
    texto = " | ".join(nombres)
    if CARNE.search(texto):
        return "carne"
    if PESCADO.search(texto):
        return "pescado"
    if apta_vegana:
        return "vegana"
    if apta_vegetariana:
        return "vegetariana"
    # Lleva algo animal que no reconocemos: puede ser huevo o leche (vegetariana) o una carne con otro
    # nombre. Ante la duda, carne.
    return "carne" if any(animales) else "vegetariana"


def contiene(texto: str, alergeno: re.Pattern, excepciones: re.Pattern) -> bool:
    return bool(alergeno.search(excepciones.sub(" ", texto)))


def electrodomesticos_de(pasos: str) -> list[str]:
    requiere = []
    if FUEGO.search(pasos):
        requiere.append("cocina")
    if HORNO.search(pasos):
        requiere.append("horno")
    if LICUADORA.search(pasos):
        requiere.append("licuadora")
    if MICROONDAS.search(pasos):
        requiere.append("microondas")
    if FREIDORA.search(pasos):
        requiere.append("freidora")
    return requiere


def precio_kg(nombre: str) -> float:
    for regla, precio in PRECIO_KG:
        if regla.search(nombre):
            return precio
    return PRECIO_KG_OTRO


def precio_de(ingredientes: list[dict], comensales: float | None) -> int:
    """Costo aproximado para 2 personas, en soles enteros."""
    total = 0.0
    for ing in ingredientes:
        nombre = sin_tildes(ing["nombre"] or ing["texto"])
        if SAL_Y_ESPECIAS.search(nombre) and not ing["gramos"]:
            continue
        gramos = ing["gramos"] or ing["ml"]
        if gramos is None or gramos <= 0:
            gramos = 100  # sin dato: una porción razonable
        total += min(gramos, 3000) / 1000 * precio_kg(nombre)
    porciones = comensales if comensales and 1 <= comensales <= 20 else 4
    return int(round(min(60, max(5, total / porciones * 2))))


def proteina_por_racion(ingredientes: list[dict], comensales: float | None) -> float:
    porciones = comensales if comensales and 1 <= comensales <= 20 else 4
    gramos = sum((i["gramos"] or 0) for i in ingredientes if PROTEINA.search(sin_tildes(i["nombre"] or i["texto"])))
    return gramos / porciones


def region_de(nombre: str) -> str | None:
    for region, regla in REGION.items():
        if regla.search(nombre):
            return region
    return None


def dificultad_de(valor: str, num_pasos: int, num_ingredientes: int) -> int:
    d = a_float(valor)
    if d and 1 <= d <= 3:
        return int(d)
    if num_pasos <= 5 and num_ingredientes <= 8:
        return 1
    if num_pasos >= 10 or num_ingredientes >= 15:
        return 3
    return 2


def etiquetas_de(nombre: str, cocina: str, dieta: str, tiempo: int, precio: int, proteina: float) -> list[str]:
    etiquetas = []
    if CHIFA.search(nombre):
        etiquetas.append("antojo-chifa")
    elif cocina == "peruana" and (CRIOLLA.search(nombre) or region_de(nombre)):
        etiquetas.append("criolla")
    if dieta in ("vegana", "vegetariana"):
        etiquetas.append("vegetariana")
    if SALUDABLE.search(nombre) and not FRITO.search(nombre):
        etiquetas.append("saludable")
    if proteina >= 120:
        etiquetas.append("proteica")
    if tiempo <= 30:
        etiquetas.append("rapida")
    if precio <= 12:
        etiquetas.append("economica")
    if cocina == "peruana" and MENU_DIA.search(nombre):
        etiquetas.append("menu-dia")
    return etiquetas or ["menu-dia" if cocina == "peruana" else "economica" if precio <= 18 else "rapida"]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/processed")
    ap.add_argument("--out", default="data/recetas_app.jsonl")
    args = ap.parse_args()
    data = Path(args.data)

    ingredientes = defaultdict(list)
    with open(data / "ingredients.csv", encoding="utf-8", newline="") as f:
        for fila in csv.DictReader(f):
            ingredientes[fila["receta_id"]].append({
                "posicion": int(fila["posicion"]),
                "texto": fila["texto"].strip(),
                "nombre": fila["nombre"].strip(),
                "catalogo": fila["ingrediente_id"] or None,
                "gramos": None if verdad(fila["cantidad_sospechosa"]) else a_float(fila["gramos_totales"]),
                "ml": None if verdad(fila["cantidad_sospechosa"]) else a_float(fila["ml_estimados"]),
                "animal": verdad(fila["es_animal"]),
                "dudoso": verdad(fila["parseo_dudoso"]),
            })

    descartes = Counter()
    salida = []
    with open(data / "recipes.csv", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            nombre = r["nombre"].strip()
            n = sin_tildes(nombre)
            ings = sorted(ingredientes.get(r["receta_id"], []), key=lambda i: i["posicion"])
            pasos = lista_json(r["pasos"])
            motivo = (
                "duplicado" if r["posible_duplicado_de"] else
                "ingredientes incompletos" if verdad(r["ingredientes_incompletos"]) or len(ings) < 3 else
                "parseo dudoso" if sum(i["dudoso"] for i in ings) > len(ings) * 0.3 else
                "pocos pasos" if len(pasos) < 2 else
                "postre, bebida o salsa" if es_dulce(ings) or r["tipo_plato"] in TIPOS_FUERA or NO_ES_PLATO.search(n) or NO_ES_PLATO_INICIO.search(n) else
                "nombre raro" if not 4 <= len(nombre) <= 70 else
                None
            )
            if motivo:
                descartes[motivo] += 1
                continue

            nombres = [sin_tildes(i["nombre"] or i["texto"]) for i in ings]
            textos = " | ".join(sin_tildes(i["texto"]) for i in ings)
            texto_pasos = sin_tildes(" ".join(pasos))
            cocina = "peruana" if r["pais"] == "Perú" else "internacional"
            dieta = dieta_de([textos] + nombres, [i["animal"] for i in ings], verdad(r["apta_vegana"]), verdad(r["apta_vegetariana"]))
            comensales = None if verdad(r["comensales_sospechoso"]) else a_float(r["comensales"])
            minutos = None if verdad(r["duracion_sospechosa"]) else a_float(r["duracion_min"])
            tiempo = int(minutos) if minutos and 5 <= minutos <= 240 else min(90, 15 + 5 * len(pasos))
            precio = precio_de(ings, comensales)
            etiquetas = etiquetas_de(n, cocina, dieta, tiempo, precio, proteina_por_racion(ings, comensales))
            catalogo = [i["catalogo"] for i in ings if i["catalogo"]]

            receta = {
                "id": f"ds-{r['receta_id']}",
                "nombre": nombre,
                "antojoId": etiquetas[0],
                "etiquetas": etiquetas,
                "cocina": cocina,
                "region": region_de(n) if cocina == "peruana" else None,
                "dieta": dieta,
                "conGluten": contiene(textos, GLUTEN, SIN_GLUTEN_OK),
                "conLactosa": contiene(textos, LACTOSA, SIN_LACTOSA_OK),
                "requiere": electrodomesticos_de(texto_pasos),
                "dificultad": dificultad_de(r["dificultad"], len(pasos), len(ings)),
                "ingredienteIcono": catalogo[0] if catalogo else "culantro",
                "tiempoMin": tiempo,
                "precio": precio,
                "ingredientes": [
                    {"texto": i["texto"], **({"ingredienteId": i["catalogo"]} if i["catalogo"] else {})} for i in ings
                ],
                "pasos": pasos[:MAX_PASOS],
                "pais": r["pais"] or None,
            }
            if len(json.dumps(receta, ensure_ascii=False).encode()) > MAX_BYTES_RECETA:
                descartes["demasiado larga"] += 1
                continue
            salida.append(receta)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        for receta in salida:
            f.write(json.dumps(receta, ensure_ascii=False) + "\n")

    print(f"{len(salida)} recetas -> {out}")
    print("descartadas:", dict(descartes.most_common()))
    for campo in ("dieta", "cocina", "region", "antojoId", "dificultad"):
        print(f"{campo}:", dict(Counter(str(x[campo]) for x in salida).most_common()))
    print("con gluten:", sum(x["conGluten"] for x in salida), "con lactosa:", sum(x["conLactosa"] for x in salida))
    print("requiere:", dict(Counter(e for x in salida for e in x["requiere"]).most_common()))


if __name__ == "__main__":
    main()
