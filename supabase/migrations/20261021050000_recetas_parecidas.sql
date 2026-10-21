-- Ingredientes clave de cada receta ("pollo", "palta", "quinua"...) para buscar
-- recetas parecidas por lo que llevan. Los calcula exportar_recetas.py con la
-- misma regla que clavesDe() de supabase/functions/_shared/plan.ts; hay que
-- volver a correr subir_recetas.py para llenarlos.
alter table public.recetas
  add column claves text[] not null default '{}' check (cardinality(claves) <= 30);

create index recetas_claves_idx on public.recetas using gin (claves);

-- Recetas del dataset que comparten ingredientes con una receta, de la que
-- más comparte a la que menos. Recibe las claves y no el id para que también
-- sirva con las recetas fijas de la app, que no están en esta tabla. Respeta
-- lo mismo que recetas_candidatas: dieta, gluten, lactosa y electrodomésticos.
create function public.recetas_parecidas(
  claves text[],
  excluir text,
  dietas text[],
  sin_gluten boolean,
  sin_lactosa boolean,
  electrodomesticos text[],
  cuantas integer default 6
)
returns setof jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select r.datos
  from public.recetas r
  where r.claves && recetas_parecidas.claves
    and r.id <> excluir
    and r.dieta = any (dietas)
    and (not sin_gluten or not r.con_gluten)
    and (not sin_lactosa or not r.con_lactosa)
    and (cardinality(electrodomesticos) = 0 or r.requiere <@ electrodomesticos)
  order by
    cardinality(array(select unnest(r.claves) intersect select unnest(recetas_parecidas.claves))) desc,
    random()
  limit least(greatest(cuantas, 1), 20);
$$;

revoke execute on function public.recetas_parecidas from public, anon;
grant execute on function public.recetas_parecidas to authenticated;
