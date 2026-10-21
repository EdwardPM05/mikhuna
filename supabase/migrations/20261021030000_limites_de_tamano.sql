-- Topes de tamaño para lo que escribe el cliente. RLS ya impide tocar filas
-- ajenas, pero cada usuario podía guardar textos o JSON de cualquier tamaño
-- en las suyas y llenar la base. Los límites quedan muy por encima de lo que
-- la app manda de verdad (una dirección, una nota, un carrito de decenas de
-- productos, las respuestas del wizard).

alter table public.pedidos
  add constraint pedidos_negocio_id_largo check (length(negocio_id) <= 64),
  add constraint pedidos_direccion_largo check (length(direccion) <= 300),
  add constraint pedidos_nota_largo check (length(nota) <= 500),
  add constraint pedidos_comentario_largo check (length(comentario) <= 500),
  add constraint pedidos_metodo_pago_largo check (length(metodo_pago) <= 40),
  add constraint pedidos_items_tamano check (pg_column_size(items) <= 20000);

alter table public.planes
  add constraint planes_datos_tamano check (
    jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 50000
  );
