"""Une los datasets de recetas en español en dos tablas limpias.

Entradas (por defecto en ~/Downloads, ver --downloads):
  recetasdelaabuela.csv, main.csv       esquema de 14-19 columnas, ~97% solapados entre sí
  train.csv, valid.csv, test.csv        esquema de 5 columnas, ingredientes pegados sin separador

Salidas (en --out, por defecto data/processed, ignorado por git):
  recipes.csv       una fila por receta única
  ingredients.csv   una fila por ingrediente (solo recetas con ingredientes separables)

Uso:
  pip install pandas pyarrow
  python scripts/dataset/build_recipes.py [--downloads RUTA] [--out RUTA]
"""
import argparse
import ast
import json
import re
import unicodedata
from pathlib import Path

import pandas as pd

# Prioridad al deduplicar: la primera fuente gana campo por campo (si está vacío, cae a la siguiente).
FUENTES = ["recetasdelaabuela.csv", "main.csv", "train.csv", "valid.csv", "test.csv"]

PAISES_ISO = {
    "ESP": "España", "MEX": "México", "PER": "Perú", "ARG": "Argentina", "CHL": "Chile",
    "COL": "Colombia", "VEN": "Venezuela", "PRI": "Puerto Rico", "CUB": "Cuba", "ECU": "Ecuador",
    "SLV": "El Salvador", "DOM": "República Dominicana", "BOL": "Bolivia", "URY": "Uruguay",
    "PRY": "Paraguay", "PAN": "Panamá", "GTM": "Guatemala", "HND": "Honduras", "NIC": "Nicaragua",
    "CRI": "Costa Rica",
}

# ids de INGREDIENTES en lib/catalogo.ts -> palabras que lo identifican
CATALOGO = {
    "tomate": ["tomate"],
    "cebolla": ["cebolla"],
    "aji": ["aji", "ají"],
    "ajo": ["ajo", "ajos"],
    "palta": ["palta", "aguacate"],
    "limon": ["limon", "limón"],
    "choclo": ["choclo"],
    "culantro": ["culantro", "cilantro"],
}

UNIDADES = (
    r"kilogramos?|kilos?|kgs?|gramos?|grs?|g|litros?|lts?|l|mililitros?|ml|cc|cl|"
    r"cucharadas?|cucharaditas?|cucharillas?|cuchara|cdas?|cdtas?|tazas?|vasos?|puñados?|pizcas?|chorros?|chorritos?|"
    r"dientes?|hojas?|ramas?|ramitas?|manojos?|latas?|paquetes?|sobres?|unidades?|"
    r"rodajas?|lonchas?|filetes?|trozos?|onzas?|oz|libras?|lb|cabezas?|atados?|tallos?|pedazos?"
)

# unidad cruda -> (unidad_base, factor, tipo)
#   g/ml son comparables y sumables; 'aprox' marca conversiones de volumen (una taza de harina y una de agua no pesan igual)
#   unidad/pizca/... no se convierten: son conteos o medidas sin equivalente exacto.
CONVERSION = {
    "kg": ("g", 1000, "peso"), "kgs": ("g", 1000, "peso"), "kilo": ("g", 1000, "peso"), "kilos": ("g", 1000, "peso"),
    "kilogramo": ("g", 1000, "peso"), "kilogramos": ("g", 1000, "peso"),
    "g": ("g", 1, "peso"), "gr": ("g", 1, "peso"), "grs": ("g", 1, "peso"), "gramo": ("g", 1, "peso"), "gramos": ("g", 1, "peso"),
    "onza": ("g", 28.35, "peso"), "onzas": ("g", 28.35, "peso"), "oz": ("g", 28.35, "peso"),
    "libra": ("g", 453.6, "peso"), "libras": ("g", 453.6, "peso"), "lb": ("g", 453.6, "peso"),
    "ml": ("ml", 1, "volumen"), "cc": ("ml", 1, "volumen"), "mililitro": ("ml", 1, "volumen"), "mililitros": ("ml", 1, "volumen"),
    "cl": ("ml", 10, "volumen"), "l": ("ml", 1000, "volumen"), "lt": ("ml", 1000, "volumen"), "lts": ("ml", 1000, "volumen"),
    "litro": ("ml", 1000, "volumen"), "litros": ("ml", 1000, "volumen"),
    # medidas de cocina: volumen aproximado (estándar 15 / 5 / 240 / 200 ml)
    "cucharada": ("ml", 15, "volumen_aprox"), "cucharadas": ("ml", 15, "volumen_aprox"), "cda": ("ml", 15, "volumen_aprox"),
    "cdas": ("ml", 15, "volumen_aprox"), "cuchara": ("ml", 15, "volumen_aprox"),
    "cucharadita": ("ml", 5, "volumen_aprox"), "cucharaditas": ("ml", 5, "volumen_aprox"), "cdta": ("ml", 5, "volumen_aprox"),
    "cdtas": ("ml", 5, "volumen_aprox"), "cucharilla": ("ml", 5, "volumen_aprox"), "cucharillas": ("ml", 5, "volumen_aprox"),
    "taza": ("ml", 240, "volumen_aprox"), "tazas": ("ml", 240, "volumen_aprox"),
    "vaso": ("ml", 200, "volumen_aprox"), "vasos": ("ml", 200, "volumen_aprox"),
}
# unidades de conteo/medida sin conversión: se guardan en singular
SINGULAR = {"dientes": "diente", "hojas": "hoja", "ramas": "rama", "ramitas": "ramita", "manojos": "manojo", "latas": "lata",
            "paquetes": "paquete", "sobres": "sobre", "unidades": "unidad", "rodajas": "rodaja", "lonchas": "loncha",
            "filetes": "filete", "trozos": "trozo", "puñados": "puñado", "pizcas": "pizca", "chorros": "chorro",
            "chorritos": "chorrito", "cabezas": "cabeza", "atados": "atado", "tallos": "tallo", "pedazos": "pedazo"}
