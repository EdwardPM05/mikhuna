// Pruebas de las reglas del plan semanal (supabase/functions/_shared/plan.ts).
//   npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { RECETAS } from "../../supabase/functions/_shared/recetas.ts";
import {
  ANTOJOS_IDS,
  DIAS,
  ELECTRODOMESTICOS_IDS,
  armarPlanLocal,
  candidatas,
  esReceta,
  respetaRestricciones,
  sePuedePreparar,
  type PreferenciasPlan,
} from "../../supabase/functions/_shared/plan.ts";

const BASE: PreferenciasPlan = {
  dias: DIAS,
  antojos: [],
  restricciones: [],
  electrodomesticos: ["cocina", "microondas", "licuadora", "arrocera"],
  presupuesto: 150,
  personas: 2,
  perfil: null,
  region: null,
  objetivo: null,
  nivelCocina: null,
};

const recetaDe = (id: string) => RECETAS.find((r) => r.id === id)!;

test("los datos de las recetas son coherentes", () => {
  const ids = new Set<string>();
  for (const r of RECETAS) {
    assert.ok(!ids.has(r.id), `id repetido: ${r.id}`);
    ids.add(r.id);
    assert.ok(r.etiquetas.includes(r.antojoId), `${r.id}: el antojo principal no está en sus etiquetas`);
    for (const e of r.etiquetas) assert.ok(ANTOJOS_IDS.includes(e), `${r.id}: etiqueta desconocida ${e}`);
    for (const e of r.requiere) assert.ok(ELECTRODOMESTICOS_IDS.includes(e), `${r.id}: electrodoméstico desconocido ${e}`);
    assert.ok(r.pasos.length > 0 && r.ingredientes.length > 0, `${r.id}: sin pasos o ingredientes`);
  }
});

test("ningún plan trae una receta que choque con las restricciones o la cocina", () => {
  const restricciones = ["vegetariano", "vegano", "sin-gluten", "sin-lactosa", "pescetariano"];
  const cocinas = [["cocina"], ["cocina", "licuadora"], ["horno"], ELECTRODOMESTICOS_IDS];
  // Todas las combinaciones de restricciones (2^5) con cada tipo de cocina y perfil.
  for (let mascara = 0; mascara < 1 << restricciones.length; mascara++) {
    const elegidas = restricciones.filter((_, i) => mascara & (1 << i));
    for (const electrodomesticos of cocinas) {
      for (const perfil of ["estudiante", "foraneo", "objetivo", "comer-rico", null] as const) {
        const p = { ...BASE, restricciones: elegidas, electrodomesticos, perfil, region: "sierra" as const };
        for (const { recetaId } of armarPlanLocal(p)) {
          const r = recetaDe(recetaId);
          assert.ok(respetaRestricciones(r, elegidas), `${recetaId} no respeta ${elegidas.join(", ")}`);
          assert.ok(sePuedePreparar(r, electrodomesticos), `${recetaId} pide algo que no está en ${electrodomesticos}`);
        }
      }
    }
  }
});

test("un vegano que quiere criolla ya no recibe lomo saltado", () => {
  const plan = armarPlanLocal({ ...BASE, antojos: ["criolla"], restricciones: ["vegano"] });
  assert.equal(plan.length, 7);
  for (const { recetaId } of plan) assert.equal(recetaDe(recetaId).dieta, "vegana");
  assert.ok(plan.some((d) => d.recetaId === "tacu-tacu"), "debería salir el tacu tacu, que es vegano y criollo");
});

test("un plan cubre todos los días elegidos, en orden", () => {
  const plan = armarPlanLocal({ ...BASE, dias: ["Viernes", "Lunes", "Miércoles"] });
  assert.deepEqual(
    plan.map((d) => d.dia),
    ["Lunes", "Miércoles", "Viernes"]
  );
});

test("la semana varía: no repite receta mientras haya otras", () => {
  const plan = armarPlanLocal(BASE);
  assert.equal(new Set(plan.map((d) => d.recetaId)).size, plan.length);
});

test("si nada cumple, el plan queda vacío en vez de saltarse la restricción", () => {
  // Vegano, sin gluten y solo microondas: ninguna receta se puede hacer así.
  const plan = armarPlanLocal({ ...BASE, restricciones: ["vegano", "sin-gluten"], electrodomesticos: ["microondas"] });
  assert.deepEqual(plan, []);
});

