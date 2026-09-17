import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandButton } from "../../components/BrandButton";

type Estado = "confirmado" | "preparando" | "en-camino" | "entregado";

const ESTADOS: { id: Estado; titulo: string; frase: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: "confirmado", titulo: "Confirmado", frase: "El negocio recibió tu pedido.", icono: "checkmark-circle-outline" },
  { id: "preparando", titulo: "Preparando", frase: "Están alistando tu pedido.", icono: "restaurant-outline" },
  { id: "en-camino", titulo: "En camino", frase: "¡Voy en camino! 🐹💨", icono: "bicycle-outline" },
  { id: "entregado", titulo: "Entregado", frase: "Tu pedido llegó. ¡Buen provecho!", icono: "home-outline" },
];

const DURACION_MS = 2600;

export default function SeguimientoScreen() {
  const [paso, setPaso] = useState(0);
  const avance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paso >= ESTADOS.length - 1) return;
    const t = setTimeout(() => setPaso((p) => p + 1), DURACION_MS);
    return () => clearTimeout(t);
  }, [paso]);

  useEffect(() => {
    const enCaminoIndex = ESTADOS.findIndex((e) => e.id === "en-camino");
    const entregadoIndex = ESTADOS.length - 1;
    let destino = 0;
    if (paso >= entregadoIndex) destino = 100;
    else if (paso >= enCaminoIndex) destino = 55;
    else destino = 6;

    Animated.timing(avance, {
      toValue: destino,
      duration: DURACION_MS - 200,
      useNativeDriver: false,
    }).start();
  }, [paso]);

  const estado = ESTADOS[paso];
  const entregado = estado.id === "entregado";

  return (
    <SafeAreaView className="flex-1 bg-cream px-6 pt-4">
      <Text className="font-display text-2xl text-ink mb-1">Seguimiento de tu pedido</Text>
      <Text className="font-body text-sm text-ink/60 mb-5">Bodega Don José</Text>

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

      <View className="flex-row justify-between mb-8">
        {ESTADOS.map((e, i) => {
          const hecho = i <= paso;
          return (
            <View key={e.id} className="items-center flex-1">
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
                {e.titulo}
              </Text>
            </View>
          );
        })}
      </View>

      {entregado && (
        <BrandButton label="Calificar pedido" onPress={() => router.replace("/(delivery)/calificar")} />
      )}
    </SafeAreaView>
  );
}