AL_GUSTO = re.compile(r"\b(al gusto|a gusto|c/n|cantidad necesaria|necesario|necesaria|un poco|lo justo|cantidad suficiente)\b", re.I)
EQUIVALENCIA = re.compile(r"\(\s*(?:aprox\.?\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramos|ml|l|lt|litros?|cc)\s*(?:\.|[/,-][^)]*)?\)", re.I)
FRACCIONES = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}


def sin_tildes(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def clave_titulo(titulo: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", sin_tildes(str(titulo).lower())).strip()


def clave_url(url) -> str | None:
    if not isinstance(url, str) or not url.strip():
        return None
    limpia = re.sub(r"[?#].*$", "", url.strip().lower()).rstrip("/")
    # algunas filas traen solo la portada del sitio (p. ej. https://www.yanuq.com/): no identifica una receta
    if not re.sub(r"^https?://[^/]+", "", limpia):
        return None
    return limpia


def normalizar_pais(valor) -> str | None:
    if not isinstance(valor, str) or not valor.strip():
        return None
    v = valor.strip()
    if v.upper() in PAISES_ISO:
        return PAISES_ISO[v.upper()]
    v = sin_tildes(v).lower()
    mapa = {
        "peru": "Perú", "mexico": "México", "espana": "España", "internacional": "Internacional",
        "puerto rico": "Puerto Rico", "costa rica": "Costa Rica", "el salvador": "El Salvador",
        "republica dominicana": "República Dominicana", "panama": "Panamá",
    }
    return mapa.get(v, v.title())


def a_minutos(valor) -> int | None:
    """Acepta '2h 30m', '45m', '45 min', '01:00'."""
    if not isinstance(valor, str):
        return None
    v = valor.strip().lower()
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", v)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    horas = re.search(r"(\d+)\s*h", v)
    mins = re.search(r"(\d+)\s*m", v)
    if horas or mins:
        return (int(horas.group(1)) * 60 if horas else 0) + (int(mins.group(1)) if mins else 0)
    return None


def a_lista(valor) -> list[str]:
    """Convierte "['a', 'b']" o 'a, b' en lista."""
    if not isinstance(valor, str) or not valor.strip():
        return []
    v = valor.strip()
    if v.startswith("["):
        try:
            return [str(x).strip() for x in ast.literal_eval(v) if str(x).strip()]
        except (ValueError, SyntaxError):
            pass
    return [x.strip() for x in v.split(",") if x.strip()]


def dividir_ingredientes(texto) -> list[str]:
    """Divide por coma ignorando las que van dentro de paréntesis."""
    if not isinstance(texto, str) or not texto.strip():
        return []
    if texto.strip().startswith("["):
        return a_lista(texto)
    partes, actual, nivel = [], "", 0
    for ch in texto:
        if ch == "(":
            nivel += 1
        elif ch == ")":
            nivel = max(0, nivel - 1)
        if ch == "," and nivel == 0:
            partes.append(actual)
            actual = ""
        else:
            actual += ch
    partes.append(actual)
    return [re.sub(r"[.\s]+$", "", p).strip() for p in partes if p.strip()]


CONECTORES = {"de", "del", "la", "el", "los", "las", "con", "y", "o", "a", "e", "u", "al", "en", "por", "para",
              "hasta", "unos", "unas", "cada", "más", "mas", "entre", "aprox", "aproximadamente"}


def _cortar_pegados(t: str) -> list[str]:
    """Corta un fragmento sin comas: minúscula→Mayúscula, letra→dígito y 'palabra 3 cosa' (salvo tras conectores)."""
    t = re.sub(r"(?<=[a-záéíóúñ)\.])(?=[A-ZÁÉÍÓÚÑ])", "|", t)
    t = re.sub(r"(?<=[a-záéíóúñ)])(?=\d)", "|", t)
    cortes, ultimo = [], 0
    for m in re.finditer(r"(?<=[a-záéíóúñ])\s+(?=\d+(?:[.,/]\d+)?\s+[a-záéíóúñA-Z])", t):
        previa = re.search(r"([a-záéíóúñ]+)$", t[:m.start()], re.I)
        if previa and previa.group(1).lower() in CONECTORES:
            continue
        cortes.append((ultimo, m.start()))
        ultimo = m.end()
    cortes.append((ultimo, len(t)))
    return ["".join(t[a:b]) for a, b in cortes]


SOLO_CANTIDAD = re.compile(
    rf"^(?:\d+(?:[.,/]\d+)?|[½¼¾⅓⅔⅛])(?:\s*(?:\d+/\d+|[½¼¾⅓⅔⅛]))?(?:\s*(?:{UNIDADES})\.?)?$", re.I)
NOTA_ENTRE_PARENTESIS = re.compile(r"^\([^)]*\)$")
PARA_VERBO = re.compile(r"^para\s+[a-záéíóúñ]+(?:ar|er|ir|ír|ér)(?:se)?(?:\s+[a-záéíóúñ]+){0,3}$", re.I)

# líneas que la fuente mete en la lista de ingredientes pero no son ingredientes
_RUIDO_SIEMPRE = re.compile(
    r"^(?:enviad[ao]\s+por\b|receta\s+de\b|por\s+cada\b|preparaci[oó]n\b|elaboraci[oó]n\b|ingredientes?\s*(?:para\b.*)?$)",
    re.I)
_RUIDO_SIN_NUMEROS = re.compile(r"^(?:para\s+(?:el|la|los|las)\b|nota\b|consejo\b|opcional\b)", re.I)
_UTENSILIOS = {"rallador", "cuchillo", "sartén", "sarten", "bol", "palillos", "fuente", "olla", "batidora", "licuadora",
               "horno", "molde", "tabla", "cuchara", "espátula", "colador", "papel de cocina", "procesador", "cacerola"}


def es_ruido(linea: str) -> bool:
    """Crédito del autor, encabezado de sección ('Para la masa:'), títulos y utensilios."""
    t = linea.strip(" .")
    if not re.search(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]", t):
        return True
    if re.match(r"(?i)^ingredientes?\b", t) and len(t.split()) <= 4:   # 'Ingredientes secos', 'INGREDIENTES.'
        return True
    if t.endswith(":") or _RUIDO_SIEMPRE.match(t):
        return True
    if _RUIDO_SIN_NUMEROS.match(t) and not re.search(r"\d", t):
        return True
    return t.lower().rstrip("s") in _UTENSILIOS or t.lower() in _UTENSILIOS
MODIFICADOR = re.compile(
    r"^(?:[a-záéíóúñ]+(?:ado|ada|ados|adas|ido|ida|idos|idas)|(?:en|sin|bien|muy|al|a)\s+[a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)$")


def dividir_ingredientes_pegados(texto) -> list[str]:
    """Heurística para train/valid/test: combina comas (fuera de paréntesis) con cortes por mayúscula/dígito.

    'camaronesMantecaSal2 cdas. de yogur50 gr. de queso' y '3 dientes de ajo, machacados 4 chalotes' se dividen
    bien. Un fragmento suelto tipo 'machacados' se pega al ingrediente anterior. Es aproximado: parseo_heuristico=True.
    """
    if not isinstance(texto, str) or not texto.strip():
        return []
    texto = re.sub(r"^\s*Ingredientes\s*:?\s*", "", texto.strip(), flags=re.I)
    if texto.startswith("["):
        return a_lista(texto)
    piezas: list[str] = []
    # la fuente Nestlé separa ingredientes con varios espacios seguidos ('... (40 g)      2 Huevos (100 g)')
    for tramo in re.split(r"\s{2,}|\n", texto):
        for bloque in (dividir_ingredientes(tramo) if "," in tramo else [tramo]):
            piezas.extend(x.strip(" .,;") for x in "|".join(_cortar_pegados(bloque)).split("|"))
    return fusionar_fragmentos(piezas)


def fusionar_fragmentos(piezas: list[str]) -> list[str]:
    """Pega modificadores sueltos ('picado', 'en cubos') y notas '(250 g)' al ingrediente anterior, y las
    cantidades sueltas ('4 cucharadas') al siguiente, para que cada fila sea un ingrediente completo."""
    resultado: list[str] = []
    pendiente = ""  # cantidad suelta ('4 cucharadas') que pertenece al siguiente ingrediente
    for x in piezas:
        if not x or es_ruido(x):
            continue
        if resultado and not pendiente and PARA_VERBO.match(x):
            resultado[-1] = f"{resultado[-1]}, {x}"   # 'aceite, para freír'
        elif SOLO_CANTIDAD.match(x):
            pendiente = f"{pendiente} {x}".strip()
        elif NOTA_ENTRE_PARENTESIS.match(x) and resultado:
            resultado[-1] = f"{resultado[-1]} {x}"
        elif resultado and not pendiente and MODIFICADOR.match(x.lower()):
            resultado[-1] = f"{resultado[-1]}, {x}"
        else:
            resultado.append(f"{pendiente} {x}".strip())
            pendiente = ""
    if pendiente:
        resultado.append(pendiente)
    return resultado


ABREVIATURAS = ("gr", "kg", "cdas", "cda", "cdta", "cdtas", "aprox", "ej", "etc", "min", "seg", "pág", "vs", "sr", "sra", "no")


def dividir_oraciones(texto: str) -> list[str]:
    """Una oración por paso. No corta tras abreviaturas ('gr.', 'cdas.') ni en decimales; junta oraciones de <5 palabras con la anterior."""
    partes = re.split(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])", texto)
    oraciones: list[str] = []
    for p in partes:
        p = p.strip()
        if not p:
            continue
        previa = oraciones[-1] if oraciones else ""
        termina_en_abrev = bool(re.search(rf"\b(?:{'|'.join(ABREVIATURAS)})\.$", previa, re.I))
        if oraciones and (termina_en_abrev or len(p.split()) < 5):
            oraciones[-1] = f"{previa} {p}"
        else:
            oraciones.append(p)
    return oraciones


def dividir_pasos(texto: str) -> list[str]:
    """Separa por 'Paso N.', saltos de línea o numeración '1 ... 2 ...'; si no hay nada de eso, por oraciones."""
    t = texto.strip()
    m = re.search(r"Preparaci[oó]n:\s*", t[:300])
    if m and not re.search(r"Paso\s*\d+\.", t):
        t = t[m.end():]
    if re.search(r"Paso\s*\d+\.", t):
        return [p.strip(" ,") for p in re.split(r"(?:,\s*)?Paso\s*\d+\.\s*", t) if p.strip(" ,")]
    lineas = [ln.strip() for ln in t.splitlines() if ln.strip()]
    if len(lineas) >= 2:
        return lineas
    posiciones, esperado = [], 1
    for mt in re.finditer(r"(?:^|(?<=[\s.!?:]))(\d{1,2})\s+(?=[A-ZÁÉÍÓÚÑ¿¡])", t):
        if int(mt.group(1)) == esperado:
            posiciones.append(mt)
            esperado += 1
    if len(posiciones) >= 2:
        cortes = [p.start() for p in posiciones] + [len(t)]
        return [t[cortes[k]:cortes[k + 1]].strip() for k in range(len(posiciones))
                if t[cortes[k]:cortes[k + 1]].strip()]
    return dividir_oraciones(t) or [t]


DOMINIO_PAIS = {
    "yanuq.com": "Perú", "mexicoenmicocina.com": "México", "recetasnestle.com.co": "Colombia",
    "mycolombianrecipes.com": "Colombia", "recetasnestle.com.mx": "México", "recetasnestle.cl": "Chile",
    "recetasnestle.com.pe": "Perú", "kiwilimon.com": "México", "pequerecetas.com": "España",
    "thermorecetas.com": "España", "directoalpaladar.com": "España", "elmueble.com": "España",
}


def pais_por_dominio(url) -> str | None:
    if not isinstance(url, str):
        return None
    m = re.match(r"https?://(?:www\.)?([^/]+)", url.lower())
    return DOMINIO_PAIS.get(m.group(1)) if m else None


NUM = r"\d+(?:[.,]\d+)?"
FRAC_UNI = "½¼¾⅓⅔⅛"


def _a_float(txt: str) -> float:
    return float(txt.replace(",", "."))


def extraer_cantidad(resto: str) -> tuple[float | None, float | None, str]:
    """Devuelve (cantidad, cantidad_max, resto). Entiende '2', '1/2', '1 1/2', '1 ½', '½', 'una', '1 o 2', '1 y ½'."""
    cantidad = None
    m = re.match(rf"^(\d+)\s+(\d+)\s*/\s*(\d+)", resto)
    if m:
        cantidad = int(m.group(1)) + int(m.group(2)) / int(m.group(3))
    if cantidad is None:
        m = re.match(r"^(\d+)\s*/\s*(\d+)", resto)
        if m:
            cantidad = int(m.group(1)) / int(m.group(2))
    if cantidad is None:
        m = re.match(rf"^({NUM})?\s*([{FRAC_UNI}])", resto)
        if m:
            cantidad = (_a_float(m.group(1)) if m.group(1) else 0.0) + FRACCIONES[m.group(2)]
    if cantidad is None:
        m = re.match(rf"^({NUM})", resto)
        if m:
            cantidad = _a_float(m.group(1))
    if cantidad is None:
        m = re.match(r"^(un|una|uno|media|medio)\b", resto, re.I)
        if m:
            cantidad = 0.5 if m.group(1).lower() in ("media", "medio") else 1.0
    if cantidad is None:
        return None, None, resto
    resto = resto[m.end():].strip()
    maximo = None
    r = re.match(rf"^(?:y|o|a|-|–)\s*({NUM}|[{FRAC_UNI}])(?!\s*/)\s*", resto)
    if r:
        valor = FRACCIONES[r.group(1)] if r.group(1) in FRACCIONES else _a_float(r.group(1))
        if r.group(1) in FRACCIONES and resto.lower().startswith("y"):
            cantidad += valor          # '1 y ½' = 1.5
        else:
            maximo = cantidad + valor if r.group(1) in FRACCIONES else valor   # '1 o 2' = rango
        resto = resto[r.end():].strip()
    return cantidad, maximo, resto


def parsear_ingrediente(linea: str) -> dict:
    """'2 dientes de ajo picados (opcional)' -> cantidad 2, unidad dientes, nombre 'ajo picados'."""
    resto = linea.strip().lstrip("*- ").strip()
    opcional = bool(re.search(r"\bopcional\b", resto, re.I))
    cantidad, cantidad_max, resto = extraer_cantidad(resto)
    unidad = None
    m = re.match(rf"^(?:de\s+)?({UNIDADES})\b\.?\s*", resto, re.I)
    if m:
        unidad = m.group(1).lower()
        resto = resto[m.end():]
    nombre = resto.strip()
    for _ in range(4):  # quita paréntesis y conectores iniciales: '(7 oz) de queso', 'y pimienta', 'con ajo'
        antes = nombre
        nombre = re.sub(r"^\([^)]*\)\s*", "", nombre)
        nombre = re.sub(r"^(?:de la|de los|de las|del|de|y|o|con|para)\s+", "", nombre, flags=re.I)
        if nombre == antes:
            break
    nombre = re.sub(r"\(.*?\)", "", nombre).strip(" .,;")
    return {"cantidad": cantidad, "cantidad_max": cantidad_max, "unidad": unidad,
            "nombre": nombre.lower(), "opcional": opcional}




CONDIMENTOS = {"sal", "pimienta", "sal y pimienta", "pimienta y sal", "sal fina", "sal gruesa", "pimienta negra",
               "pimienta blanca", "sal marina", "sal y pimienta negra", "pimienta molida", "sal de mesa"}


def normalizar_cantidad(cantidad, cantidad_max, unidad, texto: str, nombre: str = "") -> dict:
    """Lleva la cantidad a una unidad comparable y suma-ble.

    unidad_base: 'g', 'ml', una unidad de conteo ('unidad', 'diente', 'lata'...), 'pizca', 'al_gusto' o None.
    metodo_cantidad dice de dónde salió el número (para que se pueda confiar o revisar):
      directa                 gramos/kg/ml/litros: conversión exacta
      conversion_aproximada   cucharadas/tazas/vasos -> ml con medidas estándar (una taza de harina no pesa lo que una de agua)
      equivalencia            la fuente trae '(400 g)' junto a una lata/unidad: se usa ese peso
      conteo                  '2 limones', '3 dientes de ajo': no hay peso, se guarda el conteo
      al_gusto / sin_dato     no hay cantidad utilizable (no se inventa)
    """
    vacio = {"cantidad_base": None, "cantidad_base_max": None, "unidad_base": None, "tipo_cantidad": "sin_cantidad",
             "metodo_cantidad": "sin_dato"}
    texto = texto or ""
    tiene_cantidad = cantidad is not None and not pd.isna(cantidad)
    if tiene_cantidad and unidad in CONVERSION:
        base, factor, tipo = CONVERSION[unidad]
        return {"cantidad_base": round(cantidad * factor, 1),
                "cantidad_base_max": round(cantidad_max * factor, 1) if cantidad_max and not pd.isna(cantidad_max) else None,
                "unidad_base": base, "tipo_cantidad": "peso" if base == "g" else "volumen",
                "metodo_cantidad": "conversion_aproximada" if tipo == "volumen_aprox" else "directa"}
    equiv = EQUIVALENCIA.search(texto)
    if equiv and unidad not in CONVERSION:
        base, factor, _ = CONVERSION[equiv.group(2).lower()]
        return {"cantidad_base": round(float(equiv.group(1).replace(",", ".")) * factor, 1), "cantidad_base_max": None,
                "unidad_base": base, "tipo_cantidad": "peso" if base == "g" else "volumen", "metodo_cantidad": "equivalencia"}
    if not tiene_cantidad:
        if AL_GUSTO.search(texto):
            return {**vacio, "unidad_base": "al_gusto", "tipo_cantidad": "al_gusto", "metodo_cantidad": "al_gusto"}
        if nombre.strip() in CONDIMENTOS:   # supuesto: la fuente solo dice 'Sal', se entiende 'al gusto'
            return {**vacio, "unidad_base": "al_gusto", "tipo_cantidad": "al_gusto", "metodo_cantidad": "al_gusto_supuesto"}
        return vacio
    u = SINGULAR.get(unidad, unidad) if unidad else "unidad"
    return {"cantidad_base": round(float(cantidad), 2),
            "cantidad_base_max": round(float(cantidad_max), 2) if cantidad_max and not pd.isna(cantidad_max) else None,
            "unidad_base": u, "tipo_cantidad": "conteo", "metodo_cantidad": "conteo"}


def id_catalogo(nombre: str) -> str | None:
    palabras = set(re.findall(r"[a-záéíóúñ]+", nombre.lower()))
    for id_, claves in CATALOGO.items():
        if palabras & set(claves):
            return id_
    return None


_MOJIBAKE = re.compile(r"[ÂÃâ][\x80-\xbf€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ¡-¿]+")


def arreglar_mojibake(texto):
    """UTF-8 leído como Latin-1/cp1252 ('orÃ©gano' -> 'orégano'). Intenta todo el texto y, si está mezclado, por tramos."""
    if not isinstance(texto, str) or not _MOJIBAKE.search(texto):
        return texto
    for codec in ("cp1252", "latin-1"):
        try:
            return texto.encode(codec).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

    def tramo(m):
        for codec in ("cp1252", "latin-1"):
            try:
                return m.group().encode(codec).decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
        return m.group()

    return _MOJIBAKE.sub(tramo, texto)


def leer_fuente(ruta: Path, nombre: str) -> pd.DataFrame:
    df = _leer_fuente(ruta, nombre)
    for col in ("nombre", "ingredientes_raw", "pasos_raw"):
        df[col] = df[col].map(arreglar_mojibake)
    return df


def _leer_fuente(ruta: Path, nombre: str) -> pd.DataFrame:
    df = pd.read_csv(ruta)
    if nombre in ("train.csv", "valid.csv", "test.csv"):
        # esquema de 5 columnas: ingredientes pegados sin separador -> no se pueden dividir
        return pd.DataFrame({
            "nombre": df["title"], "url": df["url"], "ingredientes_raw": df["ingredients"],
            "pasos_raw": df["steps"], "ingredientes_separables": False, "fuente": nombre,
        })
    ing = df["Ingredientes"].copy()
    if "Porciones" in df.columns:
        # en el archivo de la abuela, varias filas tienen los ingredientes corridos a 'Porciones'
        corrido = ing.isna() & df["Porciones"].fillna("").str.startswith("[")
        ing = ing.where(~corrido, df["Porciones"])
    tipos = {"entrante", "plato principal", "postre", "acompañamiento", "bebida", "desayuno", "aperitivo"}
    tipo = df["Tiempo"].where(df["Tiempo"].fillna("").str.lower().isin(tipos))
    return pd.DataFrame({
        "nombre": df["Nombre"], "url": df["URL"], "ingredientes_raw": ing, "pasos_raw": df["Pasos"],
        "pais": df["Pais"].map(normalizar_pais),
        "duracion_min": df["Duracion"].map(a_minutos),
        "comensales": pd.to_numeric(df["Comensales"].fillna("").str.extract(r"(\d+)")[0], errors="coerce"),
        "dificultad": df["Dificultad"].fillna("").str.lower().map(
            lambda s: 1 if "baja" in s else 2 if "media" in s else 3 if "alta" in s else None),
        "tipo_plato": tipo.str.lower(),
        "categorias": df["Categoria"].map(a_lista),
        "valoracion": pd.to_numeric(
            df["Valoracion y Votos"].fillna("").str.extract(r"Valoración:\s*([\d,\.]+)")[0]
            .str.replace(",", "."), errors="coerce"),
        "ingredientes_separables": True, "fuente": nombre,
    })


def limpiar_titulo(titulo: str) -> str:
    t = re.sub(r"\s+", " ", str(titulo)).strip()
    if len(t) > 3 and t == t.upper():
        t = t.lower()
    return t[:1].upper() + t[1:]


# texto que los scrapers dejaron pegado al final de los pasos (no son pasos)
CORTE_PASOS = re.compile(r"^(maridaje|valor nutricional|informaci[oó]n nutricional|calor[ií]as|nutrici[oó]n)\b", re.I)
META_PASO = re.compile(r"^(?:\d+(?:[.,]\d+)?\s*)?(?:calor[ií]as?|kcal)\b.*$|^\d+\s*(?:personas|raciones|porciones|comensales)$", re.I)


def limpiar_pasos(pasos: list[str]) -> list[str]:
    limpios = []
    for p in pasos:
        if CORTE_PASOS.match(p):
            break
        if META_PASO.match(p.strip()):
            continue
        limpios.append(p)
    return limpios


# --- verificación de dietas: la etiqueta de la fuente NO es confiable (hay 'vegetarianas' con pollo) ---
CARNE = re.compile(
    r"\b(pollo|pechuga|carne|res|ternera|cerdo|chancho|jam[oó]n|tocino|bacon|panceta|pescado|at[uú]n|salm[oó]n|"
    r"bacalao|merluza|camar[oó]n|camarones|langostinos?|gambas?|chorizo|salchichas?|morcilla|lomo|pavo|cordero|"
    r"anchoas?|calamar(?:es)?|pulpo|mariscos?|almejas?|mejillones|choritos|gelatina|manteca de cerdo|"
    r"consom[eé]|caldo de (?:pollo|carne|pescado|res))\b", re.I)
ANIMAL_EXTRA = re.compile(
    r"\b(huevos?|yemas?|claras?|leche|queso|mantequilla|manteca|crema|nata|yogur(?:t)?|miel|reques[oó]n|ricota|mozzarella|parmesano)\b", re.I)
VEGETAL = re.compile(
    r"vegan|vegetal|soja|soya|seit[aá]n|tofu|de (?:arroz|almendras?|avena|coco|anacardos?|cacahuete|man[ií]|cacao)|sin lactosa", re.I)


def es_animal(nombre: str, incluir_lacteos_huevo: bool) -> bool:
    if VEGETAL.search(nombre):
        return False
    return bool(CARNE.search(nombre) or (incluir_lacteos_huevo and ANIMAL_EXTRA.search(nombre)))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--downloads", default=str(Path.home() / "Downloads"))
    ap.add_argument("--out", default="data/processed")
    args = ap.parse_args()
    base, out = Path(args.downloads), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    frames = []
    for nombre in FUENTES:
        ruta = base / nombre
        if not ruta.exists():
            print(f"  (omito {nombre}: no existe en {base})")
            continue
        df = leer_fuente(ruta, nombre)
        print(f"  {nombre}: {len(df):,} filas")
        frames.append(df)
    todo = pd.concat(frames, ignore_index=True)
    total_bruto = len(todo)

    todo = todo[todo["nombre"].notna() & todo["pasos_raw"].notna()].copy()
    todo["nombre"] = todo["nombre"].map(limpiar_titulo)
    todo = todo[todo["nombre"].str.len() >= 4].copy()
    todo["_clave"] = todo["url"].map(clave_url).fillna(todo["nombre"].map(clave_titulo))
    # first() toma el primer valor no nulo por columna: la fuente de mayor prioridad gana, las demás rellenan huecos
    recetas = todo.groupby("_clave", sort=False).first().reset_index(drop=True)
    recetas["_t"] = recetas["nombre"].map(clave_titulo)
    recetas["_i"] = recetas["ingredientes_raw"].fillna("").map(lambda s: clave_titulo(s)[:100])
    recetas = recetas.drop_duplicates(subset=["_t", "_i"]).drop(columns=["_t", "_i"]).reset_index(drop=True)
    recetas.insert(0, "receta_id", range(1, len(recetas) + 1))

    recetas["categorias"] = recetas["categorias"].map(lambda v: v if isinstance(v, list) else [])
    cat = recetas["categorias"].map(lambda v: " ".join(v).lower())
    recetas["etiqueta_vegetariana_fuente"] = cat.str.contains("vegetarian")
    recetas["etiqueta_vegana_fuente"] = cat.str.contains("vegan")
    lista_pasos = recetas["pasos_raw"].map(lambda t: limpiar_pasos(dividir_pasos(t)) or dividir_pasos(t))
    recetas["pasos"] = lista_pasos.map(lambda v: json.dumps(v, ensure_ascii=False))
    recetas["num_pasos"] = lista_pasos.map(len)

    # las URLs de portada no identifican la receta: se descartan para no atribuir mal
    recetas["url"] = recetas["url"].where(recetas["url"].map(clave_url).notna())
    # país: primero el dato de la fuente, si falta se infiere por dominio (queda marcado)
    inferido = recetas["url"].map(pais_por_dominio)
    recetas["pais_inferido"] = recetas["pais"].isna() & inferido.notna()
    recetas["pais"] = recetas["pais"].fillna(inferido)

    filas_ing = []
    for _, r in recetas.iterrows():
        heuristico = not r["ingredientes_separables"]
        lineas = dividir_ingredientes_pegados(r["ingredientes_raw"]) if heuristico \
            else fusionar_fragmentos(dividir_ingredientes(r["ingredientes_raw"]))
        for pos, linea in enumerate(lineas):
            p = parsear_ingrediente(linea)
            filas_ing.append({"receta_id": r["receta_id"], "posicion": pos, "texto": linea,
                              **p, **normalizar_cantidad(p["cantidad"], p["cantidad_max"], p["unidad"], linea, p["nombre"]),
                              "ingrediente_id": id_catalogo(p["nombre"]),
                              "parseo_heuristico": heuristico,
                              "parseo_dudoso": len(p["nombre"]) > 60 or not p["nombre"]})
    ingredientes = pd.DataFrame(filas_ing)

    # valores que la fuente trae mal (p. ej. '400 kilogramos de nueces', '170 Harina' sin unidad): se marcan, no se corrigen
    cb, ub = ingredientes["cantidad_base"], ingredientes["unidad_base"]
    ingredientes["cantidad_sospechosa"] = (
        ((ub == "g") & ((cb > 10_000) | (cb < 1)))
        | ((ub == "ml") & ((cb > 5_000) | (cb < 1)))
        | ((ub == "unidad") & (cb >= 50))
        | (cb == 0)
    )
    # cantidad por porción: solo si la receta declara comensales y la cantidad es creíble; si no, queda vacía
    comensales = ingredientes["receta_id"].map(recetas.set_index("receta_id")["comensales"])
    escalable = (ub.isin(["g", "ml"]) | (ingredientes["tipo_cantidad"] == "conteo")) & ~ingredientes["cantidad_sospechosa"]
    ingredientes["cantidad_por_racion"] = (cb / comensales).where(escalable & (comensales > 0)).round(2)

    n_ing = ingredientes.groupby("receta_id").size()
    recetas["num_ingredientes"] = recetas["receta_id"].map(n_ing).fillna(0).astype(int)
    recetas["ingredientes_incompletos"] = recetas["num_ingredientes"] < 2
    ingredientes["es_animal"] = ingredientes["nombre"].map(lambda n: es_animal(n, False))
    ingredientes["es_animal_o_derivado"] = ingredientes["nombre"].map(lambda n: es_animal(n, True))
    con_carne = set(ingredientes.loc[ingredientes["es_animal"], "receta_id"])
    con_derivado = set(ingredientes.loc[ingredientes["es_animal_o_derivado"], "receta_id"])
    # solo se marca 'apta' si la fuente lo dice Y los ingredientes lo confirman; sin ingredientes fiables, no se marca
    fiable = ~recetas["ingredientes_incompletos"]
    recetas["apta_vegetariana"] = recetas["etiqueta_vegetariana_fuente"] & fiable & ~recetas["receta_id"].isin(con_carne)
    recetas["apta_vegana"] = recetas["etiqueta_vegana_fuente"] & fiable & ~recetas["receta_id"].isin(con_derivado)
    recetas["dieta_en_conflicto"] = (recetas["etiqueta_vegetariana_fuente"] & ~recetas["apta_vegetariana"]) |                                     (recetas["etiqueta_vegana_fuente"] & ~recetas["apta_vegana"])

    # señales para revisión manual
    recetas["duracion_sospechosa"] = recetas["duracion_min"] > 600
    recetas["comensales_sospechoso"] = recetas["comensales"] > 30
    k = recetas["nombre"].map(clave_titulo)
    ing_por_receta = ingredientes.groupby("receta_id")["nombre"].apply(set)
    recetas["posible_duplicado_de"] = pd.NA
    for _, grupo in recetas.groupby(k):
        if len(grupo) < 2:
            continue
        ids = grupo["receta_id"].tolist()
        for a in range(len(ids)):
            for b in range(a + 1, len(ids)):
                A, B = ing_por_receta.get(ids[a], set()), ing_por_receta.get(ids[b], set())
                if A and B and len(A & B) / len(A | B) >= 0.6:
                    recetas.loc[recetas["receta_id"] == ids[b], "posible_duplicado_de"] = ids[a]

    recetas_out = recetas.drop(columns=["pasos_raw"]).assign(categorias=recetas["categorias"].map(json.dumps))
    recetas_out.to_csv(out / "recipes.csv", index=False, encoding="utf-8")
    ingredientes.to_csv(out / "ingredients.csv", index=False, encoding="utf-8")

    print(f"\n{total_bruto:,} filas de entrada -> {len(recetas):,} recetas únicas ({total_bruto - len(recetas):,} duplicadas/descartadas)")
    print(f"{len(ingredientes):,} ingredientes en {ingredientes['receta_id'].nunique():,} recetas "
          f"({int(ingredientes['parseo_heuristico'].sum()):,} por heurística, {int(ingredientes['parseo_dudoso'].sum()):,} dudosos)")
    print(f"Recetas con pasos separados: {(recetas['num_pasos'] > 1).mean():.1%} | país conocido: {recetas['pais'].notna().mean():.1%} "
          f"({int(recetas['pais_inferido'].sum()):,} inferidos por dominio)")
    print("Por país:", recetas["pais"].value_counts().head(8).to_dict())
    print(f"Perú: {(recetas['pais'] == 'Perú').sum():,} | vegetarianas verificadas: {int(recetas['apta_vegetariana'].sum()):,} (fuente decía {int(recetas['etiqueta_vegetariana_fuente'].sum()):,}) | veganas verificadas: {int(recetas['apta_vegana'].sum()):,} (fuente decía {int(recetas['etiqueta_vegana_fuente'].sum()):,})")
    print(f"Incompletas (<2 ingredientes): {int(recetas['ingredientes_incompletos'].sum()):,} | dieta en conflicto: {int(recetas['dieta_en_conflicto'].sum()):,} | posibles duplicados: {int(recetas['posible_duplicado_de'].notna().sum()):,}")
    print(f"Ingredientes que calzan con tu catálogo: {ingredientes['ingrediente_id'].notna().mean():.1%}")
    m = ingredientes["metodo_cantidad"].value_counts(normalize=True)
    print("Cantidades por método:", {k: f"{v:.1%}" for k, v in m.items()})
    print(f"Cantidades sospechosas (para revisar): {int(ingredientes['cantidad_sospechosa'].sum()):,}")
    print(f"Con cantidad utilizable (g/ml/conteo): {(ingredientes['cantidad_base'].notna()).mean():.1%} | "
          f"con cantidad por porción: {ingredientes['cantidad_por_racion'].notna().mean():.1%}")
    print(f"Salida en: {out.resolve()}")


if __name__ == "__main__":
    main()
