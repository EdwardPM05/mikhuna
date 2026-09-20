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
    r"kilogramos?|kilos?|kg|gramos?|gr|g|litros?|lt|l|mililitros?|ml|cl|"
    r"cucharadas?|cucharaditas?|cdas?|cdtas?|tazas?|vasos?|puñados?|pizcas?|chorros?|"
    r"dientes?|hojas?|ramas?|ramitas?|manojos?|latas?|paquetes?|sobres?|unidades?|"
    r"rodajas?|lonchas?|filetes?|trozos?|onzas?|oz|libras?|lb"
)
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


def dividir_ingredientes_pegados(texto) -> list[str]:
    """Heurística para train/valid/test, donde vienen pegados: 'camaronesMantecaSal2 cdas. de yogur50 gr. de queso'.

    Corta en minúscula→Mayúscula sin espacio, en letra→dígito sin espacio, y antes de un número
    precedido de una palabra (excepto 'de', 'con', etc., para no romper '1 lata de 400 gr').
    Es aproximado: las filas resultantes se marcan con parseo_heuristico=True.
    """
    if not isinstance(texto, str) or not texto.strip():
        return []
    t = re.sub(r"(?<=[a-záéíóúñ\)\.])(?=[A-ZÁÉÍÓÚÑ])", "|", texto)
    t = re.sub(r"(?<=[a-záéíóúñ\)])(?=\d)", "|", t)
    t = re.sub(r"(?<=[a-záéíóúñ])\s+(?=\d+(?:[.,/]\d+)?\s+[a-záéíóúñA-Z])", "|", t)
    partes = []
    for p in t.split("|"):
        p = p.strip(" .,;")
        if p:
            partes.append(p)
    return partes


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


def parsear_ingrediente(linea: str) -> dict:
    """'2 dientes de ajo picados (opcional)' -> cantidad 2, unidad dientes, nombre 'ajo picados'."""
    resto = linea.strip().lstrip("*- ").strip()
    opcional = bool(re.search(r"\bopcional\b", resto, re.I))
    cantidad = None
    m = re.match(r"^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔⅛])?", resto)
    if m and (m.group(1) or m.group(2)):
        cantidad = float(m.group(1).replace(",", ".")) if m.group(1) else 0.0
        if m.group(2):
            cantidad += FRACCIONES[m.group(2)]
        resto = resto[m.end():].strip()
    else:
        m = re.match(r"^(\d+)\s*/\s*(\d+)", resto)
        if m:
            cantidad = int(m.group(1)) / int(m.group(2))
            resto = resto[m.end():].strip()
    unidad = None
    m = re.match(rf"^({UNIDADES})\b\.?\s*", resto, re.I)
    if m:
        unidad = m.group(1).lower()
        resto = resto[m.end():]
    nombre = re.sub(r"^(de|del|de la|de los)\s+", "", resto.strip(), flags=re.I)
    nombre = re.sub(r"\(.*?\)", "", nombre).strip(" .,;")
    return {"cantidad": cantidad, "unidad": unidad, "nombre": nombre.lower(), "opcional": opcional}


def id_catalogo(nombre: str) -> str | None:
    palabras = set(re.findall(r"[a-záéíóúñ]+", nombre.lower()))
    for id_, claves in CATALOGO.items():
        if palabras & set(claves):
            return id_
    return None


def leer_fuente(ruta: Path, nombre: str) -> pd.DataFrame:
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
    todo["_clave"] = todo["url"].map(clave_url).fillna(todo["nombre"].map(clave_titulo))
    # first() toma el primer valor no nulo por columna: la fuente de mayor prioridad gana, las demás rellenan huecos
    recetas = todo.groupby("_clave", sort=False).first().reset_index(drop=True)
    recetas["_t"] = recetas["nombre"].map(clave_titulo)
    recetas["_i"] = recetas["ingredientes_raw"].fillna("").map(lambda s: clave_titulo(s)[:100])
    recetas = recetas.drop_duplicates(subset=["_t", "_i"]).drop(columns=["_t", "_i"]).reset_index(drop=True)
    recetas.insert(0, "receta_id", range(1, len(recetas) + 1))

    recetas["categorias"] = recetas["categorias"].map(lambda v: v if isinstance(v, list) else [])
    cat = recetas["categorias"].map(lambda v: " ".join(v).lower())
    recetas["apta_vegetariana"] = cat.str.contains("vegetarian")
    recetas["apta_vegana"] = cat.str.contains("vegan")
    lista_pasos = recetas["pasos_raw"].map(dividir_pasos)
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
            else dividir_ingredientes(r["ingredientes_raw"])
        for pos, linea in enumerate(lineas):
            p = parsear_ingrediente(linea)
            filas_ing.append({"receta_id": r["receta_id"], "posicion": pos, "texto": linea,
                              **p, "ingrediente_id": id_catalogo(p["nombre"]),
                              "parseo_heuristico": heuristico,
                              "parseo_dudoso": len(p["nombre"]) > 60 or not p["nombre"]})
    ingredientes = pd.DataFrame(filas_ing)

    recetas_out = recetas.drop(columns=["pasos_raw"]).assign(categorias=recetas["categorias"].map(json.dumps))
    recetas_out.to_csv(out / "recipes.csv", index=False, encoding="utf-8")
    ingredientes.to_csv(out / "ingredients.csv", index=False, encoding="utf-8")

    print(f"\n{total_bruto:,} filas de entrada -> {len(recetas):,} recetas únicas ({total_bruto - len(recetas):,} duplicadas/descartadas)")
    print(f"{len(ingredientes):,} ingredientes en {ingredientes['receta_id'].nunique():,} recetas "
          f"({int(ingredientes['parseo_heuristico'].sum()):,} por heurística, {int(ingredientes['parseo_dudoso'].sum()):,} dudosos)")
    print(f"Recetas con pasos separados: {(recetas['num_pasos'] > 1).mean():.1%} | país conocido: {recetas['pais'].notna().mean():.1%} "
          f"({int(recetas['pais_inferido'].sum()):,} inferidos por dominio)")
    print("Por país:", recetas["pais"].value_counts().head(8).to_dict())
    print(f"Perú: {(recetas['pais'] == 'Perú').sum():,} | vegetarianas: {int(recetas['apta_vegetariana'].sum()):,} | veganas: {int(recetas['apta_vegana'].sum()):,}")
    print(f"Ingredientes que calzan con tu catálogo: {ingredientes['ingrediente_id'].notna().mean():.1%}")
    print(f"Salida en: {out.resolve()}")


if __name__ == "__main__":
    main()
