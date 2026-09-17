import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { BrandButton } from "./BrandButton";
import { TOTAL_PASOS } from "../lib/catalogo";

type Props = {
  paso: number;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  onContinuar: () => void;
  etiqueta?: string;
  habilitado?: boolean;
};

const TAMANO_MASCOTA = 84;
const OFFSET_ATRAS = 24 + 12; // ancho del botón "atrás" + su margen

export function WizardScreen({
  paso,
  titulo,
  subtitulo,
  children,
  onContinuar,
  etiqueta = "Continuar",
  habilitado = true,
}: Props) {
  const avance = useRef(new Animated.Value((paso - 1) / TOTAL_PASOS)).current;

  useEffect(() => {
    Animated.timing(avance, {
      toValue: paso / TOTAL_PASOS,
      duration: 550,
      useNativeDriver: false,
    }).start();
  }, [paso]);

  // El carril de la mascota arranca donde arranca la barra (después del
  // botón "atrás") y es más angosto que la pantalla, por eso el límite
  // derecho no llega a 100%.
  const posicionMascota = avance.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "73%"],
  });

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-6 pt-2">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} hitSlop={10} className="mr-3 active:opacity-60">
            <Ionicons name="arrow-back" size={24} color="#241F21" />
          </Pressable>
          <View className="flex-1 h-1.5 bg-ink/10 rounded-full overflow-hidden">
            <Animated.View
              className="h-full bg-chili rounded-full"
              style={{
                width: avance.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }}
            />
          </View>
        </View>

        <View className="flex-row">
          <View style={{ width: OFFSET_ATRAS }} />
          <View className="flex-1" style={{ height: TAMANO_MASCOTA - 12 }}>
            <Animated.View style={{ position: "absolute", top: -6, left: posicionMascota }}>
              <Image
                source={require("../src/assets/mascots/papi_papa_checklist.png")}
                style={{ width: TAMANO_MASCOTA, height: TAMANO_MASCOTA }}
                contentFit="contain"
              />
            </Animated.View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 16 }}
      >
        <Text className="font-display text-3xl text-ink mb-2">{titulo}</Text>
        {subtitulo ? (
          <Text className="font-body text-base text-ink/70 mb-7">{subtitulo}</Text>
        ) : (
          <View className="mb-7" />
        )}
        {children}
      </ScrollView>

      <View className="px-6 pb-4 pt-2">
        <BrandButton label={etiqueta} onPress={onContinuar} disabled={!habilitado} />
      </View>
    </SafeAreaView>
  );
}
