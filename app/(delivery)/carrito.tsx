import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NEGOCIOS } from "../../lib/catalogo";
import { useCart } from "../../context/CartContext";
import { BrandButton } from "../../components/BrandButton";

export default function CarritoScreen() {
  const { negocioId, items, total, agregar, quitar } = useCart();
  const negocio = NEGOCIOS.find((n) => n.id === negocioId);

  if (!negocio || items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 items-center justify-center">
        <Text className="font-display text-xl text-ink text-center mb-2">Tu carrito está vacío</Text>
        <Text className="font-body text-ink/60 text-center mb-6">
          Explora negocios afiliados y arma tu pedido.
        </Text>
        <BrandButton label="Explorar negocios" onPress={() => router.replace("/(tabs)/explorar")} />
      </SafeAreaView>
    );
  }

  const faltaParaMinimo = Math.max(0, negocio.pedidoMinimo - total);

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
        <Text className="font-display-bold text-lg text-ink">Tu carrito</Text>
      </View>

      <Text className="font-body-semibold text-sm text-ink/60 px-6 mb-3">{negocio.nombre}</Text>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
        {items.map((item) => (
          <View
            key={item.id}
            className="flex-row items-center bg-white rounded-2xl p-4 mb-3 border border-ink/10"
          >
            <View className="flex-1">
              <Text className="font-body-extrabold text-ink text-sm mb-1">{item.nombre}</Text>
              <Text className="font-body text-xs text-ink/50">S/ {item.precio.toFixed(2)} c/u</Text>
            </View>
            <View className="flex-row items-center mr-3">
              <Pressable
                onPress={() => quitar(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar uno de ${item.nombre}`}
                className="bg-ink/10 rounded-full w-8 h-8 items-center justify-center active:opacity-70"
              >
                <Ionicons name="remove" size={18} color="#241F21" />
              </Pressable>
              <Text className="font-body-extrabold text-ink w-7 text-center">{item.cantidad}</Text>
              <Pressable
                onPress={() => agregar(negocio.id, item)}
                accessibilityRole="button"
                accessibilityLabel={`Agregar otro ${item.nombre}`}
                className="bg-chili rounded-full w-8 h-8 items-center justify-center active:opacity-80"
              >
                <Ionicons name="add" size={18} color="#FDF3E7" />
              </Pressable>
            </View>
            <Text className="font-display-bold text-chili text-sm w-16 text-right">
              S/ {(item.precio * item.cantidad).toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="px-6 pb-4 pt-2 border-t border-ink/10">
        <View className="flex-row justify-between mb-3">
          <Text className="font-body-semibold text-ink/70">Subtotal</Text>
          <Text className="font-display-bold text-ink text-lg">S/ {total.toFixed(2)}</Text>
        </View>

        {faltaParaMinimo > 0 ? (
          <View className="bg-peach/50 rounded-xl px-3 py-2 mb-3">
            <Text className="font-body-semibold text-xs text-maroon">
              Te faltan S/ {faltaParaMinimo.toFixed(2)} para el pedido mínimo de S/{" "}
              {negocio.pedidoMinimo.toFixed(2)}.
            </Text>
          </View>
        ) : null}

        <BrandButton
          label="Ir a pagar"
          disabled={faltaParaMinimo > 0}
          onPress={() => router.push("/(delivery)/checkout")}
        />
      </View>
    </SafeAreaView>
  );
}
