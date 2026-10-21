"""Junta el README y toda la carpeta docs/ en un solo PDF con la marca de Mikhuna.

    pip install markdown
    python scripts/docs/generar-pdf.py            # -> docs/Mikhuna-Documentacion.pdf

Arma un HTML (portada, índice y un capítulo por documento) y lo imprime a PDF con
Chrome o Edge sin abrir ventana. Los enlaces entre documentos pasan a ser enlaces
dentro del PDF.
"""
from __future__ import annotations

import datetime
import html
import re
import shutil
import subprocess
import sys
from pathlib import Path

import markdown

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "docs" / "Mikhuna-Documentacion.pdf"

# Orden de lectura: primero qué es y por qué, después cómo funciona, al final el día a día.
CAPITULOS = [
    ("README.md", "Presentación"),
    ("docs/ENFOQUE.md", "Enfoque y diseño de la IA"),
    ("docs/FLUJOS.md", "Flujos de usuario"),
    ("docs/IA.md", "Plan semanal con IA y reglas"),
    ("docs/ARQUITECTURA.md", "Arquitectura"),
    ("docs/BRANDING.md", "Marca"),
    ("docs/DATASET.md", "Dataset de recetas"),
    ("docs/LOCALHOST.md", "Correr en localhost"),
    ("docs/COMPILACION_APK_ANDROID.md", "Compilar el APK"),
    ("docs/CHANGELOG.md", "Registro de cambios"),
]

