-- Plan semanal y pedidos de cada usuario. Antes vivían solo en el celular
-- (AsyncStorage); la app sube lo que tenga guardado ahí la primera vez.

-- Plan semanal: uno por usuario. `datos` son las respuestas del wizard tal
-- cual las maneja PlanWizardContext (distrito, días, presupuesto, antojos...),
-- así agregar un campo al wizard no exige migración.
create table public.planes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  datos jsonb not null,
  actualizado_en timestamptz not null default now()
);

alter table public.planes enable row level security;

create policy "planes: ver el propio" on public.planes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "planes: crear el propio" on public.planes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "planes: editar el propio" on public.planes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Pedidos de delivery. `items` es una copia de lo que había en el carrito
-- ({ id, nombre, precio, cantidad }), para que el historial no cambie si
-- después cambia el catálogo.
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  negocio_id text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  propina numeric(10, 2) not null default 0 check (propina >= 0),
  total numeric(10, 2) not null check (total >= 0),
  metodo_pago text not null,
  direccion text not null check (length(trim(direccion)) > 0),
  nota text not null default '',
  estado text not null default 'confirmado'
    check (estado in ('confirmado', 'preparando', 'en-camino', 'entregado')),
  calificacion smallint check (calificacion between 1 and 5),
  comentario text not null default '',
  creado_en timestamptz not null default now()
);

create index pedidos_user_id_creado_en_idx on public.pedidos (user_id, creado_en desc);

alter table public.pedidos enable row level security;

create policy "pedidos: ver los propios" on public.pedidos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "pedidos: crear los propios" on public.pedidos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "pedidos: actualizar los propios" on public.pedidos
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Un pedido ya hecho solo cambia de estado o recibe calificación: el usuario
-- no puede reescribir montos, productos ni dirección. Sin política de delete,
-- tampoco puede borrarlo.
revoke update on public.pedidos from authenticated;
grant update (estado, calificacion, comentario) on public.pedidos to authenticated;