test("el foráneo de la sierra recibe primero comida de la sierra", () => {
  const p = { ...BASE, perfil: "foraneo" as const, region: "sierra" as const };
  assert.equal(recetaDe(candidatas(p, 1)[0].id).region, "sierra");
  assert.match(armarPlanLocal(p)[0].razon, /sierra/);
});

test("a quien recién empieza no le toca lo más difícil si hay opciones fáciles", () => {
  const plan = armarPlanLocal({ ...BASE, perfil: "estudiante", nivelCocina: "principiante", dias: DIAS.slice(0, 5) });
  for (const { recetaId } of plan) assert.notEqual(recetaDe(recetaId).dificultad, 3, `${recetaId} es muy difícil`);
});

test("quien quiere ganar masa muscular recibe platos proteicos primero", () => {
  const p = { ...BASE, perfil: "objetivo" as const, objetivo: "musculo" as const };
  assert.ok(recetaDe(candidatas(p, 1)[0].id).etiquetas.includes("proteica"));
});

test("el mismo perfil da siempre el mismo plan", () => {
  const p = { ...BASE, antojos: ["saludable"], perfil: "objetivo" as const, objetivo: "sano" as const };
  assert.deepEqual(armarPlanLocal(p), armarPlanLocal(p));
});

// Las recetas del dataset llegan desde la base o copiadas en el plan: esReceta
// es lo único que las separa de cualquier JSON.
test("esReceta acepta las recetas fijas y rechaza las que vienen rotas", () => {
  for (const r of RECETAS) assert.ok(esReceta(r), `${r.id} debería ser válida`);
  const buena = { ...recetaDe("lomo-saltado"), id: "ds-1" };
  assert.ok(esReceta(buena));
  assert.ok(!esReceta(null));
  assert.ok(!esReceta({ ...buena, dieta: "omnivora" }));
  assert.ok(!esReceta({ ...buena, conGluten: "no" }));
  assert.ok(!esReceta({ ...buena, antojoId: "postre" }));
  assert.ok(!esReceta({ ...buena, requiere: ["soplete"] }));
  assert.ok(!esReceta({ ...buena, pasos: "Cocinar" }));
  assert.ok(!esReceta({ ...buena, ingredientes: [{ texto: "x".repeat(601) }] }));
});

// Con data/recetas_app.jsonl (lo genera exportar_recetas.py, no está en git)
// se revisa que todo lo que se va a subir tenga la forma que espera la app.
const DATASET = "data/recetas_app.jsonl";
test("las recetas exportadas del dataset tienen la forma de Receta", { skip: !existsSync(DATASET) }, () => {
  const lineas = readFileSync(DATASET, "utf8").split("\n").filter(Boolean);
  assert.ok(lineas.length > 10000, `muy pocas recetas: ${lineas.length}`);
  const ids = new Set<string>();
  for (const linea of lineas) {
    const r = JSON.parse(linea);
    assert.ok(esReceta(r), `${r.id} no tiene la forma de Receta`);
    assert.ok(r.id.startsWith("ds-") && !ids.has(r.id), `id inválido o repetido: ${r.id}`);
    ids.add(r.id);
  }
});

test("con recetas del dataset en la lista, el plan las usa y sigue respetando las restricciones", () => {
  const delDataset = RECETAS.map((r, i) => ({ ...r, id: `ds-${i}`, nombre: `${r.nombre} (dataset)` }));
  for (const restricciones of [[], ["vegano"], ["sin-gluten", "sin-lactosa"], ["pescetariano"]]) {
    const p = { ...BASE, restricciones };
    const lista = candidatas(p, 20, [...delDataset, ...RECETAS]);
    for (const { recetaId } of armarPlanLocal(p, lista)) {
      const r = lista.find((x) => x.id === recetaId)!;
      assert.ok(respetaRestricciones(r, restricciones), `${recetaId} no respeta ${restricciones.join(", ")}`);
    }
    // A igual puntaje gana la que viene primero: la del dataset.
    if (lista.length) assert.ok(lista[0].id.startsWith("ds-"));
  }
});
