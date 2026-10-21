import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../../components/SafeAreaView";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NEGOCIOS, PRODUCTOS } from "../../../lib/catalogo";
import { useCart } from "../../../context/CartContext";
import { BrandButton } from "../../../components/BrandButton";

export default function NegocioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const negocio = NEGOCIOS.find((n) => n.id === id);
  const productos = useMemo(() => PRODUCTOS.filter((p) => p.negocioId === id), [id]);
  const { agregar, quitar, cantidadDe, cantidadTotal, total, negocioId } = useCart();
  const [aviso, setAviso] = useState<string | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerAviso.current) clearTimeout(timerAviso.current);
  }, []);

  if (!negocio) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center px-6">
        <Text className="font-body text-ink/60">Negocio no encontrado.</Text>
      </SafeAreaView>
    );
  }

  function handleAgregar(producto: { id: string; nombre: string; precio: number }) {
    const { reemplazado } = agregar(negocio!.id, producto);
    if (reemplazado) {
      setAviso("Tu carrito era de otro negocio — se vació y empezó de nuevo con este.");
      // Un aviso nuevo reinicia la cuenta; al salir de la pantalla se cancela.
      if (timerAviso.current) clearTimeout(timerAviso.current);
      timerAviso.current = setTimeout(() => setAviso(null), 3500);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center px-6 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="mr-3 active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Atrás"
        >
          <Ionicons name="arrow-back" size={24} color="#241F21" />
        </Pressable>
        <View
          className="w-11 h-11 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: negocio.color }}
        >
          <Text className="font-display-bold text-cream text-sm">{negocio.inicial}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-body-extrabold text-ink text-base">{negocio.nombre}</Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={11} color="#F7941D" />
            <Text className="font-body text-xs text-ink/60 ml-1 mr-2">{negocio.calificacion}</Text>
            <Text className="font-body text-xs text-ink/60">
              {negocio.tiempoEntregaMin} min · mín. S/ {negocio.pedidoMinimo}
            </Text>
          </View>
        </View>
      </View>

      {aviso && (
        <View className="mx-6 mb-3 bg-peach/60 rounded-xl px-3 py-2">
          <Text className="font-body-semibold text-xs text-maroon">{aviso}</Text>
        </View>
      )}

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
        {productos.map((producto) => {
          const cantidad = cantidadDe(producto.id);
          return (
            <View
              key={producto.id}
              className="flex-row items-center bg-white rounded-2xl p-4 mb-3 border border-ink/10"
            >
              <View className="w-14 h-14 rounded-xl bg-peach mr-3" />
              <View className="flex-1">
                <Text className="font-body-extrabold text-ink text-sm mb-1">{producto.nombre}</Text>
                <Text className="font-display-bold text-chili text-base">
                  S/ {producto.precio.toFixed(2)}
                </Text>
              </View>

              {cantidad === 0 ? (
                <Pressable
                  onPress={() => handleAgregar(producto)}
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar ${producto.nombre}`}
                  className="bg-chili rounded-full w-9 h-9 items-center justify-center active:opacity-80"
                >
                  <Ionicons name="add" size={20} color="#FDF3E7" />
                </Pressable>
              ) : (
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => quitar(producto.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar uno de ${producto.nombre}`}
                    className="bg-ink/10 rounded-full w-8 h-8 items-center justify-center active:opacity-70"
                  >
                    <Ionicons name="remove" size={18} color="#241F21" />
                  </Pressable>
                  <Text className="font-body-extrabold text-ink w-7 text-center">{cantidad}</Text>
                  <Pressable
                    onPress={() => handleAgregar(producto)}
                    accessibilityRole="button"
                    accessibilityLabel={`Agregar otro ${producto.nombre}`}
                    className="bg-chili rounded-full w-8 h-8 items-center justify-center active:opacity-80"
                  >
                    <Ionicons name="add" size={18} color="#FDF3E7" />
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {cantidadTotal > 0 && negocioId === negocio.id && (
        <View className="px-6 pb-4 pt-2">
          <BrandButton
            label={`Ver carrito · S/ ${total.toFixed(2)} (${cantidadTotal})`}
            onPress={() => router.push("/(delivery)/carrito")}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
