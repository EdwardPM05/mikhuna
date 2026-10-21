"""Sube a Supabase (tabla public.recetas) lo que generó exportar_recetas.py.

Usa la service role porque la tabla no acepta escrituras desde la app. Es idempotente: si una receta ya
existe se reemplaza, así que se puede correr de nuevo después de cambiar las reglas de exportar_recetas.py.

Uso (PowerShell):
  $env:SUPABASE_URL = "https://<proyecto>.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY = "..."      # Dashboard > Project Settings > API Keys: la "secret" (sb_secret_...)
                                              # o la "service_role" (eyJ...). Nunca va al repo ni al APK.
  python scripts/dataset/subir_recetas.py [--archivo data/recetas_app.jsonl]
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

LOTE = 500


def fila(receta: dict) -> dict:
    return {
        "id": receta["id"],
        "nombre": receta["nombre"],
        "cocina": receta["cocina"],
        "region": receta["region"],
        "dieta": receta["dieta"],
        "con_gluten": receta["conGluten"],
        "con_lactosa": receta["conLactosa"],
        "requiere": receta["requiere"],
        "dificultad": receta["dificultad"],
        "tiempo_min": receta["tiempoMin"],
        "precio": receta["precio"],
        "etiquetas": receta["etiquetas"],
        "claves": receta.get("claves", []),
        "datos": receta,
    }


def subir(url: str, clave: str, filas: list[dict]) -> None:
    req = urllib.request.Request(
        f"{url}/rest/v1/recetas",
        data=json.dumps(filas, ensure_ascii=False).encode(),
        method="POST",
        headers={
            "apikey": clave,
            # Las claves nuevas (sb_secret_...) van solo en apikey; las viejas (JWT) también como Bearer.
            **({"Authorization": f"Bearer {clave}"} if clave.startswith("eyJ") else {}),
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=120):
        pass


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--archivo", default="data/recetas_app.jsonl")
    args = ap.parse_args()
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    clave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not clave:
        sys.exit("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.")

    with open(args.archivo, encoding="utf-8") as f:
        filas = [fila(json.loads(linea)) for linea in f if linea.strip()]

    for i in range(0, len(filas), LOTE):
        try:
            subir(url, clave, filas[i : i + LOTE])
        except urllib.error.HTTPError as e:
            sys.exit(f"Falló el lote que empieza en {i}: {e.code} {e.read().decode(errors='replace')[:500]}")
        print(f"{min(i + LOTE, len(filas))}/{len(filas)}", end="\r", flush=True)
    print(f"\nListo: {len(filas)} recetas en public.recetas")


if __name__ == "__main__":
    main()
