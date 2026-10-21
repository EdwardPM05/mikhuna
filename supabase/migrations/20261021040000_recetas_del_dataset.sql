-- Recetas del dataset de Edward (~18 mil, ver docs/DATASET.md). Se cargan con
-- scripts/dataset/subir_recetas.py; la Edge Function generar-plan elige de aquí
-- las candidatas que ve Gemini.
--
-- `datos` es la receta completa con la forma de `Receta`
-- (supabase/functions/_shared/recetas.ts), que es lo que usan la función y la
-- app. Las demás columnas son copias de los campos por los que se filtra, para
-- no tener que abrir el JSON en cada consulta.
create table public.recetas (
  id text primary key check (id like 'ds-%'),
  nombre text not null,
  cocina text not null check (cocina in ('peruana', 'internacional')),
  region text check (region in ('costa', 'sierra', 'selva')),
  dieta text not null check (dieta in ('carne', 'pescado', 'vegetariana', 'vegana')),
  con_gluten boolean not null,
  con_lactosa boolean not null,
  requiere text[] not null default '{}',
  dificultad smallint not null check (dificultad between 1 and 3),
  tiempo_min smallint not null check (tiempo_min > 0),
  precio smallint not null check (precio >= 0),
  etiquetas text[] not null check (cardinality(etiquetas) > 0),
  datos jsonb not null check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 8000)
);

create index recetas_dieta_idx on public.recetas (dieta, con_gluten, con_lactosa);

-- Solo lectura para usuarios con sesión: el contenido viene de sitios de
-- recetas y no se publica abierto (ver la nota de licencia en docs/DATASET.md).
-- Nadie la escribe desde la app; la carga usa la service role.
alter table public.recetas enable row level security;

create policy "recetas: leer con sesión" on public.recetas
  for select to authenticated using (true);

-- Las candidatas para el plan de una persona. Lo que no se negocia es filtro
-- (dieta, gluten, lactosa, electrodomésticos); lo demás solo ordena, con algo
-- de azar para que dos semanas seguidas no salgan iguales. La función
-- generar-plan vuelve a revisar cada receta con las reglas de _shared/plan.ts.
create function public.recetas_candidatas(
  dietas text[],
  sin_gluten boolean,
  sin_lactosa boolean,
  electrodomesticos text[],
  antojos text[],
  region text,
  max_dificultad smallint,
  max_precio numeric,
  cuantas integer default 60
)
returns setof jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select r.datos
  from public.recetas r
  where r.dieta = any (dietas)
    and (not sin_gluten or not r.con_gluten)
    and (not sin_lactosa or not r.con_lactosa)
    and (cardinality(electrodomesticos) = 0 or r.requiere <@ electrodomesticos)
    and r.dificultad <= max_dificultad
  order by
    (case when r.etiquetas && antojos then 3 else 0 end)
    + (case when region is not null and r.region = region then 5 else 0 end)
    + (case when r.cocina = 'peruana' then 1 else 0 end)
    - (case when max_precio > 0 and r.precio > max_precio then 3 else 0 end)
    + random() * 4 desc
  limit least(greatest(cuantas, 1), 100);
$$;

revoke execute on function public.recetas_candidatas from public, anon;
grant execute on function public.recetas_candidatas to authenticated;
