import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandButton } from "../../components/BrandButton";
import { NEGOCIOS } from "../../lib/catalogo";
import { ORDEN_ESTADOS, useOrders, type EstadoPedido } from "../../context/OrdersContext";

const ESTADOS: Record<EstadoPedido, { titulo: string; frase: string; icono: keyof typeof Ionicons.glyphMap }> = {
  confirmado: { titulo: "Confirmado", frase: "El negocio recibió tu pedido.", icono: "checkmark-circle-outline" },
  preparando: { titulo: "Preparando", frase: "Están alistando tu pedido.", icono: "restaurant-outline" },
  "en-camino": { titulo: "En camino", frase: "¡Voy en camino! 🐹💨", icono: "bicycle-outline" },
  entregado: { titulo: "Entregado", frase: "Tu pedido llegó. ¡Buen provecho!", icono: "home-outline" },
};

const DURACION_MS = 2600;

// Dónde va el cuy (0–100) en cada estado.
function destinoDe(paso: number) {
  if (paso >= ORDEN_ESTADOS.indexOf("entregado")) return 100;
  if (paso >= ORDEN_ESTADOS.indexOf("en-camino")) return 55;
  return 6;
}

export default function SeguimientoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { pedidos, pedidoPorId, avanzar, cargando } = useOrders();
  // Sin id (por ejemplo, un enlace viejo) se muestra el pedido más reciente.
  const pedido = pedidoPorId(id) ?? (id ? undefined : pedidos[0]);
  const paso = pedido ? ORDEN_ESTADOS.indexOf(pedido.estado) : 0;
  const avance = useRef(new Animated.Value(destinoDe(paso))).current;

  // La simulación avanza el estado guardado del pedido: si el usuario sale y
  // vuelve, sigue desde donde estaba.
  useEffect(() => {
    if (!pedido || paso >= ORDEN_ESTADOS.length - 1) return;
    const t = setTimeout(() => avanzar(pedido.id, ORDEN_ESTADOS[paso + 1]), DURACION_MS);
    return () => clearTimeout(t);
  }, [pedido?.id, paso]);

  useEffect(() => {
    Animated.timing(avance, {
      toValue: destinoDe(paso),
      duration: DURACION_MS - 200,
      useNativeDriver: false,
    }).start();
  }, [paso]);

  if (!pedido && cargando) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator color="#E5131B" />
      </SafeAreaView>
    );
  }

  if (!pedido) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 items-center justify-center">
        <Text className="font-display text-xl text-ink text-center mb-2">No encontramos ese pedido</Text>
        <Text className="font-body text-ink/60 text-center mb-6">Revisa tu historial en la pestaña Pedidos.</Text>
        <BrandButton label="Ver mis pedidos" onPress={() => router.replace("/(tabs)/pedidos")} />
      </SafeAreaView>
    );
  }

  const negocio = NEGOCIOS.find((n) => n.id === pedido.negocioId);
  const estado = ESTADOS[pedido.estado];
  const entregado = pedido.estado === "entregado";
  const cantidad = pedido.items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="flex-row items-start mb-5">
          <View className="flex-1">
            <Text className="font-display text-2xl text-ink mb-1">Seguimiento de tu pedido</Text>
            <Text className="font-body text-sm text-ink/60">{negocio?.nombre ?? "Tu negocio"}</Text>
          </View>
          <Pressable
            onPress={() => router.replace("/(tabs)/pedidos")}
            hitSlop={10}
            accessibilityLabel="Cerrar seguimiento"
            className="w-9 h-9 rounded-full bg-white border border-ink/10 items-center justify-center active:opacity-60"
          >
            <Ionicons name="close" size={20} color="#241F21" />
          </Pressable>
        </View>

        <View className="bg-peach/50 rounded-3xl h-56 mb-6 overflow-hidden justify-center">
          <View className="h-1 bg-white/70 mx-6 rounded-full" />
          <Animated.View
            style={{
              position: "absolute",
              top: "50%",
              marginTop: -28,
              left: avance.interpolate({ inputRange: [0, 100], outputRange: ["4%", "84%"] }),
            }}
          >
            <Image
              source={require("../../src/assets/mascots/cuy_delivery.png")}
              style={{ width: 56, height: 64 }}
              contentFit="contain"
            />
          </Animated.View>
        </View>

        <View className="bg-white rounded-3xl p-5 mb-6 border border-ink/10">
          <View className="flex-row items-center mb-1">
            <Ionicons name={estado.icono} size={22} color="#E5131B" />
            <Text className="font-display-bold text-lg text-ink ml-2">{estado.titulo}</Text>
          </View>
          <Text className="font-body text-sm text-ink/60">{estado.frase}</Text>
        </View>

        <View className="flex-row justify-between mb-6">
          {ORDEN_ESTADOS.map((e, i) => {
            const hecho = i <= paso;
            return (
              <View key={e} className="items-center flex-1">
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center mb-1.5 ${
                    hecho ? "bg-chili" : "bg-ink/10"
                  }`}
                >
                  {hecho && <Ionicons name="checkmark" size={16} color="#FDF3E7" />}
                </View>
                <Text
                  className={`font-body-semibold text-[10px] text-center ${
                    hecho ? "text-ink" : "text-ink/40"
                  }`}
                >
                  {ESTADOS[e].titulo}
                </Text>
              </View>
            );
          })}
        </View>

        <View className="bg-white rounded-3xl p-5 border border-ink/10">
          <Text className="font-body-extrabold text-[11px] text-ink/45 mb-3" style={{ letterSpacing: 0.3 }}>
            TU PEDIDO
          </Text>
          {pedido.items.map((item) => (
            <View key={item.id} className="flex-row justify-between mb-1.5">
              <Text className="font-body text-sm text-ink flex-1 mr-2" numberOfLines={1}>
                {item.cantidad} × {item.nombre}
              </Text>
              <Text className="font-body-semibold text-sm text-ink/70">
                S/ {(item.precio * item.cantidad).toFixed(2)}
              </Text>
            </View>
          ))}
          <View className="h-px bg-ink/10 my-3" />
          <View className="flex-row items-center mb-1.5">
            <Ionicons name="location-outline" size={14} color="rgba(36,31,33,0.5)" />
            <Text className="font-body text-xs text-ink/60 ml-1.5 flex-1" numberOfLines={1}>
              {pedido.direccion}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-body text-xs text-ink/60">
              {cantidad} {cantidad === 1 ? "producto" : "productos"} · {pedido.metodoPago}
            </Text>
            <Text className="font-display-bold text-base text-chili">S/ {pedido.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {entregado && (
        <View className="px-6 pb-4 pt-2">
          <BrandButton
            label="Calificar pedido"
            onPress={() => router.replace({ pathname: "/(delivery)/calificar", params: { id: pedido.id } })}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