NAVEGADORES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "google-chrome",
    "chromium",
]

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito+Sans:wght@400;600;700;800&display=swap');
:root { --chili:#E5131B; --mango:#F7941D; --peach:#FFC993; --cream:#FDF3E7; --maroon:#7A1220; --ink:#241F21; }
@page { size: A4; margin: 18mm 16mm 20mm; @bottom-center { content: "Mikhuna · " counter(page); font: 9pt 'Nunito Sans', sans-serif; color: #8a8285; } }
@page :first { margin: 0; @bottom-center { content: none; } }
* { box-sizing: border-box; }
body { font-family: 'Nunito Sans', 'Segoe UI', sans-serif; color: var(--ink); font-size: 10.5pt; line-height: 1.55; margin: 0; }
h1, h2, h3, h4 { font-family: 'Baloo 2', 'Segoe UI', sans-serif; line-height: 1.2; break-after: avoid; }
h1 { color: var(--chili); font-size: 24pt; margin: 0 0 6mm; }
h2 { color: var(--maroon); font-size: 15pt; margin: 7mm 0 2mm; padding-bottom: 1mm; border-bottom: 2px solid var(--peach); }
h3 { color: var(--ink); font-size: 12pt; margin: 5mm 0 1.5mm; }
h4 { font-size: 11pt; margin: 4mm 0 1mm; }
a { color: var(--chili); text-decoration: none; }
p, li { orphans: 3; widows: 3; }
blockquote { margin: 3mm 0; padding: 2mm 4mm; background: var(--cream); border-left: 4px solid var(--mango); border-radius: 2mm; }
code { font-family: 'Cascadia Mono', Consolas, monospace; font-size: 8.8pt; background: #f4ece2; padding: 0.3mm 1.2mm; border-radius: 1mm; }
pre { background: var(--ink); color: var(--cream); padding: 3mm 4mm; border-radius: 2.5mm; white-space: pre; overflow: hidden; break-inside: avoid; font-size: 7.4pt; line-height: 1.4; }
pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
table { border-collapse: collapse; width: 100%; margin: 3mm 0; font-size: 9.2pt; break-inside: auto; }
th { background: var(--maroon); color: var(--cream); text-align: left; padding: 1.6mm 2mm; }
td { border-bottom: 1px solid #eadfd3; padding: 1.6mm 2mm; vertical-align: top; }
tr { break-inside: avoid; }
tr:nth-child(even) td { background: #fdf8f2; }
img { max-width: 100%; }
hr { border: none; border-top: 1px dashed var(--peach); margin: 6mm 0; }
.capitulo { break-before: page; }
.etiqueta { font-family: 'Baloo 2', sans-serif; color: var(--mango); font-size: 10pt; letter-spacing: 0.5mm; text-transform: uppercase; margin-bottom: 1mm; }
/* Portada */
.portada { height: 297mm; background: var(--cream); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20mm; }
.portada .logo { width: 110mm; }
.portada .titulo { font-family: 'Baloo 2', sans-serif; font-size: 30pt; color: var(--maroon); margin: 8mm 0 2mm; }
.portada .bajada { font-size: 13pt; color: #5b5154; max-width: 140mm; }
.portada .mascotas { margin: 12mm 0; display: flex; gap: 8mm; align-items: flex-end; }
.portada .mascotas img { height: 34mm; }
.portada .equipo { font-size: 10.5pt; color: var(--ink); line-height: 1.8; }
.portada .fecha { margin-top: 10mm; font-size: 9.5pt; color: #8a8285; }
/* Índice */
.indice { break-before: page; }
.indice ol { font-size: 12pt; line-height: 2.1; padding-left: 6mm; }
.indice li::marker { color: var(--chili); font-family: 'Baloo 2', sans-serif; font-weight: 700; }
.indice .archivo { color: #8a8285; font-size: 9pt; margin-left: 2mm; }
"""


def ancla(ruta: str) -> str:
    return "doc-" + re.sub(r"[^a-z0-9]+", "-", Path(ruta).stem.lower()).strip("-")


def ajustar_html(cuerpo: str, ruta_md: str) -> str:
    """Imágenes con ruta absoluta y enlaces entre documentos convertidos en enlaces internos."""
    carpeta = (RAIZ / ruta_md).parent

    def imagen(m: re.Match) -> str:
        src = m.group(2)
        if re.match(r"^(https?:|data:|file:)", src):
            return m.group(0)
        return f'{m.group(1)}{(carpeta / src).resolve().as_uri()}{m.group(3)}'

    cuerpo = re.sub(r'(<img[^>]*?src=")([^"]+)(")', imagen, cuerpo)

    def enlace(m: re.Match) -> str:
        href = m.group(2)
        if re.match(r"^(https?:|mailto:|#)", href):
            return m.group(0)
        destino = (carpeta / href.split("#")[0]).resolve()
        for ruta, _ in CAPITULOS:
            if (RAIZ / ruta).resolve() == destino:
                return f'{m.group(1)}#{ancla(ruta)}{m.group(3)}'
        # Archivo del repo que no es un capítulo (código, scripts): se deja como texto.
        return f'{m.group(1)}#{m.group(3)}'

    return re.sub(r'(<a[^>]*?href=")([^"]+)(")', enlace, cuerpo)


def capitulo(ruta: str, titulo: str, numero: int) -> str:
    texto = (RAIZ / ruta).read_text(encoding="utf-8")
    # El README tiene markdown dentro de <div align="center">; sin markdown="1"
    # quedaría como texto literal.
    texto = re.sub(r"<div([^>]*)>", r'<div\1 markdown="1">', texto)
    cuerpo = markdown.markdown(
        texto, extensions=["tables", "fenced_code", "sane_lists", "md_in_html"], output_format="html"
    )
    return (
        f'<section class="capitulo" id="{ancla(ruta)}">'
        f'<div class="etiqueta">Capítulo {numero} · {html.escape(ruta)}</div>'
        f"{ajustar_html(cuerpo, ruta)}</section>"
    )


def portada() -> str:
    assets = RAIZ / "src" / "assets"
    mascotas = "".join(
        f'<img src="{(assets / "mascots" / m).as_uri()}" alt="" />'
        for m in ["papi_papa_saludo.png", "choclito.png", "cuy_delivery.png"]
    )
    hoy = datetime.date.today()
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    return f"""
<section class="portada">
  <img class="logo" src="{(assets / 'images' / 'logo_wordmark.png').as_uri()}" alt="Mikhuna" />
  <div class="titulo">Documentación del proyecto</div>
  <div class="bajada">Planificación de comidas según quién eres, con IA que elige entre recetas reales,
  dónde comprar cada ingrediente y delivery.</div>
  <div class="mascotas">{mascotas}</div>
  <div class="equipo"><b>Equipo</b><br />Hubert Hilario Gomez · Abner Gonzales Alcarraz<br />
  Jesus Pezo Ramirez · Edward Pittman Medina</div>
  <div class="fecha">Generado el {hoy.day} de {meses[hoy.month - 1]} de {hoy.year} desde el repositorio</div>
</section>"""


def indice() -> str:
    items = "".join(
        f'<li><a href="#{ancla(ruta)}">{html.escape(titulo)}</a><span class="archivo">{html.escape(ruta)}</span></li>'
        for ruta, titulo in CAPITULOS
    )
    return f'<section class="indice"><h1>Contenido</h1><ol>{items}</ol></section>'


def navegador() -> str:
    for candidato in NAVEGADORES:
        if Path(candidato).exists() or shutil.which(candidato):
            return candidato
    sys.exit("No encontré Chrome ni Edge para imprimir el PDF.")


def main() -> None:
    cuerpo = portada() + indice() + "".join(capitulo(r, t, i) for i, (r, t) in enumerate(CAPITULOS, 1))
    documento = f'<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>Mikhuna · Documentación</title><style>{CSS}</style></head><body>{cuerpo}</body></html>'
    html_tmp = SALIDA.with_suffix(".html")
    html_tmp.write_text(documento, encoding="utf-8")
    try:
        subprocess.run(
            [
                navegador(), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                "--run-all-compositor-stages-before-draw", "--virtual-time-budget=15000",
                f"--print-to-pdf={SALIDA}", html_tmp.as_uri(),
            ],
            check=True, capture_output=True, timeout=180,
        )
    finally:
        html_tmp.unlink(missing_ok=True)
    print(f"Listo: {SALIDA}")


if __name__ == "__main__":
    main()
