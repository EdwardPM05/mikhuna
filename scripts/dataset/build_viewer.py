"""Genera un visor HTML local para revisar las recetas procesadas, una por una.

Lee data/processed/recipes.csv e ingredients.csv (los produce build_recipes.py) y escribe
data/processed/visor/index.html + datos/ (índice liviano y fragmentos de 500 recetas que se cargan
al abrir cada una). Funciona con doble clic sobre index.html, sin servidor ni internet.

Uso:  python scripts/dataset/build_viewer.py [--data data/processed]
"""
import argparse
import json
import shutil
from pathlib import Path

import pandas as pd

TAM_SHARD = 500
FLAG = {"veg": 1, "vegan": 2, "conflicto": 4, "incompleta": 8, "duracion": 16,
        "comensales": 32, "duplicado": 64, "pais_inf": 128, "dudosos": 256, "cant_sosp": 512}


def num(v):
    return None if pd.isna(v) else (int(v) if float(v).is_integer() else round(float(v), 2))


def texto(v):
    return None if pd.isna(v) else str(v)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/processed")
    args = ap.parse_args()
    data = Path(args.data)
    out = data / "visor"
    (out / "datos").mkdir(parents=True, exist_ok=True)

    r = pd.read_csv(data / "recipes.csv").sort_values("receta_id").reset_index(drop=True)
    ing = pd.read_csv(data / "ingredients.csv")
    dudoso_por_receta = set(ing.loc[ing["parseo_dudoso"], "receta_id"])
    sospechosa_por_receta = set(ing.loc[ing["cantidad_sospechosa"], "receta_id"])
    por_receta = {rid: g.sort_values("posicion") for rid, g in ing.groupby("receta_id")}
    fuentes = sorted(r["fuente"].unique().tolist())

    indice, detalles = [], []
    for _, x in r.iterrows():
        g = por_receta.get(x["receta_id"])
        filas_ing = []
        if g is not None:
            for _, i in g.iterrows():
                filas_ing.append({
                    "t": i["texto"], "c": num(i["cantidad"]), "cm": num(i["cantidad_max"]), "u": texto(i["unidad"]),
                    "n": texto(i["nombre"]) or "", "o": bool(i["opcional"]), "h": bool(i["parseo_heuristico"]),
                    "d": bool(i["parseo_dudoso"]), "a": bool(i["es_animal_o_derivado"]), "k": texto(i["ingrediente_id"]),
                    "cb": num(i["cantidad_base"]), "ub": texto(i["unidad_base"]), "mc": texto(i["metodo_cantidad"]),
                    "cp": num(i["cantidad_por_racion"]), "cs": bool(i["cantidad_sospechosa"]),
                })
        flags = 0
        for clave, col in (("veg", "apta_vegetariana"), ("vegan", "apta_vegana"), ("conflicto", "dieta_en_conflicto"),
                           ("incompleta", "ingredientes_incompletos"), ("duracion", "duracion_sospechosa"),
                           ("comensales", "comensales_sospechoso"), ("pais_inf", "pais_inferido")):
            if bool(x[col]):
                flags |= FLAG[clave]
        if pd.notna(x["posible_duplicado_de"]):
            flags |= FLAG["duplicado"]
        if x["receta_id"] in dudoso_por_receta:
            flags |= FLAG["dudosos"]
        if x["receta_id"] in sospechosa_por_receta:
            flags |= FLAG["cant_sosp"]
        cats = json.loads(x["categorias"]) if isinstance(x["categorias"], str) else []
        indice.append([int(x["receta_id"]), x["nombre"], texto(x["pais"]) or "", flags, len(filas_ing),
                       int(x["num_pasos"]), fuentes.index(x["fuente"]),
                       "|".join(i["n"] for i in filas_ing if i["n"])])
        detalles.append({
            "id": int(x["receta_id"]), "nombre": x["nombre"], "url": texto(x["url"]), "pais": texto(x["pais"]),
            "pi": bool(x["pais_inferido"]), "dur": num(x["duracion_min"]), "com": num(x["comensales"]),
            "dif": num(x["dificultad"]), "tipo": texto(x["tipo_plato"]), "val": num(x["valoracion"]),
            "cats": cats, "dup": num(x["posible_duplicado_de"]), "pasos": json.loads(x["pasos"]), "ing": filas_ing,
        })

    for f in (out / "datos").glob("*.js"):
        f.unlink()
    (out / "datos" / "indice.js").write_text(
        "window.INDICE = " + json.dumps({"fuentes": fuentes, "tam_shard": TAM_SHARD, "filas": indice},
                                        ensure_ascii=False, separators=(",", ":")) + ";", encoding="utf-8")
    for n in range(0, len(detalles), TAM_SHARD):
        trozo = detalles[n:n + TAM_SHARD]
        (out / "datos" / f"s{n // TAM_SHARD:03d}.js").write_text(
            f"window.__shard({n // TAM_SHARD}," + json.dumps(trozo, ensure_ascii=False, separators=(",", ":")) + ");",
            encoding="utf-8")
    shutil.copy(Path(__file__).parent / "visor_template.html", out / "index.html")

    peso = sum(p.stat().st_size for p in out.rglob("*") if p.is_file()) / 1_048_576
    print(f"{len(indice):,} recetas -> {out / 'index.html'} ({peso:.1f} MB en {len(detalles) // TAM_SHARD + 1} fragmentos)")


if __name__ == "__main__":
    main()
